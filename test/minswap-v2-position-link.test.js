import test from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeCardanoValueCbor,
  linkMinswapV2WalletPositions,
  MINSWAP_V2_MAINNET_USDM_PROFILE,
} from '../wallet-companion/minswap-v2-position-link.js'

const LP_POLICY = 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c'
const LP_NAME = '10ae5aabdad4fec6e5d061eafb681ae0989ee0ecc60224a3a638c228d9885907'
const USDM_POLICY = 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad'
const USDM_NAME = '0014df105553444d'
const SECOND_POLICY = 'f6099832f9563e4cf59602b3351c3c5a8a7dda2d44575ef69b82cf8d'
const POOL_ADDRESS = MINSWAP_V2_MAINNET_USDM_PROFILE.poolValidatorAddress
const OBSERVED_AT = '2026-11-03T22:00:00.000Z'
const TX_HASH = '483c84771b14c9c80eea13a0b2606b2e4a50224fc90b891943a1a77448c0817e'
const BLOCK_HASH = '3e2d6f8b02dd6529b76e36b4dd15cd449ae046e12bebdc063dd48306711028c4'
const DATUM_HASH = 'fc7f41a299efdeaf042cfa68f99a7d4f5c2caa82b3900be4de923affe337343b'
const RESPONSE_SHA = 'c8614fcdbadc105069c067a68dc1610bdba46b1ae72b5d03feeaaffcf57237c1'
const POOL_LP_REMAINING_CAPACITY = '9223372036854775807'

function encodeHead(major, value) {
  if (value < 24) return (major * 32 + value).toString(16).padStart(2, '0')
  if (value <= 255) return (major * 32 + 24).toString(16).padStart(2, '0') + value.toString(16).padStart(2, '0')
  if (value <= 65535) return (major * 32 + 25).toString(16).padStart(2, '0') + value.toString(16).padStart(4, '0')
  return (major * 32 + 26).toString(16).padStart(2, '0') + value.toString(16).padStart(8, '0')
}

function encodeBytes(hex) {
  return encodeHead(2, hex.length / 2) + hex
}

function encodePositiveInteger(value) {
  const number = BigInt(value)
  if (number < 24n) return Number(number).toString(16).padStart(2, '0')
  if (number <= 255n) return '18' + number.toString(16).padStart(2, '0')
  if (number <= 65535n) return '19' + number.toString(16).padStart(4, '0')
  if (number <= 0xffffffffn) return '1a' + number.toString(16).padStart(8, '0')
  return '1b' + number.toString(16).padStart(16, '0')
}

function encodeValue({ lovelace = 10_000_000, assets = [] } = {}) {
  const policies = new Map()
  for (const asset of assets) {
    if (!policies.has(asset.policyId)) policies.set(asset.policyId, [])
    policies.get(asset.policyId).push(asset)
  }
  if (assets.length === 0) return encodePositiveInteger(lovelace)

  let multiasset = encodeHead(5, policies.size)
  for (const [policyId, rows] of policies) {
    multiasset += encodeBytes(policyId)
    multiasset += encodeHead(5, rows.length)
    for (const row of rows) {
      multiasset += encodeBytes(row.assetNameHex)
      multiasset += encodePositiveInteger(row.quantityRaw)
    }
  }
  return encodeHead(4, 2) + encodePositiveInteger(lovelace) + multiasset
}

function walletSnapshot({ networkId = 1, assets = [], utxos = ['82aabb'], observedAt = OBSERVED_AT } = {}) {
  return {
    schemaVersion: 'arb.cardano.wallet-read.v1',
    evidenceClass: 'SOURCE_ASSERTION_UNVERIFIED',
    observedAt,
    provider: { walletName: 'nami', displayName: 'Nami', apiVersion: '1', bridge: 'CIP-30' },
    accountContext: {
      network: {
        networkId,
        networkKind: networkId === 1 ? 'MAINNET' : 'TESTNET',
        exactEnvironment: networkId === 1 ? 'MAINNET' : null,
        environmentResolution: networkId === 1 ? 'CIP30_NETWORK_ID' : 'UNRESOLVED_TESTNET_VARIANT',
      },
      changeAddressCborHex: '01aabb',
      fingerprintMethod: 'NETWORK_ID_AND_CHANGE_ADDRESS_BYTES',
      fingerprintStability: 'CHECKED_BEFORE_AND_AFTER_READ',
    },
    walletData: {
      balanceCborHex: encodeValue({ assets }),
      utxoCborHex: utxos,
    },
    coverage: {
      walletControlledUtxos: {
        status: utxos.length === 0 ? 'EXHAUSTIVE_RESPONSE_EMPTY' : 'EXHAUSTIVE_RESPONSE_NONEMPTY',
        query: 'CIP30_GET_UTXOS_WITHOUT_AMOUNT_OR_PAGINATION',
        scope: 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET',
        pagination: 'NOT_USED',
        atomicity: 'NOT_GUARANTEED',
        returnedCount: utxos.length,
      },
    },
    consistency: 'NON_ATOMIC_CROSS_METHOD_OBSERVATION',
    integrity: 'RAW_CBOR_PRESERVED_NOT_RECOMPUTED_OR_VERIFIED',
    authority: {
      principalBinding: 'NOT_ESTABLISHED',
      accountOwnership: 'NOT_ESTABLISHED',
      financialMandate: 'NOT_ESTABLISHED',
      riskBudget: 'NOT_DERIVED',
      protectedCapital: 'NOT_DERIVED',
      economicAdmission: 'NOT_PERFORMED',
    },
  }
}

function qualifiedPoolCandidate(overrides = {}) {
  const assetRows = [
    { policyId: USDM_POLICY, assetNameHex: USDM_NAME, quantityRaw: '7' },
    { policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: POOL_LP_REMAINING_CAPACITY },
    { policyId: LP_POLICY, assetNameHex: '4d5350', quantityRaw: '1' },
    { policyId: SECOND_POLICY, assetNameHex: '', quantityRaw: '16' },
  ]
  return {
    utxoRef: TX_HASH + '#1',
    address: POOL_ADDRESS,
    valueLovelaceRaw: '4500000',
    assets: assetRows,
    exactUsdmQuantityRaw: '7',
    poolAuthNftQuantityRaw: '1',
    poolAuthNftValidated: true,
    datumValidation: {
      status: 'MATCH',
      reasons: [],
      datum: {
        poolBatchingStakeScriptHash: '1eae96baf29e27682ea3f815aba361a0c6059d45e4bfbe95bbd2f44a',
        assetA: { policyId: USDM_POLICY, assetNameHex: USDM_NAME },
        assetB: { policyId: SECOND_POLICY, assetNameHex: '' },
        totalLiquidityRaw: '10',
        reserveARaw: '7',
        reserveBRaw: '16',
        baseFeeANumeratorRaw: '30',
        baseFeeBNumeratorRaw: '30',
        feeSharingNumeratorRaw: '1666',
        allowDynamicFee: false,
      },
      lpAsset: { policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: POOL_LP_REMAINING_CAPACITY },
      valueReserveARaw: '7',
      valueReserveBRaw: '16',
      valueSurplusARaw: '0',
      valueSurplusBRaw: '0',
      poolAuthNftQuantityRaw: '1',
    },
    datumHash: DATUM_HASH,
    inlineDatumCborHex: 'd8799fd8799fd87a9f581c1eae96baf29e27682ea3f815aba361a0c6059d45e4bfbe95bbd2f44affffd8799f581cc48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad480014df105553444dffd8799f190682ffd87980ff',
    inlineDatumJson: null,
    transactionContext: {
      txHash: TX_HASH,
      blockHash: BLOCK_HASH,
      blockHeight: 10589026,
      epochNo: 497,
      absoluteSlot: 129744241,
      blockTime: 1721310532,
    },
    qualification: 'POOL_IDENTITY_AND_RESERVE_STRUCTURE_MATCH_NOT_ORACLE_QUALIFICATION',
    ...overrides,
  }
}

function poolObservation({ candidates, complete = true } = {}) {
  const candidateRows = candidates ?? [qualifiedPoolCandidate()]
  return {
    schema: 'immortal-minswap-v2-usdm-utxo-observation-v2',
    classification: 'READ_ONLY_UTXO_AND_V2_POOL_DATUM_RECONCILIATION_NOT_ORACLE_QUALIFICATION',
    network: 'cardano-mainnet',
    startedAt: '2026-10-31T12:59:00.000Z',
    completedAt: '2026-10-31T12:59:20.000Z',
    provider: { name: 'Koios', baseUrl: 'https://api.koios.rest/api/v1' },
    target: {
      protocol: 'MinswapV2',
      poolValidatorAddress: POOL_ADDRESS,
      expectedPoolScriptHash: 'ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b',
      expectedPoolAddressStakeKeyHash: '52563c5410bff6a0d43ccebb7c37e1f69f5eb260552521adff33b9c2',
      expectedPoolBatchingStakeScriptHash: '1eae96baf29e27682ea3f815aba361a0c6059d45e4bfbe95bbd2f44a',
      expectedPoolAuthenticationNft: { policyId: LP_POLICY, assetNameHex: '4d5350' },
      exactAsset: { policyId: USDM_POLICY, assetNameHex: USDM_NAME, decimals: 6 },
    },
    acquisition: {
      endpoint: '/asset_utxos',
      exactAssetFilter: { policyId: USDM_POLICY, assetNameHex: USDM_NAME },
      addressFilter: POOL_ADDRESS,
      extended: true,
      requestEvidence: [{
        url: 'https://api.koios.rest/api/v1/asset_utxos',
        method: 'POST',
        status: 200,
        responseDate: 'Sat, 31 Oct 2026 12:59:20 GMT',
        bodySha256: RESPONSE_SHA,
      }],
      returnedUtxoCount: candidateRows.length,
      validatorIdentityCheck: {
        expectedPaymentCredential: 'ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b',
        validatedRows: candidateRows.length,
        invalidRows: 0,
      },
      pagination: {
        pageSize: 1000,
        maxPages: 20,
        pages: [{ page: 0, offset: 0, returnedCount: candidateRows.length, response: {} }],
        complete,
      },
      exactUsdmCandidateCount: candidateRows.length,
      transactionLookups: candidateRows.length,
      transactionContextResponses: {},
    },
    candidates: candidateRows,
    limitations: ['Synthetic test wrapper based on the pinned IMMORTAL observer contract; not a live observation.'],
  }
}

test('decodes the ADA-only CIP-30 Value form', () => {
  const result = decodeCardanoValueCbor(encodeValue({ lovelace: 12_345_678 }))
  assert.equal(result.lovelaceRaw, '12345678')
  assert.deepEqual(result.assets, [])
})

test('decodes exact multiasset units and preserves quantities above the JavaScript safe integer range', () => {
  const result = decodeCardanoValueCbor(encodeValue({
    assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '9223372036854775807' }],
  }))
  assert.equal(result.assets.length, 1)
  assert.equal(result.assets[0].unit, LP_POLICY + LP_NAME)
  assert.equal(result.assets[0].quantityRaw, '9223372036854775807')
})

test('rejects duplicate policy IDs and duplicate exact asset units in CBOR maps', () => {
  const duplicatePolicies = '82' + '1a00989680' + 'a2' +
    encodeBytes(LP_POLICY) + 'a0' +
    encodeBytes(LP_POLICY) + 'a0'
  assert.throws(() => decodeCardanoValueCbor(duplicatePolicies), (error) => error.code === 'CARDANO_POLICY_ID_DUPLICATED')

  const duplicateUnits = '82' + '1a00989680' + 'a1' +
    encodeBytes(LP_POLICY) + 'a2' +
    encodeBytes(LP_NAME) + '01' +
    encodeBytes(LP_NAME) + '02'
  assert.throws(() => decodeCardanoValueCbor(duplicateUnits), (error) => error.code === 'CARDANO_ASSET_UNIT_DUPLICATED')
})

test('rejects unsupported CBOR shapes, indefinite arrays and trailing bytes', () => {
  assert.throws(() => decodeCardanoValueCbor('9f0102ff'), (error) => error.code === 'CBOR_INDEFINITE_OR_RESERVED_LENGTH_UNSUPPORTED')
  assert.throws(() => decodeCardanoValueCbor('80'), (error) => error.code === 'CARDANO_VALUE_SHAPE_UNSUPPORTED')
  assert.throws(() => decodeCardanoValueCbor('0100'), (error) => error.code === 'CARDANO_VALUE_CBOR_TRAILING_BYTES')
})

test('links an exact wallet LP asset to one qualified IMMORTAL Minswap V2 pool candidate', () => {
  const wallet = walletSnapshot({
    assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '123456' }],
  })
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: wallet,
    poolObservation: poolObservation(),
  })

  assert.equal(result.status, 'LP_ASSET_LINKED_TO_OBSERVED_POOL')
  assert.equal(result.matchedPositions.length, 1)
  const link = result.matchedPositions[0]
  assert.equal(link.lpAsset.unit, LP_POLICY + LP_NAME)
  assert.equal(link.walletBalance.quantityRaw, '123456')
  assert.equal(link.poolIdentity.utxoRef, TX_HASH + '#1')
  assert.equal(link.classification, 'WALLET_BALANCE_ASSERTION_MATCHES_POOL_SPECIFIC_LP_ASSET')
  assert.equal(link.ownership.beneficialOwnership, 'NOT_ESTABLISHED')
  assert.equal(link.economics.poolShare, 'NOT_COMPUTED')
  assert.equal(link.economics.marketValue, 'NOT_VALUED')
  assert.equal(link.poolIdentity.sourceCurrentness, 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING')
  const expectedAge = Date.parse('2026-10-31T12:59:20.000Z') - (1721310532 * 1000)
  assert.equal(link.poolIdentity.poolUtxoLastUpdateAgeMsAtObserverCompletion, String(expectedAge))
  assert.equal(link.poolIdentity.datumAssetB.unit, SECOND_POLICY)
  assert.equal(link.poolIdentity.transactionContext.blockHeight, 10589026)
})

test('Mainnet Minswap profile rejects a testnet CIP-30 wallet', () => {
  assert.throws(() => linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ networkId: 0, assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '1' }] }),
    poolObservation: poolObservation(),
  }), (error) => error.code === 'WALLET_NETWORK_NOT_MAINNET')
})

test('wrong exact USDM asset or observer scope is rejected before linking', () => {
  const observation = poolObservation()
  observation.target.exactAsset.assetNameHex = '00'
  assert.throws(() => linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '1' }] }),
    poolObservation: observation,
  }), (error) => error.code === 'MIN_SWAP_OBSERVER_TARGET_MISMATCH')
})

test('incomplete Minswap pagination is not promoted to a pool set', () => {
  assert.throws(() => linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '1' }] }),
    poolObservation: poolObservation({ complete: false }),
  }), (error) => error.code === 'MIN_SWAP_OBSERVATION_INCOMPLETE')
})

test('two structurally qualified UTxOs with the same exact LP identity are ambiguous', () => {
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '1' }] }),
    poolObservation: poolObservation({ candidates: [qualifiedPoolCandidate(), qualifiedPoolCandidate()] }),
  })
  assert.equal(result.status, 'AMBIGUOUS_POOL_IDENTITY')
  assert.deepEqual(result.matchedPositions, [])
  assert.deepEqual(result.ambiguousLpUnits, [LP_POLICY + LP_NAME])
})

test('wallet LP token with no matching observed pool remains unmatched, not zero exposure', () => {
  const otherLpName = '11'.repeat(32)
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: otherLpName, quantityRaw: '12' }] }),
    poolObservation: poolObservation(),
  })
  assert.equal(result.status, 'WALLET_LP_ASSET_WITHOUT_QUALIFIED_OBSERVED_POOL')
  assert.equal(result.unmatchedWalletLpAssets[0].quantityRaw, '12')
  assert.equal(result.unmatchedWalletLpAssets[0].reason, 'NO_UNIQUE_QUALIFIED_POOL_IN_EXACT_USDM_OBSERVATION_SET')
})

test('an empty wallet balance means no matching asset in this observed set, not no DeFi positions', () => {
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [] }),
    poolObservation: poolObservation(),
  })
  assert.equal(result.status, 'NO_MATCHING_WALLET_LP_ASSET_IN_OBSERVED_USDM_POOL_SET')
  assert.deepEqual(result.matchedPositions, [])
  assert.ok(result.limitations.length > 0)
})

test('a positive wallet LP balance with an exhaustive empty UTxO response is conflicted', () => {
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({
      assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '12' }],
      utxos: [],
    }),
    poolObservation: poolObservation(),
  })
  assert.equal(result.status, 'CONFLICTED_WALLET_BALANCE_VS_EMPTY_UTXO_RESPONSE')
  assert.deepEqual(result.matchedPositions, [])
})

test('a malformed or unsupported pool candidate is rejected rather than linked', () => {
  const candidate = qualifiedPoolCandidate()
  candidate.datumValidation.lpAsset.assetNameHex = '00'
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, quantityRaw: '1' }] }),
    poolObservation: poolObservation({ candidates: [candidate] }),
  })
  assert.equal(result.status, 'WALLET_LP_ASSET_WITHOUT_QUALIFIED_OBSERVED_POOL')
  assert.equal(result.rejectedPoolCandidates.length, 1)
  assert.equal(result.rejectedPoolCandidates[0].reason, 'POOL_ASSET_IDENTITY_INVALID')
})

test('a wallet LP token with a different asset name is not matched by policy alone', () => {
  const result = linkMinswapV2WalletPositions({
    walletSnapshot: walletSnapshot({ assets: [{ policyId: LP_POLICY, assetNameHex: '33'.repeat(32), quantityRaw: '99' }] }),
    poolObservation: poolObservation(),
  })
  assert.equal(result.matchedPositions.length, 0)
  assert.equal(result.unmatchedWalletLpAssets.length, 1)
})

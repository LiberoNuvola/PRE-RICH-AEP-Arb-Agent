import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mapArbObservationToImmortalExp,
  IMMORTAL_EXP_CONSUMER_MAP_V0_1,
} from '../wallet-companion/immortal-exp-consumer-map.js'

const LP_POLICY = 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c'
const LP_NAME = '10ae5aabdad4fec6e5d061eafb681ae0989ee0ecc60224a3a638c228d9885907'
const USDM_POLICY = 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad'
const USDM_NAME = '0014df105553444d'
const SECOND_POLICY = 'f6099832f9563e4cf59602b3351c3c5a8a7dda2d44575ef69b82cf8d'
const OBSERVED_AT = '2026-11-03T22:00:00.000Z'
const TX_HASH = '483c84771b14c9c80eea13a0b2606b2e4a50224fc90b891943a1a77448c0817e'
const BLOCK_HASH = '3e2d6f8b02dd6529b76e36b4dd15cd449ae046e12bebdc063dd48306711028c'
const DATUM_HASH = 'fc7f41a299efdeaf042cfa68f99a7d4f5c2caa82b3900be4de923affe337343b'
const RESPONSE_SHA = 'c8614fcdbadc105069c067a68dc1610bdba46b1ae72b5d03feeaaffcf57237c1'

function validW2(overrides = {}) {
  const link = {
    lpAsset: { policyId: LP_POLICY, assetNameHex: LP_NAME, unit: LP_POLICY + LP_NAME },
    walletBalance: {
      quantityRaw: '123456',
      unit: LP_POLICY + LP_NAME,
      source: 'CIP30_GETBALANCE',
      sourceAssertion: 'WALLET_API_REPORTED_AGGREGATE_BALANCE',
    },
    poolIdentity: {
      protocol: 'MinswapV2',
      network: 'cardano-mainnet',
      datumAssetA: { policyId: USDM_POLICY, assetNameHex: USDM_NAME, unit: USDM_POLICY + USDM_NAME },
      datumAssetB: { policyId: SECOND_POLICY, assetNameHex: '', unit: SECOND_POLICY },
      utxoRef: TX_HASH + '#1',
      datumHash: DATUM_HASH,
      inlineDatumCborHex: 'd8799f01ff',
      transactionContext: {
        txHash: TX_HASH,
        blockHash: BLOCK_HASH,
        blockHeight: 10589026,
        absoluteSlot: 129744241,
        blockTime: 1721310532,
      },
      sourceObserverCompletedAt: '2026-10-31T12:59:20.000Z',
      sourceCurrentness: 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING',
      poolUtxoLastUpdateAgeMsAtObserverCompletion: '72141000000',
    },
    classification: 'WALLET_BALANCE_ASSERTION_MATCHES_POOL_SPECIFIC_LP_ASSET',
    ownership: {
      walletControl: 'CIP30_WALLET_SOURCE_ASSERTION_ONLY',
      beneficialOwnership: 'NOT_ESTABLISHED',
      principalBinding: 'NOT_ESTABLISHED',
      exclusiveAccountControl: 'NOT_ESTABLISHED',
    },
    economics: {
      poolShare: 'NOT_COMPUTED',
      marketValue: 'NOT_VALUED',
      liquidityQualification: 'NOT_PERFORMED',
      riskBudget: 'NOT_DERIVED',
      protectedCapital: 'NOT_DERIVED',
      openExposure: 'NOT_DERIVED',
      settlement: 'NOT_VERIFIED',
      economicAdmission: 'NOT_PERFORMED',
    },
    timeRelation: 'WALLET_AND_KOIOS_OBSERVATIONS_ARE_SEPARATE_NON_ATOMIC_READS',
    walletObservedAt: OBSERVED_AT,
  }
  return {
    schemaVersion: 'arb.cardano.minswap-v2-wallet-link.v1',
    classification: 'WALLET_LP_ASSET_TO_POOL_IDENTITY_LINK_NOT_ECONOMIC_POSITION_VERIFICATION',
    network: 'cardano-mainnet',
    status: 'LP_ASSET_LINKED_TO_OBSERVED_POOL',
    observerSource: {
      repository: 'LiberoNuvola/Immortal-Protocol',
      branch: 'work/immortal-green-closure',
      commitSha: 'ebca6c139e489bacaddcb6e0ae90b40e974b20da',
      path: 'scripts/observeMinswapV2UsdmUtxosReadOnly.mjs',
      blobSha: '25419945ab4a2359b5a8f57a6b97af4472f5aa0f',
      schema: 'immortal-minswap-v2-usdm-utxo-observation-v2',
    },
    walletSource: {
      bridge: 'CIP-30',
      walletName: 'nami',
      apiVersion: '1',
      observedAt: OBSERVED_AT,
      networkId: 1,
      utxoCount: 1,
      consistency: 'NON_ATOMIC_CROSS_METHOD_OBSERVATION',
      sourceAssertion: {
        schemaVersion: 'arb.cardano.wallet-read.v1',
        evidenceClass: 'SOURCE_ASSERTION_UNVERIFIED',
        sourceOperation: 'CIP30_GETBALANCE',
        sourceReference: 'CIP-30:getBalance',
        observationReference: null,
        evidenceDigest: null,
        evidenceVersion: 'CIP-30_API_1',
        verificationStatus: 'UNVERIFIED',
        rawBalanceCborIncludedInLinkResult: false,
        fingerprintStability: 'CHECKED_BEFORE_AND_AFTER_READ',
      },
      utxoCoverage: {
        status: 'EXHAUSTIVE_RESPONSE_NONEMPTY',
        scope: 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET',
        pagination: 'NOT_USED',
        atomicity: 'NOT_GUARANTEED',
        returnedCount: 1,
      },
    },
    poolSource: {
      provider: 'Koios',
      startedAt: '2026-10-31T12:59:00.000Z',
      completedAt: '2026-10-31T12:59:20.000Z',
      currentness: 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING',
      paginationComplete: true,
      exactUsdmCandidateCount: 1,
      structurallyQualifiedPoolCount: 1,
      walletAndPoolReadsAtomic: false,
      acquisitionEvidence: {
        endpoint: '/asset_utxos',
        exactAssetFilter: { policyId: USDM_POLICY, assetNameHex: USDM_NAME },
        addressFilter: 'addr1z84q0denmyep98ph3tmzwsmw0j7zau9ljmsqx6a4rvaau66j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq777e2a',
        pagination: { complete: true, pageSize: 1000, pageCount: 1, returnedUtxoCount: 1 },
        requestEvidence: [{
          url: 'https://api.koios.rest/api/v1/asset_utxos',
          method: 'POST',
          status: 200,
          responseDate: 'Sat, 31 Oct 2026 12:59:20 GMT',
          bodySha256: RESPONSE_SHA,
          digestAlgorithm: 'SHA-256',
          digestProducer: 'IMMORTAL_MINSWAP_READ_ONLY_OBSERVER',
        }],
        validatorIdentityCheck: {
          expectedPaymentCredential: 'ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b',
          validatedRows: 1,
          invalidRows: 0,
        },
      },
    },
    decodedWalletBalance: {
      encoding: 'CARDANO_VALUE_CBOR',
      lovelaceRaw: '10000000',
      assets: [{ policyId: LP_POLICY, assetNameHex: LP_NAME, unit: LP_POLICY + LP_NAME, quantityRaw: '123456' }],
      exactAssetIdentity: 'POLICY_ID_PLUS_ASSET_NAME_HEX',
      quantities: 'RAW_INTEGER_STRINGS',
    },
    matchedPositions: [link],
    unmatchedWalletLpAssets: [],
    ambiguousLpUnits: [],
    rejectedPoolCandidates: [],
    limitations: [
      'CIP-30 getBalance is a wallet API source assertion, not a cryptographic proof of beneficial ownership or Principal identity.',
      'The Koios observer queries an indexed UTxO set but its schema does not bind the query to an explicit chain tip/header.',
      'Wallet and Koios observations are separate non-atomic reads.',
    ],
    ...overrides,
  }
}

test('W3 maps exact LP identity but does not promote asset eligibility or valuation', () => {
  const result = mapArbObservationToImmortalExp(validW2())
  assert.equal(result.status, 'IDENTITY_LINKED_ONLY_NOT_ECONOMICALLY_EVALUABLE')
  assert.equal(result.exp03.status, 'EXACT_TECHNICAL_IDENTITY_ONLY')
  assert.equal(result.exp03.identities[0].assetIdentity.unit, LP_POLICY + LP_NAME)
  assert.equal(result.exp03.identities[0].walletQuantityRaw, '123456')
  assert.equal(result.exp03.eligibility, 'NOT_ASSESSED')
  assert.equal(result.exp03.valuationEvidence, 'NOT_AVAILABLE')
  assert.equal(result.exp03.haircutPolicy, 'NOT_DECLARED')
  assert.equal(result.exp03.executableValue, 'NOT_DERIVED')
  assert.equal(result.exp03.immediateLiquidity, 'NOT_OBSERVED')
})

test('EXP-06 preserves Koios body digest references but remains unverified and non-atomic', () => {
  const result = mapArbObservationToImmortalExp(validW2())
  assert.equal(result.exp06.status, 'UNVERIFIABLE_FOR_ECONOMIC_USE')
  assert.equal(result.exp06.sourceAssertions.pool.requestDigests[0].bodySha256, RESPONSE_SHA)
  assert.equal(result.exp06.sourceAssertions.wallet.evidenceDigest, null)
  assert.equal(result.exp06.verification.status, 'UNVERIFIED')
  assert.equal(result.exp06.freshness.status, 'NOT_ESTABLISHED')
  assert.equal(result.exp06.sourceAssertions.pool.explicitTipBinding, false)
  assert.ok(result.exp06.verification.reasons.includes('WALLET_BALANCE_EVIDENCE_DIGEST_MISSING'))
})

test('EXP-10 does not create a RiskBudget or infer exposure from raw LP units', () => {
  const result = mapArbObservationToImmortalExp(validW2())
  assert.equal(result.exp10.status, 'NOT_EVALUABLE_NO_AUTHORIZED_RISK_BUDGET')
  assert.equal(result.exp10.riskBudget.status, 'NOT_SUPPLIED')
  assert.equal(result.exp10.riskBudget.authorizedLimit, null)
  assert.equal(result.exp10.requestedExposure, 'NOT_DERIVED')
  assert.equal(result.exp10.realizedExposure, 'NOT_DERIVED')
  assert.equal(result.exp10.protectedCapital, 'NOT_PROJECTED')
  assert.equal(result.exp10.predicateStatus, 'NOT_EVALUABLE_INCOMPATIBLE_OR_MISSING_TYPED_INPUTS')
  assert.equal(result.exp10.riskReservation, 'NOT_DEFINED_AS_A_UNIVERSAL_IMMORTAL_PRIMITIVE')
})

test('W2 link never becomes a UniversalEconomicState or Economic Gate decision', () => {
  const result = mapArbObservationToImmortalExp(validW2())
  assert.equal(result.universalEconomicState.status, 'NOT_PROJECTED')
  assert.equal(result.universalEconomicState.zeroStateFallbackAllowed, false)
  assert.equal(result.economicGate.status, 'NOT_EVALUATED')
  assert.equal(result.economicGate.economicAdmissionRequested, false)
  assert.equal(result.adapterReuse.economicAdmissionWitness, 'NOT_APPLICABLE_CURRENT_CARDANO_WITNESS_IS_PRE_RICH_ACTION_AND_PRIZEPOOL_SHAPED')
})

test('no matching wallet LP token is scoped absence, not portfolio-wide absence', () => {
  const result = mapArbObservationToImmortalExp(validW2({
    status: 'NO_MATCHING_WALLET_LP_ASSET_IN_OBSERVED_USDM_POOL_SET',
    matchedPositions: [],
  }))
  assert.equal(result.status, 'NO_MATCH_IN_OBSERVED_SCOPE_NOT_PROOF_OF_ABSENCE')
  assert.equal(result.exp03.status, 'IDENTITY_NOT_ESTABLISHED')
  assert.equal(result.exp03.identities.length, 0)
})

test('ambiguous and conflicted W2 sources remain unresolved', () => {
  const ambiguous = mapArbObservationToImmortalExp(validW2({
    status: 'AMBIGUOUS_POOL_IDENTITY',
    matchedPositions: [],
  }))
  assert.equal(ambiguous.status, 'IDENTITY_UNRESOLVED_NOT_ECONOMICALLY_EVALUABLE')
  const conflicted = mapArbObservationToImmortalExp(validW2({
    status: 'CONFLICTED_WALLET_BALANCE_VS_EMPTY_UTXO_RESPONSE',
    matchedPositions: [],
  }))
  assert.equal(conflicted.status, 'IDENTITY_UNRESOLVED_NOT_ECONOMICALLY_EVALUABLE')
})

test('malformed W2 asset identity is rejected rather than passed to IMMORTAL', () => {
  const w2 = validW2()
  w2.matchedPositions[0].lpAsset.assetNameHex = '0'
  assert.throws(() => mapArbObservationToImmortalExp(w2), (error) => error.code === 'ASSET_IDENTITY_MALFORMED')
})

test('W2 observer version pin cannot be silently changed', () => {
  const w2 = validW2()
  w2.observerSource.blobSha = 'ff'.repeat(20)
  assert.throws(() => mapArbObservationToImmortalExp(w2), (error) => error.code === 'IMMORTAL_OBSERVER_PIN_MISMATCH')
})

test('W3 mapping is explicitly non-normative and delegates EXP semantics to IMMORTAL', () => {
  assert.equal(IMMORTAL_EXP_CONSUMER_MAP_V0_1.status, 'NON_NORMATIVE_CONSUMER_MAPPING')
  assert.ok(IMMORTAL_EXP_CONSUMER_MAP_V0_1.immortalOwns.includes('EXP-03'))
  assert.ok(IMMORTAL_EXP_CONSUMER_MAP_V0_1.immortalOwns.includes('EXP-06'))
  assert.ok(IMMORTAL_EXP_CONSUMER_MAP_V0_1.immortalOwns.includes('EXP-10 economic semantics and qualification'))
  assert.equal(IMMORTAL_EXP_CONSUMER_MAP_V0_1.proposalStatus, 'No new IMMORTAL semantics or canonical schema adopted')
})

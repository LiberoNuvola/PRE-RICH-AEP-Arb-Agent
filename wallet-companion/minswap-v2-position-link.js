/**
 * W2 consumer-side link between a CIP-30 wallet balance and the exact
 * Minswap V2 Mainnet USDM LP asset identified by IMMORTAL's read-only observer.
 *
 * It consumes serialized W1 and IMMORTAL outputs. It performs no network I/O,
 * does not decode PoolDatum, does not derive LP names, does not value positions,
 * and does not grant authority.
 */

const PROFILE = Object.freeze({
  network: 'cardano-mainnet',
  poolValidatorAddress: 'addr1z84q0denmyep98ph3tmzwsmw0j7zau9ljmsqx6a4rvaau66j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq777e2a',
  poolScriptHash: 'ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b',
  poolAddressStakeKeyHash: '52563c5410bff6a0d43ccebb7c37e1f69f5eb260552521adff33b9c2',
  poolBatchingStakeScriptHash: '1eae96baf29e27682ea3f815aba361a0c6059d45e4bfbe95bbd2f44a',
  lpPolicyId: 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c',
  poolAuthNft: {
    policyId: 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c',
    assetNameHex: '4d5350',
  },
  exactUsdm: {
    policyId: 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad',
    assetNameHex: '0014df105553444d',
  },
})

const IMMORTAL_OBSERVER_SOURCE = Object.freeze({
  repository: 'LiberoNuvola/Immortal-Protocol',
  branch: 'work/immortal-green-closure',
  commitSha: 'ebca6c139e489bacaddcb6e0ae90b40e974b20da',
  path: 'scripts/observeMinswapV2UsdmUtxosReadOnly.mjs',
  blobSha: '25419945ab4a2359b5a8f57a6b97af4472f5aa0f',
  schema: 'immortal-minswap-v2-usdm-utxo-observation-v2',
})

class CborMap {
  constructor(entries) {
    this.entries = entries
  }
}

export class MinswapWalletLinkError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'MinswapWalletLinkError'
    this.code = code
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isHex(value, allowEmpty = false, maxBytes = 1_000_000) {
  return typeof value === 'string' &&
    value.length % 2 === 0 &&
    (allowEmpty || value.length > 0) &&
    value.length <= maxBytes * 2 &&
    /^[0-9a-fA-F]*$/.test(value)
}

function bytesToHex(value) {
  let out = ''
  for (const byte of value) out += byte.toString(16).padStart(2, '0')
  return out
}

function isOffsetDateTime(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false
  }
  return Number.isFinite(Date.parse(value))
}

function readCborArgument(bytes, state, additional) {
  if (additional < 24) return BigInt(additional)

  const byteCount = additional === 24 ? 1
    : additional === 25 ? 2
      : additional === 26 ? 4
        : additional === 27 ? 8
          : 0

  if (byteCount === 0) {
    throw new MinswapWalletLinkError('CBOR_INDEFINITE_OR_RESERVED_LENGTH_UNSUPPORTED', 'Indefinite or reserved CBOR lengths are not accepted')
  }
  if (state.offset + byteCount > bytes.length) {
    throw new MinswapWalletLinkError('CBOR_TRUNCATED', 'The CBOR value ended while reading an argument')
  }

  let result = 0n
  for (let index = 0; index < byteCount; index += 1) {
    result = (result * 256n) + BigInt(bytes[state.offset])
    state.offset += 1
  }
  return result
}

function readCborLength(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MinswapWalletLinkError('CBOR_LENGTH_TOO_LARGE', 'CBOR length is outside the supported range: ' + label)
  }
  return Number(value)
}

function readCborItem(bytes, state, depth = 0) {
  if (depth > 24) {
    throw new MinswapWalletLinkError('CBOR_NESTING_LIMIT', 'CBOR value exceeds the W2 nesting limit')
  }
  if (state.offset >= bytes.length) {
    throw new MinswapWalletLinkError('CBOR_TRUNCATED', 'Unexpected end of CBOR data')
  }

  const initial = bytes[state.offset]
  state.offset += 1
  const major = initial >>> 5
  const additional = initial & 31
  const argument = readCborArgument(bytes, state, additional)

  if (major === 0) return argument
  if (major === 1) return -1n - argument

  if (major === 2) {
    const length = readCborLength(argument, 'byte-string')
    if (length > 1_000_000 || state.offset + length > bytes.length) {
      throw new MinswapWalletLinkError('CBOR_TRUNCATED_OR_OVERSIZED', 'CBOR byte string is truncated or oversized')
    }
    const result = bytes.slice(state.offset, state.offset + length)
    state.offset += length
    return result
  }

  if (major === 4) {
    const length = readCborLength(argument, 'array')
    if (length > 100_000) {
      throw new MinswapWalletLinkError('CBOR_COLLECTION_TOO_LARGE', 'CBOR array exceeds the W2 collection limit')
    }
    const items = []
    for (let index = 0; index < length; index += 1) {
      items.push(readCborItem(bytes, state, depth + 1))
    }
    return items
  }

  if (major === 5) {
    const length = readCborLength(argument, 'map')
    if (length > 100_000) {
      throw new MinswapWalletLinkError('CBOR_COLLECTION_TOO_LARGE', 'CBOR map exceeds the W2 collection limit')
    }
    const entries = []
    for (let index = 0; index < length; index += 1) {
      const key = readCborItem(bytes, state, depth + 1)
      const value = readCborItem(bytes, state, depth + 1)
      entries.push([key, value])
    }
    return new CborMap(entries)
  }

  throw new MinswapWalletLinkError('CBOR_TYPE_UNSUPPORTED', 'W2 accepts only Cardano Value integers, byte strings, arrays and maps')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

/**
 * Decode the CIP-30 cbor<value> forms needed for a Cardano wallet balance:
 * coin OR [coin, { policy_id => { asset_name => quantity } }].
 * Raw integer amounts are preserved; unlike units are never added together.
 */
export function decodeCardanoValueCbor(valueCborHex) {
  if (!isHex(valueCborHex, false, 2_000_000)) {
    throw new MinswapWalletLinkError('CARDANO_VALUE_CBOR_INVALID_HEX', 'CIP-30 balance must be a non-empty bounded CBOR hex string')
  }

  const bytes = hexToBytes(valueCborHex.toLowerCase())
  const state = { offset: 0 }
  const root = readCborItem(bytes, state)
  if (state.offset !== bytes.length) {
    throw new MinswapWalletLinkError('CARDANO_VALUE_CBOR_TRAILING_BYTES', 'Trailing bytes remain after the Cardano Value')
  }

  let coin
  let multiAsset = null
  if (typeof root === 'bigint') {
    coin = root
  } else if (Array.isArray(root) && root.length === 2) {
    coin = root[0]
    multiAsset = root[1]
  } else {
    throw new MinswapWalletLinkError('CARDANO_VALUE_SHAPE_UNSUPPORTED', 'Cardano Value must be a coin integer or a [coin, multiasset] pair')
  }

  if (typeof coin !== 'bigint' || coin < 0n) {
    throw new MinswapWalletLinkError('CARDANO_VALUE_COIN_INVALID', 'Cardano Value lovelace quantity must be a non-negative integer')
  }

  const assets = []
  const seenPolicies = new Set()
  const seenUnits = new Set()

  if (multiAsset !== null) {
    if (!(multiAsset instanceof CborMap)) {
      throw new MinswapWalletLinkError('CARDANO_MULTI_ASSET_MAP_INVALID', 'Cardano multiasset must be a CBOR map')
    }

    for (const [policyBytes, tokenMap] of multiAsset.entries) {
      if (!(policyBytes instanceof Uint8Array) || policyBytes.length !== 28) {
        throw new MinswapWalletLinkError('CARDANO_POLICY_ID_INVALID', 'Every multiasset policy key must be exactly 28 bytes')
      }
      if (!(tokenMap instanceof CborMap)) {
        throw new MinswapWalletLinkError('CARDANO_ASSET_NAME_MAP_INVALID', 'Every policy value must be a token-name map')
      }

      const policyId = bytesToHex(policyBytes)
      if (seenPolicies.has(policyId)) {
        throw new MinswapWalletLinkError('CARDANO_POLICY_ID_DUPLICATED', 'A policy ID appears more than once in the Cardano Value')
      }
      seenPolicies.add(policyId)

      for (const [assetNameBytes, quantity] of tokenMap.entries) {
        if (!(assetNameBytes instanceof Uint8Array) || assetNameBytes.length > 32) {
          throw new MinswapWalletLinkError('CARDANO_ASSET_NAME_INVALID', 'Every asset name must be a byte string of at most 32 bytes')
        }
        if (typeof quantity !== 'bigint' || quantity <= 0n) {
          throw new MinswapWalletLinkError('CARDANO_ASSET_QUANTITY_INVALID', 'Wallet balance quantities must be positive integers')
        }

        const assetNameHex = bytesToHex(assetNameBytes)
        const unit = policyId + assetNameHex
        if (seenUnits.has(unit)) {
          throw new MinswapWalletLinkError('CARDANO_ASSET_UNIT_DUPLICATED', 'An exact asset unit appears more than once in the Cardano Value')
        }
        seenUnits.add(unit)
        assets.push(Object.freeze({
          policyId,
          assetNameHex,
          unit,
          quantityRaw: quantity.toString(),
        }))
      }
    }
  }

  assets.sort((left, right) => left.unit.localeCompare(right.unit))
  return Object.freeze({
    encoding: 'CARDANO_VALUE_CBOR',
    lovelaceRaw: coin.toString(),
    assets: Object.freeze(assets),
    exactAssetIdentity: 'POLICY_ID_PLUS_ASSET_NAME_HEX',
    quantities: 'RAW_INTEGER_STRINGS',
  })
}

function requireRecord(value, code, message) {
  if (!isRecord(value)) throw new MinswapWalletLinkError(code, message)
  return value
}

function requirePositiveDecimal(value, code, message) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw new MinswapWalletLinkError(code, message)
  }
  return BigInt(value)
}

function parsePoolAssetIdentity(value, label) {
  requireRecord(value, 'POOL_ASSET_IDENTITY_INVALID', label + ' must be an asset identity object')
  const policyId = typeof value.policyId === 'string' ? value.policyId.toLowerCase() : ''
  const assetNameHex = typeof value.assetNameHex === 'string' ? value.assetNameHex.toLowerCase() : ''

  if (policyId === '' && assetNameHex === '') {
    return Object.freeze({ policyId: '', assetNameHex: '', unit: 'lovelace', isAda: true })
  }
  if (!/^[0-9a-f]{56}$/.test(policyId) || !isHex(assetNameHex, true, 32)) {
    throw new MinswapWalletLinkError('POOL_ASSET_IDENTITY_INVALID', label + ' has an invalid policy ID or asset name')
  }
  return Object.freeze({ policyId, assetNameHex, unit: policyId + assetNameHex, isAda: false })
}

function validateWalletSnapshot(snapshot) {
  requireRecord(snapshot, 'WALLET_SNAPSHOT_INVALID', 'W1 wallet snapshot is missing or malformed')
  if (snapshot.schemaVersion !== 'arb.cardano.wallet-read.v1' ||
      snapshot.evidenceClass !== 'SOURCE_ASSERTION_UNVERIFIED' ||
      !isOffsetDateTime(snapshot.observedAt)) {
    throw new MinswapWalletLinkError('WALLET_SNAPSHOT_NOT_W1', 'Input must be a timezone-qualified W1 CIP-30 source assertion')
  }

  const provider = requireRecord(snapshot.provider, 'WALLET_PROVIDER_IDENTITY_MISSING', 'W1 provider identity is missing')
  if (provider.bridge !== 'CIP-30') {
    throw new MinswapWalletLinkError('WALLET_PROVIDER_NOT_CIP30', 'W2 only accepts a W1 CIP-30 wallet snapshot')
  }

  const accountContext = requireRecord(snapshot.accountContext, 'WALLET_ACCOUNT_CONTEXT_MISSING', 'W1 account context is missing')
  const network = requireRecord(accountContext.network, 'WALLET_NETWORK_CONTEXT_MISSING', 'W1 network context is missing')
  if (network.networkId !== 1 || network.networkKind !== 'MAINNET' ||
      network.exactEnvironment !== 'MAINNET' ||
      network.environmentResolution !== 'CIP30_NETWORK_ID') {
    throw new MinswapWalletLinkError('WALLET_NETWORK_NOT_MAINNET', 'Minswap V2 USDM W2 profile requires the CIP-30 Mainnet network ID')
  }
  if (accountContext.fingerprintStability !== 'CHECKED_BEFORE_AND_AFTER_READ') {
    throw new MinswapWalletLinkError('WALLET_SESSION_FINGERPRINT_UNCHECKED', 'W1 account/network fingerprint was not checked before and after the read')
  }

  const walletData = requireRecord(snapshot.walletData, 'WALLET_DATA_MISSING', 'W1 wallet data is missing')
  const coverage = requireRecord(snapshot.coverage, 'WALLET_COVERAGE_MISSING', 'W1 collection coverage is missing')
  const utxoCoverage = requireRecord(coverage.walletControlledUtxos, 'WALLET_UTXO_COVERAGE_MISSING', 'W1 wallet UTxO coverage is missing')
  const utxos = walletData.utxoCborHex

  if (!Array.isArray(utxos) || utxos.some((item) => !isHex(item)) ||
      !['EXHAUSTIVE_RESPONSE_EMPTY', 'EXHAUSTIVE_RESPONSE_NONEMPTY'].includes(utxoCoverage.status) ||
      utxoCoverage.pagination !== 'NOT_USED' ||
      utxoCoverage.scope !== 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET' ||
      utxoCoverage.returnedCount !== utxos.length ||
      (utxos.length === 0) !== (utxoCoverage.status === 'EXHAUSTIVE_RESPONSE_EMPTY')) {
    throw new MinswapWalletLinkError('WALLET_UTXO_COVERAGE_INCOMPLETE', 'W2 requires a complete non-null W1 all-wallet-UTxO response; null and partial data remain incomplete')
  }

  const decodedBalance = decodeCardanoValueCbor(walletData.balanceCborHex)
  return Object.freeze({
    provider,
    observedAt: snapshot.observedAt,
    accountContext,
    utxoCount: utxos.length,
    utxoCoverage: Object.freeze({
      status: utxoCoverage.status,
      scope: utxoCoverage.scope,
      pagination: utxoCoverage.pagination,
      atomicity: utxoCoverage.atomicity,
      returnedCount: utxoCoverage.returnedCount,
    }),
    fingerprintStability: accountContext.fingerprintStability,
    decodedBalance,
  })
}

function validatePoolObservation(observation) {
  requireRecord(observation, 'MIN_SWAP_OBSERVATION_INVALID', 'IMMORTAL Minswap V2 observation is missing or malformed')
  if (observation.schema !== IMMORTAL_OBSERVER_SOURCE.schema ||
      observation.classification !== 'READ_ONLY_UTXO_AND_V2_POOL_DATUM_RECONCILIATION_NOT_ORACLE_QUALIFICATION' ||
      observation.network !== PROFILE.network ||
      !isOffsetDateTime(observation.startedAt) ||
      !isOffsetDateTime(observation.completedAt) ||
      Date.parse(observation.completedAt) < Date.parse(observation.startedAt)) {
    throw new MinswapWalletLinkError('MIN_SWAP_OBSERVATION_PROFILE_MISMATCH', 'Pool observation does not match the pinned IMMORTAL Minswap V2 Mainnet schema')
  }

  const provider = requireRecord(observation.provider, 'MIN_SWAP_OBSERVER_PROVIDER_MISSING', 'Minswap observer provider identity is missing')
  if (provider.name !== 'Koios') {
    throw new MinswapWalletLinkError('MIN_SWAP_OBSERVER_PROVIDER_UNEXPECTED', 'The pinned W2 profile expects the existing Koios read-only observer')
  }

  const target = requireRecord(observation.target, 'MIN_SWAP_OBSERVER_TARGET_MISSING', 'Minswap observer target identity is missing')
  const usdm = parsePoolAssetIdentity(target.exactAsset, 'target.exactAsset')
  const authNft = parsePoolAssetIdentity(target.expectedPoolAuthenticationNft, 'target.expectedPoolAuthenticationNft')
  if (target.protocol !== 'MinswapV2' ||
      target.poolValidatorAddress !== PROFILE.poolValidatorAddress ||
      target.expectedPoolScriptHash !== PROFILE.poolScriptHash ||
      target.expectedPoolAddressStakeKeyHash !== PROFILE.poolAddressStakeKeyHash ||
      target.expectedPoolBatchingStakeScriptHash !== PROFILE.poolBatchingStakeScriptHash ||
      usdm.unit !== PROFILE.exactUsdm.policyId + PROFILE.exactUsdm.assetNameHex ||
      authNft.unit !== PROFILE.poolAuthNft.policyId + PROFILE.poolAuthNft.assetNameHex) {
    throw new MinswapWalletLinkError('MIN_SWAP_OBSERVER_TARGET_MISMATCH', 'Minswap V2 validator, batching credential, pool NFT or exact USDM identity does not match the pinned Mainnet profile')
  }

  const acquisition = requireRecord(observation.acquisition, 'MIN_SWAP_ACQUISITION_MISSING', 'Minswap acquisition coverage is missing')
  const pagination = requireRecord(acquisition.pagination, 'MIN_SWAP_PAGINATION_MISSING', 'Minswap pagination evidence is missing')
  const validatorCheck = requireRecord(acquisition.validatorIdentityCheck, 'MIN_SWAP_VALIDATOR_CHECK_MISSING', 'Minswap validator identity check is missing')
  const requestEvidence = acquisition.requestEvidence

  if (acquisition.endpoint !== '/asset_utxos' ||
      acquisition.addressFilter !== PROFILE.poolValidatorAddress ||
      acquisition.extended !== true ||
      acquisition.exactAssetFilter?.policyId?.toLowerCase() !== PROFILE.exactUsdm.policyId ||
      acquisition.exactAssetFilter?.assetNameHex?.toLowerCase() !== PROFILE.exactUsdm.assetNameHex ||
      pagination.complete !== true ||
      !Number.isSafeInteger(pagination.pageSize) || pagination.pageSize <= 0 ||
      !Array.isArray(pagination.pages) || pagination.pages.length === 0 ||
      !Array.isArray(requestEvidence) || requestEvidence.length !== pagination.pages.length ||
      validatorCheck.expectedPaymentCredential !== PROFILE.poolScriptHash ||
      validatorCheck.invalidRows !== 0 ||
      validatorCheck.validatedRows !== acquisition.returnedUtxoCount ||
      !Number.isSafeInteger(acquisition.returnedUtxoCount) || acquisition.returnedUtxoCount < 0) {
    throw new MinswapWalletLinkError('MIN_SWAP_OBSERVATION_INCOMPLETE', 'Minswap pool scan is not complete or its validator/asset query scope does not match')
  }

  for (const item of requestEvidence) {
    if (!isRecord(item) || item.status !== 200 || !/^[0-9a-f]{64}$/i.test(String(item.bodySha256 ?? ''))) {
      throw new MinswapWalletLinkError('MIN_SWAP_REQUEST_EVIDENCE_INVALID', 'Minswap Koios request evidence is missing a successful response or body digest')
    }
  }

  for (const page of pagination.pages) {
    if (!isRecord(page) || !Number.isSafeInteger(page.returnedCount) ||
        page.returnedCount < 0 || !isRecord(page.response)) {
      throw new MinswapWalletLinkError('MIN_SWAP_PAGE_EVIDENCE_INVALID', 'Minswap page evidence is malformed')
    }
  }
  if (pagination.pages[pagination.pages.length - 1].returnedCount >= pagination.pageSize) {
    throw new MinswapWalletLinkError('MIN_SWAP_PAGINATION_TERMINATION_UNPROVEN', 'The final Koios page is full; pagination exhaustion is not evidenced')
  }

  if (!Array.isArray(observation.candidates) ||
      acquisition.exactUsdmCandidateCount !== observation.candidates.length) {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_SET_INVALID', 'Minswap candidate count does not match its exact-USDM acquisition summary')
  }

  return Object.freeze({
    provider,
    target,
    acquisition,
    startedAt: observation.startedAt,
    completedAt: observation.completedAt,
    candidates: observation.candidates,
  })
}

function validateQualifiedPoolCandidate(candidate, target) {
  requireRecord(candidate, 'MIN_SWAP_CANDIDATE_INVALID', 'Minswap candidate must be an object')
  const validation = requireRecord(candidate.datumValidation, 'MIN_SWAP_DATUM_VALIDATION_MISSING', 'Minswap datum validation is missing')
  if (validation.status !== 'MATCH' || !Array.isArray(validation.reasons) || validation.reasons.length !== 0 ||
      candidate.qualification !== 'POOL_IDENTITY_AND_RESERVE_STRUCTURE_MATCH_NOT_ORACLE_QUALIFICATION') {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_NOT_QUALIFIED', 'Minswap candidate has not passed the existing observer structural checks')
  }

  if (!isHex(candidate.inlineDatumCborHex) || !/^[0-9a-f]{64}$/i.test(String(candidate.datumHash ?? ''))) {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_DATUM_PROVENANCE_MISSING', 'Minswap candidate lacks its inline datum CBOR or datum hash')
  }

  if (candidate.address !== target.poolValidatorAddress ||
      candidate.poolAuthNftQuantityRaw !== '1' ||
      candidate.poolAuthNftValidated !== true ||
      validation.poolAuthNftQuantityRaw !== '1') {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_POOL_IDENTITY_INVALID', 'Minswap candidate does not preserve the exact pool address and singleton Pool NFT')
  }

  const lpAsset = parsePoolAssetIdentity(validation.lpAsset, 'datumValidation.lpAsset')
  if (lpAsset.isAda || lpAsset.policyId !== PROFILE.lpPolicyId) {
    throw new MinswapWalletLinkError('MIN_SWAP_LP_POLICY_MISMATCH', 'Minswap LP asset policy does not match the official Mainnet LP policy')
  }
  const lpQuantity = requirePositiveDecimal(
    validation.lpAsset.quantityRaw,
    'MIN_SWAP_POOL_LP_CAPACITY_INVALID',
    'Minswap pool output LP quantity must be a positive raw integer',
  )

  const datum = requireRecord(validation.datum, 'MIN_SWAP_POOL_DATUM_MISSING', 'Minswap validated datum summary is missing')
  const assetA = parsePoolAssetIdentity(datum.assetA, 'datumValidation.datum.assetA')
  const assetB = parsePoolAssetIdentity(datum.assetB, 'datumValidation.datum.assetB')
  const usdmUnit = PROFILE.exactUsdm.policyId + PROFILE.exactUsdm.assetNameHex
  if (assetA.unit !== usdmUnit && assetB.unit !== usdmUnit) {
    throw new MinswapWalletLinkError('MIN_SWAP_DATUM_USDM_PAIR_MISMATCH', 'Validated Minswap datum does not include the exact Moneta USDM asset')
  }

  if (!Array.isArray(candidate.assets)) {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_VALUE_MISSING', 'Minswap candidate has no exact Value asset list')
  }
  const assetRows = new Map()
  for (const row of candidate.assets) {
    const identity = parsePoolAssetIdentity(row, 'candidate.assets[]')
    if (identity.isAda) {
      throw new MinswapWalletLinkError('MIN_SWAP_ADA_ASSET_ROW_UNEXPECTED', 'ADA is represented in the Pool UTxO lovelace field, not in asset_list')
    }
    if (assetRows.has(identity.unit)) {
      throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_ASSET_DUPLICATED', 'Minswap candidate repeats an exact asset unit')
    }
    const quantity = requirePositiveDecimal(row.quantityRaw, 'MIN_SWAP_CANDIDATE_ASSET_QUANTITY_INVALID', 'Minswap candidate asset quantity must be a positive raw integer')
    assetRows.set(identity.unit, quantity.toString())
  }

  if (assetRows.get(lpAsset.unit) !== lpQuantity.toString()) {
    throw new MinswapWalletLinkError('MIN_SWAP_LP_CAPACITY_VALUE_MISMATCH', 'Observer LP identity/quantity does not match the exact asset in the Pool UTxO')
  }
  const authUnit = PROFILE.poolAuthNft.policyId + PROFILE.poolAuthNft.assetNameHex
  if (assetRows.get(authUnit) !== '1') {
    throw new MinswapWalletLinkError('MIN_SWAP_POOL_NFT_VALUE_MISMATCH', 'Minswap Pool UTxO does not contain exactly one official Pool NFT')
  }
  const usdmQuantity = requirePositiveDecimal(
    candidate.exactUsdmQuantityRaw,
    'MIN_SWAP_CANDIDATE_USDM_QUANTITY_INVALID',
    'Minswap candidate USDM quantity must be a positive raw integer',
  )
  if (assetRows.get(usdmUnit) !== usdmQuantity.toString()) {
    throw new MinswapWalletLinkError('MIN_SWAP_CANDIDATE_USDM_VALUE_MISMATCH', 'Observer exact-USDM candidate amount does not match the pool Value asset row')
  }

  const outRef = String(candidate.utxoRef ?? '').toLowerCase()
  const parts = outRef.split('#')
  const tx = requireRecord(candidate.transactionContext, 'MIN_SWAP_TRANSACTION_CONTEXT_MISSING', 'Minswap candidate transaction context is missing')
  const txHash = String(tx.txHash ?? '').toLowerCase()
  const blockHash = String(tx.blockHash ?? '').toLowerCase()
  const index = Number(parts[1])
  if (parts.length !== 2 || !/^[0-9a-f]{64}$/.test(parts[0]) ||
      !Number.isSafeInteger(index) || index < 0 ||
      txHash !== parts[0] || !/^[0-9a-f]{64}$/.test(blockHash) ||
      !Number.isSafeInteger(tx.blockHeight) || tx.blockHeight <= 0 ||
      !Number.isSafeInteger(tx.absoluteSlot) || tx.absoluteSlot <= 0 ||
      !Number.isSafeInteger(tx.blockTime) || tx.blockTime <= 0) {
    throw new MinswapWalletLinkError('MIN_SWAP_TRANSACTION_CONTEXT_INVALID', 'Minswap candidate UTxO and transaction/block context do not bind')
  }

  return Object.freeze({
    lpAsset,
    utxoRef: outRef,
    datumHash: String(candidate.datumHash).toLowerCase(),
    inlineDatumCborHex: candidate.inlineDatumCborHex.toLowerCase(),
    transactionContext: Object.freeze({
      txHash,
      blockHash,
      blockHeight: tx.blockHeight,
      absoluteSlot: tx.absoluteSlot,
      blockTime: tx.blockTime,
    }),
    poolOutputLpQuantityRaw: lpQuantity.toString(),
    poolOutputLpQuantityMeaning: 'REMAINING_LP_TOKEN_CAPACITY_IN_POOL_UTXO_NOT_TOTAL_SUPPLY',
    datumAssetA: assetA,
    datumAssetB: assetB,
  })
}

function buildPositionLink(walletAsset, pool, wallet, observer) {
  const blockAgeMsAtObserverCompletion = Date.parse(observer.completedAt) - (pool.transactionContext.blockTime * 1000)
  return Object.freeze({
    lpAsset: Object.freeze({
      policyId: pool.lpAsset.policyId,
      assetNameHex: pool.lpAsset.assetNameHex,
      unit: pool.lpAsset.unit,
    }),
    walletBalance: Object.freeze({
      quantityRaw: walletAsset.quantityRaw,
      unit: pool.lpAsset.unit,
      source: 'CIP30_GETBALANCE',
      sourceAssertion: 'WALLET_API_REPORTED_AGGREGATE_BALANCE',
    }),
    poolIdentity: Object.freeze({
      protocol: 'MinswapV2',
      network: PROFILE.network,
      datumAssetA: pool.datumAssetA,
      datumAssetB: pool.datumAssetB,
      utxoRef: pool.utxoRef,
      datumHash: pool.datumHash,
      inlineDatumCborHex: pool.inlineDatumCborHex,
      transactionContext: pool.transactionContext,
      sourceObserverCompletedAt: observer.completedAt,
      poolUtxoLastUpdateAgeMsAtObserverCompletion: Number.isFinite(blockAgeMsAtObserverCompletion) && blockAgeMsAtObserverCompletion >= 0
        ? String(Math.trunc(blockAgeMsAtObserverCompletion))
        : null,
      sourceCurrentness: 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING',
    }),
    classification: 'WALLET_BALANCE_ASSERTION_MATCHES_POOL_SPECIFIC_LP_ASSET',
    ownership: Object.freeze({
      walletControl: 'CIP30_WALLET_SOURCE_ASSERTION_ONLY',
      beneficialOwnership: 'NOT_ESTABLISHED',
      principalBinding: 'NOT_ESTABLISHED',
      exclusiveAccountControl: 'NOT_ESTABLISHED',
    }),
    economics: Object.freeze({
      poolShare: 'NOT_COMPUTED',
      marketValue: 'NOT_VALUED',
      liquidityQualification: 'NOT_PERFORMED',
      riskBudget: 'NOT_DERIVED',
      protectedCapital: 'NOT_DERIVED',
      openExposure: 'NOT_DERIVED',
      settlement: 'NOT_VERIFIED',
      economicAdmission: 'NOT_PERFORMED',
    }),
    timeRelation: 'WALLET_AND_KOIOS_OBSERVATIONS_ARE_SEPARATE_NON_ATOMIC_READS',
    walletObservedAt: wallet.observedAt,
  })
}

/**
 * Link an exact LP policy/name balance to one unique structurally MATCHed
 * Minswap V2 USDM pool candidate from IMMORTAL's serialized Mainnet output.
 */
export function linkMinswapV2WalletPositions({ walletSnapshot, poolObservation } = {}) {
  const wallet = validateWalletSnapshot(walletSnapshot)
  const observer = validatePoolObservation(poolObservation)

  const poolsByLpUnit = new Map()
  const rejectedPoolCandidates = []
  for (const candidate of observer.candidates) {
    try {
      const pool = validateQualifiedPoolCandidate(candidate, observer.target)
      const existing = poolsByLpUnit.get(pool.lpAsset.unit) ?? []
      existing.push(pool)
      poolsByLpUnit.set(pool.lpAsset.unit, existing)
    } catch (error) {
      rejectedPoolCandidates.push(Object.freeze({
        utxoRef: typeof candidate?.utxoRef === 'string' ? candidate.utxoRef : null,
        reason: error instanceof MinswapWalletLinkError ? error.code : 'POOL_CANDIDATE_INVALID',
      }))
    }
  }

  const walletLpAssets = wallet.decodedBalance.assets.filter((asset) =>
    asset.policyId === PROFILE.lpPolicyId && BigInt(asset.quantityRaw) > 0n
  )
  const matches = []
  const unmatchedWalletLpAssets = []
  const ambiguousLpUnits = []

  for (const walletAsset of walletLpAssets) {
    const poolCandidates = poolsByLpUnit.get(walletAsset.unit) ?? []
    if (poolCandidates.length === 1) {
      matches.push(buildPositionLink(walletAsset, poolCandidates[0], wallet, observer))
    } else if (poolCandidates.length > 1) {
      ambiguousLpUnits.push(walletAsset.unit)
    } else {
      unmatchedWalletLpAssets.push(Object.freeze({
        policyId: walletAsset.policyId,
        assetNameHex: walletAsset.assetNameHex,
        quantityRaw: walletAsset.quantityRaw,
        reason: 'NO_UNIQUE_QUALIFIED_POOL_IN_EXACT_USDM_OBSERVATION_SET',
      }))
    }
  }

  const resultBase = {
    schemaVersion: 'arb.cardano.minswap-v2-wallet-link.v1',
    classification: 'WALLET_LP_ASSET_TO_POOL_IDENTITY_LINK_NOT_ECONOMIC_POSITION_VERIFICATION',
    network: PROFILE.network,
    observerSource: IMMORTAL_OBSERVER_SOURCE,
    walletSource: Object.freeze({
      bridge: 'CIP-30',
      walletName: wallet.provider.walletName,
      apiVersion: wallet.provider.apiVersion,
      observedAt: wallet.observedAt,
      networkId: 1,
      utxoCount: wallet.utxoCount,
      consistency: 'NON_ATOMIC_CROSS_METHOD_OBSERVATION',
      sourceAssertion: Object.freeze({
        schemaVersion: 'arb.cardano.wallet-read.v1',
        evidenceClass: 'SOURCE_ASSERTION_UNVERIFIED',
        sourceOperation: 'CIP30_GETBALANCE',
        sourceReference: 'CIP-30:getBalance',
        observationReference: null,
        evidenceDigest: null,
        evidenceVersion: wallet.provider.apiVersion
          ? 'CIP-30_API_' + wallet.provider.apiVersion
          : 'CIP-30_API_VERSION_UNKNOWN',
        verificationStatus: 'UNVERIFIED',
        rawBalanceCborIncludedInLinkResult: false,
        fingerprintStability: wallet.fingerprintStability,
      }),
      utxoCoverage: wallet.utxoCoverage,
    }),
    poolSource: Object.freeze({
      provider: observer.provider.name,
      startedAt: observer.startedAt,
      completedAt: observer.completedAt,
      currentness: 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING',
      paginationComplete: true,
      exactUsdmCandidateCount: observer.candidates.length,
      structurallyQualifiedPoolCount: [...poolsByLpUnit.values()].reduce((count, candidates) => count + candidates.length, 0),
      walletAndPoolReadsAtomic: false,
      acquisitionEvidence: Object.freeze({
        endpoint: observer.acquisition.endpoint,
        exactAssetFilter: Object.freeze({ ...observer.acquisition.exactAssetFilter }),
        addressFilter: observer.acquisition.addressFilter,
        extended: observer.acquisition.extended,
        pagination: Object.freeze({
          complete: observer.acquisition.pagination.complete,
          pageSize: observer.acquisition.pagination.pageSize,
          pageCount: observer.acquisition.pagination.pages.length,
          returnedUtxoCount: observer.acquisition.returnedUtxoCount,
        }),
        requestEvidence: Object.freeze(observer.acquisition.requestEvidence.map((item) => Object.freeze({
          url: item.url,
          method: item.method,
          status: item.status,
          responseDate: item.responseDate ?? null,
          bodySha256: item.bodySha256,
          digestAlgorithm: 'SHA-256',
          digestProducer: 'IMMORTAL_MINSWAP_READ_ONLY_OBSERVER',
        }))),
        validatorIdentityCheck: Object.freeze({
          expectedPaymentCredential: observer.acquisition.validatorIdentityCheck.expectedPaymentCredential,
          validatedRows: observer.acquisition.validatorIdentityCheck.validatedRows,
          invalidRows: observer.acquisition.validatorIdentityCheck.invalidRows,
        }),
      }),
    }),
    decodedWalletBalance: wallet.decodedBalance,
    matchedPositions: Object.freeze(matches),
    unmatchedWalletLpAssets: Object.freeze(unmatchedWalletLpAssets),
    ambiguousLpUnits: Object.freeze(ambiguousLpUnits),
    rejectedPoolCandidates: Object.freeze(rejectedPoolCandidates),
    limitations: Object.freeze([
      'CIP-30 getBalance is a wallet API source assertion, not a cryptographic proof of beneficial ownership or Principal identity.',
      'The Koios observer queries an indexed UTxO set but its schema does not bind the query to an explicit chain tip/header.',
      'Wallet and Koios observations are separate non-atomic reads.',
      'The LP asset is linked by exact policy ID and asset-name identity only; no pool share, market value, liquidity, fee return or economic exposure is computed.',
      'The LP quantity inside the Minswap Pool UTxO is remaining LP-token capacity, not total circulating LP supply or a share denominator.',
      'This observer is exact-USDM and Mainnet scoped; other wallet LP assets may belong to other Minswap pools or Cardano protocols.',
      'No signing, submission, order, transfer, withdrawal, transaction or economic-admission operation is performed.',
    ]),
  }

  const hasWalletUtxos = wallet.utxoCount > 0
  if (!hasWalletUtxos && walletLpAssets.length > 0) {
    return Object.freeze({
      ...resultBase,
      status: 'CONFLICTED_WALLET_BALANCE_VS_EMPTY_UTXO_RESPONSE',
      classification: 'CONFLICTED_SOURCE_ASSERTIONS',
      matchedPositions: Object.freeze([]),
      limitations: Object.freeze([
        'CIP-30 getBalance reported a positive LP token while getUtxos returned an exhaustive empty wallet UTxO array.',
        'The W1 wallet snapshot is conflicted; no pool link is emitted.',
      ]),
    })
  }

  let status
  if (ambiguousLpUnits.length > 0) status = matches.length > 0 ? 'PARTIAL_WITH_AMBIGUOUS_POOL_IDENTITY' : 'AMBIGUOUS_POOL_IDENTITY'
  else if (matches.length > 0) status = rejectedPoolCandidates.length > 0 ? 'PARTIAL_LINKED_WITH_REJECTIONS' : 'LP_ASSET_LINKED_TO_OBSERVED_POOL'
  else if (unmatchedWalletLpAssets.length > 0) status = 'WALLET_LP_ASSET_WITHOUT_QUALIFIED_OBSERVED_POOL'
  else status = 'NO_MATCHING_WALLET_LP_ASSET_IN_OBSERVED_USDM_POOL_SET'

  return Object.freeze({ ...resultBase, status })
}

export const MINSWAP_V2_MAINNET_USDM_PROFILE = Object.freeze({
  network: PROFILE.network,
  exactUsdm: PROFILE.exactUsdm,
  poolValidatorAddress: PROFILE.poolValidatorAddress,
  poolScriptHash: PROFILE.poolScriptHash,
  lpPolicyId: PROFILE.lpPolicyId,
  observer: IMMORTAL_OBSERVER_SOURCE,
})

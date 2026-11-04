/**
 * W3 — non-normative Arb consumer mapping for IMMORTAL EXP-03/06/10.
 *
 * This is a consumer-side readiness projection only. It does not implement
 * EXP semantics, create an EvidenceQualification registry, construct a
 * UniversalEconomicState, calculate ProtectedCapital/RawSurplus, assess
 * RiskBudget, or call the IMMORTAL Economic Gate.
 */

const W2_SCHEMA = 'arb.cardano.minswap-v2-wallet-link.v1'
const W2_CLASSIFICATION = 'WALLET_LP_ASSET_TO_POOL_IDENTITY_LINK_NOT_ECONOMIC_POSITION_VERIFICATION'
const W2_POOL_CLASSIFICATION = 'WALLET_BALANCE_ASSERTION_MATCHES_POOL_SPECIFIC_LP_ASSET'
const W2_CONFLICT_CLASSIFICATION = 'CONFLICTED_SOURCE_ASSERTIONS'
const EXPECTED_USDM_UNIT = 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d'
const EXPECTED_POOL_ADDRESS = 'addr1z84q0denmyep98ph3tmzwsmw0j7zau9ljmsqx6a4rvaau66j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq777e2a'
const EXPECTED_POOL_SCRIPT_HASH = 'ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b'
const EXPECTED_LP_POLICY_ID = 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c'
const IMMORTAL_OBSERVER = Object.freeze({
  repository: 'LiberoNuvola/Immortal-Protocol',
  branch: 'work/immortal-green-closure',
  commitSha: 'ebca6c139e489bacaddcb6e0ae90b40e974b20da',
  path: 'scripts/observeMinswapV2UsdmUtxosReadOnly.mjs',
  blobSha: '25419945ab4a2359b5a8f57a6b97af4472f5aa0f',
  schema: 'immortal-minswap-v2-usdm-utxo-observation-v2',
})

export class ImmortalConsumerMappingError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ImmortalConsumerMappingError'
    this.code = code
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isOffsetDateTime(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false
  }
  return Number.isFinite(Date.parse(value))
}

function requireExact(value, expected, code, label) {
  if (value !== expected) {
    throw new ImmortalConsumerMappingError(code, label + ' does not match the pinned W2 profile')
  }
}

function assetIdentity(value, label) {
  if (!isRecord(value)) {
    throw new ImmortalConsumerMappingError('ASSET_IDENTITY_MISSING', label + ' is missing')
  }
  if (value.isAda === true || value.unit === 'lovelace') {
    return Object.freeze({
      policyId: '',
      assetNameHex: '',
      unit: 'lovelace',
      kind: 'ADA',
    })
  }
  const policyId = typeof value.policyId === 'string' ? value.policyId.toLowerCase() : ''
  const assetNameHex = typeof value.assetNameHex === 'string' ? value.assetNameHex.toLowerCase() : ''
  if (!/^[0-9a-f]{56}$/.test(policyId) ||
      assetNameHex.length % 2 !== 0 ||
      assetNameHex.length > 64 ||
      !/^[0-9a-f]*$/.test(assetNameHex)) {
    throw new ImmortalConsumerMappingError('ASSET_IDENTITY_MALFORMED', label + ' has malformed policy/name bytes')
  }
  return Object.freeze({
    policyId,
    assetNameHex,
    unit: policyId + assetNameHex,
    kind: 'CARDANO_NATIVE_ASSET',
  })
}

function validateW2Result(w2) {
  const isConflict = isRecord(w2) &&
    w2.status === 'CONFLICTED_WALLET_BALANCE_VS_EMPTY_UTXO_RESPONSE'
  if (!isRecord(w2) ||
      w2.schemaVersion !== W2_SCHEMA ||
      (w2.classification !== W2_CLASSIFICATION &&
        !(isConflict && w2.classification === W2_CONFLICT_CLASSIFICATION)) ||
      w2.network !== 'cardano-mainnet' ||
      ![
        'LP_ASSET_LINKED_TO_OBSERVED_POOL',
        'PARTIAL_LINKED_WITH_REJECTIONS',
        'AMBIGUOUS_POOL_IDENTITY',
        'PARTIAL_WITH_AMBIGUOUS_POOL_IDENTITY',
        'WALLET_LP_ASSET_WITHOUT_QUALIFIED_OBSERVED_POOL',
        'NO_MATCHING_WALLET_LP_ASSET_IN_OBSERVED_USDM_POOL_SET',
        'CONFLICTED_WALLET_BALANCE_VS_EMPTY_UTXO_RESPONSE',
      ].includes(w2.status) ||
      !Array.isArray(w2.matchedPositions) ||
      !isRecord(w2.walletSource) ||
      !isRecord(w2.poolSource) ||
      !isRecord(w2.observerSource)) {
    throw new ImmortalConsumerMappingError('W2_RESULT_INVALID', 'Input is not a supported W2 Minswap V2 Mainnet identity-link result')
  }

  if (isConflict && w2.matchedPositions.length !== 0) {
    throw new ImmortalConsumerMappingError('W2_CONFLICT_HAS_MATCHES', 'A conflicted W2 wallet snapshot cannot contain matched positions')
  }

  if (w2.observerSource.schema !== IMMORTAL_OBSERVER.schema ||
      w2.observerSource.commitSha !== IMMORTAL_OBSERVER.commitSha ||
      w2.observerSource.blobSha !== IMMORTAL_OBSERVER.blobSha ||
      w2.observerSource.path !== IMMORTAL_OBSERVER.path) {
    throw new ImmortalConsumerMappingError('IMMORTAL_OBSERVER_PIN_MISMATCH', 'W2 observer source is not the reviewed IMMORTAL observer version')
  }

  const wallet = w2.walletSource
  requireExact(wallet.bridge, 'CIP-30', 'W2_WALLET_BRIDGE_MISMATCH', 'walletSource.bridge')
  if (wallet.networkId !== 1 ||
      !nonEmpty(wallet.walletName) ||
      !isOffsetDateTime(wallet.observedAt) ||
      wallet.consistency !== 'NON_ATOMIC_CROSS_METHOD_OBSERVATION') {
    throw new ImmortalConsumerMappingError('W2_WALLET_CONTEXT_INVALID', 'W2 wallet source is not a consistent CIP-30 Mainnet read assertion')
  }
  const walletAssertion = wallet.sourceAssertion
  if (!isRecord(walletAssertion) ||
      walletAssertion.schemaVersion !== 'arb.cardano.wallet-read.v1' ||
      walletAssertion.evidenceClass !== 'SOURCE_ASSERTION_UNVERIFIED' ||
      walletAssertion.sourceOperation !== 'CIP30_GETBALANCE' ||
      walletAssertion.sourceReference !== 'CIP-30:getBalance' ||
      !nonEmpty(walletAssertion.evidenceVersion) ||
      walletAssertion.verificationStatus !== 'UNVERIFIED' ||
      walletAssertion.rawBalanceCborIncludedInLinkResult !== false ||
      walletAssertion.fingerprintStability !== 'CHECKED_BEFORE_AND_AFTER_READ' ||
      (walletAssertion.evidenceDigest !== null &&
        !/^[0-9a-f]{64}$/i.test(String(walletAssertion.evidenceDigest))) ||
      (walletAssertion.observationReference !== null &&
        !nonEmpty(walletAssertion.observationReference))) {
    throw new ImmortalConsumerMappingError('W2_WALLET_SOURCE_ASSERTION_INVALID', 'W2 wallet source assertion does not preserve the reviewed CIP-30 provenance boundary')
  }

  const utxoCoverage = wallet.utxoCoverage
  if (!isRecord(utxoCoverage) ||
      !['EXHAUSTIVE_RESPONSE_EMPTY', 'EXHAUSTIVE_RESPONSE_NONEMPTY'].includes(utxoCoverage.status) ||
      utxoCoverage.scope !== 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET' ||
      utxoCoverage.pagination !== 'NOT_USED' ||
      !Number.isSafeInteger(utxoCoverage.returnedCount) ||
      utxoCoverage.returnedCount < 0 ||
      (utxoCoverage.status === 'EXHAUSTIVE_RESPONSE_EMPTY') !== (utxoCoverage.returnedCount === 0)) {
    throw new ImmortalConsumerMappingError('W2_WALLET_COVERAGE_INVALID', 'W2 wallet UTxO coverage is not a valid exhaustive CIP-30 response')
  }

  const pool = w2.poolSource
  requireExact(pool.provider, 'Koios', 'W2_POOL_PROVIDER_MISMATCH', 'poolSource.provider')
  requireExact(pool.currentness, 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING', 'W2_POOL_CURRENTNESS_UNKNOWN', 'poolSource.currentness')
  if (pool.walletAndPoolReadsAtomic !== false ||
      pool.paginationComplete !== true ||
      !isOffsetDateTime(pool.startedAt) ||
      !isOffsetDateTime(pool.completedAt) ||
      Date.parse(pool.completedAt) < Date.parse(pool.startedAt)) {
    throw new ImmortalConsumerMappingError('W2_POOL_OBSERVATION_CONTEXT_INVALID', 'W2 pool observation time, atomicity or pagination context is invalid')
  }

  const acquisition = pool.acquisitionEvidence
  const acquisitionErrors = []
  if (!isRecord(acquisition)) acquisitionErrors.push('acquisitionEvidence')
  else {
    if (acquisition.endpoint !== '/asset_utxos') acquisitionErrors.push('endpoint')
    if (acquisition.extended !== true) acquisitionErrors.push('extended')
    if (acquisition.addressFilter !== EXPECTED_POOL_ADDRESS) acquisitionErrors.push('addressFilter')
    if (acquisition.exactAssetFilter?.policyId?.toLowerCase() !== EXPECTED_USDM_UNIT.slice(0, 56)) acquisitionErrors.push('exactAssetFilter.policyId')
    if (acquisition.exactAssetFilter?.assetNameHex?.toLowerCase() !== EXPECTED_USDM_UNIT.slice(56)) acquisitionErrors.push('exactAssetFilter.assetNameHex')
    if (!isRecord(acquisition.pagination)) acquisitionErrors.push('pagination')
    else {
      if (acquisition.pagination.complete !== true) acquisitionErrors.push('pagination.complete')
      if (!Number.isSafeInteger(acquisition.pagination.pageSize) || acquisition.pagination.pageSize <= 0) acquisitionErrors.push('pagination.pageSize')
      if (!Number.isSafeInteger(acquisition.pagination.pageCount) || acquisition.pagination.pageCount <= 0) acquisitionErrors.push('pagination.pageCount')
      if (!Number.isSafeInteger(acquisition.pagination.returnedUtxoCount) || acquisition.pagination.returnedUtxoCount < 0) acquisitionErrors.push('pagination.returnedUtxoCount')
    }
    if (!Array.isArray(acquisition.requestEvidence)) acquisitionErrors.push('requestEvidence')
    else if (acquisition.pagination?.pageCount !== acquisition.requestEvidence.length) acquisitionErrors.push('requestEvidence.pageCount')
    if (!isRecord(acquisition.validatorIdentityCheck)) acquisitionErrors.push('validatorIdentityCheck')
    else {
      if (acquisition.validatorIdentityCheck.expectedPaymentCredential !== EXPECTED_POOL_SCRIPT_HASH) acquisitionErrors.push('validatorIdentityCheck.expectedPaymentCredential')
      if (acquisition.validatorIdentityCheck.invalidRows !== 0) acquisitionErrors.push('validatorIdentityCheck.invalidRows')
      if (acquisition.validatorIdentityCheck.validatedRows !== acquisition.pagination?.returnedUtxoCount) acquisitionErrors.push('validatorIdentityCheck.validatedRows')
    }
  }
  if (acquisitionErrors.length > 0) {
    throw new ImmortalConsumerMappingError('W2_POOL_ACQUISITION_SCOPE_INVALID', 'W2 Koios query scope is invalid: ' + acquisitionErrors.join(', '))
  }

  for (const request of acquisition.requestEvidence) {
    if (!isRecord(request) ||
        request.status !== 200 ||
        request.method !== 'POST' ||
        !nonEmpty(request.url) ||
        !/^[0-9a-f]{64}$/i.test(String(request.bodySha256 ?? '')) ||
        request.digestAlgorithm !== 'SHA-256' ||
        request.digestProducer !== 'IMMORTAL_MINSWAP_READ_ONLY_OBSERVER') {
      throw new ImmortalConsumerMappingError('W2_POOL_REQUEST_EVIDENCE_INVALID', 'A Koios response digest or its provenance metadata is missing or malformed')
    }
  }

  if (Number.isSafeInteger(pool.exactUsdmCandidateCount) &&
      pool.exactUsdmCandidateCount < w2.matchedPositions.length) {
    throw new ImmortalConsumerMappingError('W2_POOL_CANDIDATE_COUNT_INVALID', 'Matched positions exceed the exact-USDM observed candidate count')
  }

  const matches = w2.matchedPositions.map((link, index) => {
    if (!isRecord(link) ||
        link.classification !== W2_POOL_CLASSIFICATION ||
        !isRecord(link.lpAsset) ||
        !isRecord(link.walletBalance) ||
        !isRecord(link.poolIdentity) ||
        !isRecord(link.ownership) ||
        !isRecord(link.economics)) {
      throw new ImmortalConsumerMappingError('W2_MATCH_INVALID', 'W2 matched position ' + index + ' is malformed')
    }

    const lpAsset = assetIdentity(link.lpAsset, 'matchedPositions[' + index + '].lpAsset')
    const pairA = assetIdentity(link.poolIdentity.datumAssetA, 'matchedPositions[' + index + '].datumAssetA')
    const pairB = assetIdentity(link.poolIdentity.datumAssetB, 'matchedPositions[' + index + '].datumAssetB')
    const tx = link.poolIdentity.transactionContext
    const outRef = String(link.poolIdentity.utxoRef ?? '').toLowerCase()
    const parts = outRef.split('#')

    if (lpAsset.kind !== 'CARDANO_NATIVE_ASSET' ||
        lpAsset.policyId !== EXPECTED_LP_POLICY_ID ||
        link.walletBalance.unit !== lpAsset.unit ||
        link.walletBalance.source !== 'CIP30_GETBALANCE' ||
        link.walletBalance.sourceAssertion !== 'WALLET_API_REPORTED_AGGREGATE_BALANCE' ||
        !/^[1-9][0-9]*$/.test(String(link.walletBalance.quantityRaw)) ||
        link.poolIdentity.protocol !== 'MinswapV2' ||
        link.poolIdentity.network !== 'cardano-mainnet' ||
        parts.length !== 2 ||
        !/^[0-9a-f]{64}$/.test(parts[0]) ||
        !/^(0|[1-9][0-9]*)$/.test(parts[1]) ||
        !/^[0-9a-f]{64}$/i.test(String(link.poolIdentity.datumHash ?? '')) ||
        !/^(?:[0-9a-f]{2})+$/i.test(String(link.poolIdentity.inlineDatumCborHex ?? '')) ||
        !isOffsetDateTime(link.walletObservedAt) ||
        !isOffsetDateTime(link.poolIdentity.sourceObserverCompletedAt) ||
        link.poolIdentity.sourceCurrentness !== pool.currentness ||
        !isRecord(tx) ||
        String(tx.txHash ?? '').toLowerCase() !== parts[0] ||
        !/^[0-9a-f]{64}$/i.test(String(tx.blockHash ?? '')) ||
        !Number.isSafeInteger(tx.blockHeight) || tx.blockHeight <= 0 ||
        !Number.isSafeInteger(tx.absoluteSlot) || tx.absoluteSlot <= 0 ||
        !Number.isSafeInteger(tx.blockTime) || tx.blockTime <= 0 ||
        (pairA.unit !== EXPECTED_USDM_UNIT && pairB.unit !== EXPECTED_USDM_UNIT) ||
        link.ownership.beneficialOwnership !== 'NOT_ESTABLISHED' ||
        link.ownership.principalBinding !== 'NOT_ESTABLISHED' ||
        link.economics.marketValue !== 'NOT_VALUED' ||
        link.economics.riskBudget !== 'NOT_DERIVED' ||
        link.economics.protectedCapital !== 'NOT_DERIVED') {
      throw new ImmortalConsumerMappingError('W2_MATCH_SEMANTICS_INVALID', 'W2 link does not preserve its exact Mainnet/USDM identity-only and non-economic classification')
    }

    return Object.freeze({
      lpAsset,
      walletQuantityRaw: String(link.walletBalance.quantityRaw),
      pairAssets: Object.freeze([pairA, pairB]),
      poolUtxoRef: link.poolIdentity.utxoRef,
      datumHash: String(link.poolIdentity.datumHash).toLowerCase(),
      inlineDatumCborHex: String(link.poolIdentity.inlineDatumCborHex).toLowerCase(),
      transactionContext: link.poolIdentity.transactionContext,
      poolCurrentness: link.poolIdentity.sourceCurrentness,
      walletObservedAt: link.walletObservedAt,
      poolObservedAt: link.poolIdentity.sourceObserverCompletedAt,
      timeRelation: link.timeRelation,
    })
  })

  return Object.freeze({ w2, matches })
}

function sourceEvidenceAssessment(w2, matches) {
  const wallet = w2.walletSource
  const walletAssertion = isRecord(wallet.sourceAssertion) ? wallet.sourceAssertion : null
  const walletDigestPresent = Boolean(walletAssertion &&
    /^[0-9a-f]{64}$/i.test(String(walletAssertion.evidenceDigest ?? '')))
  const walletObservationRefPresent = Boolean(walletAssertion &&
    nonEmpty(walletAssertion.observationReference))
  const acquisition = isRecord(w2.poolSource.acquisitionEvidence)
    ? w2.poolSource.acquisitionEvidence
    : null
  const requestEvidence = acquisition && Array.isArray(acquisition.requestEvidence)
    ? acquisition.requestEvidence
    : []
  const validRequestDigests = requestEvidence.filter(item =>
    isRecord(item) &&
    item.status === 200 &&
    /^[0-9a-f]{64}$/i.test(String(item.bodySha256 ?? ''))
  )
  const pageEvidenceComplete = Boolean(
    acquisition &&
    acquisition.pagination?.complete === true &&
    acquisition.pagination?.pageCount > 0 &&
    acquisition.pagination?.pageCount === requestEvidence.length
  )

  const reasons = []
  if (!walletAssertion) reasons.push('WALLET_SOURCE_ASSERTION_METADATA_NOT_PASSED_THROUGH')
  if (!walletDigestPresent) reasons.push('WALLET_BALANCE_EVIDENCE_DIGEST_MISSING')
  if (!walletObservationRefPresent) reasons.push('WALLET_OBSERVATION_REFERENCE_MISSING')
  if (validRequestDigests.length === 0) reasons.push('KOIOS_RESPONSE_DIGESTS_MISSING')
  if (validRequestDigests.length !== requestEvidence.length) reasons.push('KOIOS_RESPONSE_DIGEST_SET_INCOMPLETE')
  if (!pageEvidenceComplete) reasons.push('KOIOS_QUERY_COMPLETION_EVIDENCE_INCOMPLETE')
  if (w2.poolSource.currentness !== 'KOIOS_CURRENT_ASSET_UTXO_QUERY_WITHOUT_EXPLICIT_TIP_BINDING') {
    reasons.push('KOIOS_CURRENTNESS_PROFILE_UNKNOWN')
  }
  if (w2.poolSource.walletAndPoolReadsAtomic !== false ||
      wallet.consistency !== 'NON_ATOMIC_CROSS_METHOD_OBSERVATION') {
    reasons.push('NON_ATOMIC_READ_RELATION_NOT_PRESERVED')
  }

  const linkedPoolRefs = matches.map(match => ({
    utxoRef: match.poolUtxoRef,
    datumHash: match.datumHash,
    blockHash: match.transactionContext?.blockHash ?? null,
    blockHeight: match.transactionContext?.blockHeight ?? null,
    absoluteSlot: match.transactionContext?.absoluteSlot ?? null,
    blockTime: match.transactionContext?.blockTime ?? null,
  }))

  return Object.freeze({
    status: 'UNVERIFIABLE_FOR_ECONOMIC_USE',
    sourceAssertions: Object.freeze({
      wallet: Object.freeze({
        source: 'CIP-30',
        operation: walletAssertion?.sourceOperation ?? 'CIP30_GETBALANCE',
        sourceReference: walletAssertion?.sourceReference ?? 'CIP-30:getBalance',
        observationReference: walletAssertion?.observationReference ?? null,
        evidenceDigest: walletAssertion?.evidenceDigest ?? null,
        evidenceVersion: walletAssertion?.evidenceVersion ?? null,
        verificationStatus: walletAssertion?.verificationStatus ?? 'UNVERIFIED',
        rawBalanceCborIncludedInW2Result: walletAssertion?.rawBalanceCborIncludedInLinkResult ?? false,
      }),
      pool: Object.freeze({
        source: 'Koios',
        observerSource: IMMORTAL_OBSERVER,
        queryScope: acquisition ? Object.freeze({
          endpoint: acquisition.endpoint,
          exactAssetFilter: acquisition.exactAssetFilter,
          addressFilter: acquisition.addressFilter,
        }) : null,
        requestDigests: Object.freeze(validRequestDigests.map(item => Object.freeze({
          url: item.url,
          method: item.method,
          responseDate: item.responseDate ?? null,
          bodySha256: item.bodySha256,
          digestAlgorithm: item.digestAlgorithm ?? 'SHA-256',
          digestProducer: item.digestProducer ?? 'IMMORTAL_MINSWAP_READ_ONLY_OBSERVER',
          verificationStatus: 'UNVERIFIED',
        }))),
        paginationComplete: pageEvidenceComplete,
        poolReferences: Object.freeze(linkedPoolRefs),
        explicitTipBinding: false,
        independentVerifierReference: null,
      }),
    }),
    verification: Object.freeze({
      status: 'UNVERIFIED',
      independentVerifierReference: null,
      reasons: Object.freeze(reasons),
    }),
    freshness: Object.freeze({
      status: 'NOT_ESTABLISHED',
      reason: 'The Koios observer result is not bound to an explicit chain tip/header; a response timestamp is not a currentness proof.',
    }),
    coverage: 'MIN_SWAP_V2_MAINNET_EXACT_USDM_POOL_SET_ONLY_NOT_ACCOUNT_OR_DEFI_COMPLETE',
  })
}

/**
 * Map W2 identity observations to a consumer-side IMMORTAL EXP readiness
 * record. This function never constructs economic quantities or an admission.
 */
export function mapArbObservationToImmortalExp(w2Result) {
  const validated = validateW2Result(w2Result)
  const { w2, matches } = validated
  const hasIdentity = matches.length > 0
  const identities = matches.map(match => Object.freeze({
    role: 'WALLET_HELD_LP_ASSET_ASSERTION',
    assetIdentity: match.lpAsset,
    walletQuantityRaw: match.walletQuantityRaw,
    quantityUnit: 'RAW_LP_TOKEN_UNITS',
    poolIdentity: Object.freeze({
      protocol: 'MinswapV2',
      utxoRef: match.poolUtxoRef,
      datumHash: match.datumHash,
      pairAssets: match.pairAssets,
      transactionContext: match.transactionContext,
    }),
    identityRelation: 'EXACT_POLICY_ID_AND_ASSET_NAME_MATCH',
    beneficialOwnership: 'NOT_ESTABLISHED',
    principalBinding: 'NOT_ESTABLISHED',
  }))

  const evidence = sourceEvidenceAssessment(w2, matches)
  const missingBudgetDimensions = Object.freeze([
    'budgetRefAndVersion',
    'principalRef',
    'issuerAuthorityRef',
    'scope',
    'measureRefAndUnit',
    'authorizedLimit',
    'horizon',
    'riskModelReference',
    'validityAndRevocationStatus',
    'evidenceAndVerification',
  ])

  return Object.freeze({
    schemaVersion: 'arb.immortal.exp-consumer-mapping.v0.1',
    conformanceClass: 'NON_NORMATIVE_CONSUMER_READINESS_MAPPING',
    sourceW2Schema: W2_SCHEMA,
    sourceObserver: IMMORTAL_OBSERVER,
    status: hasIdentity
      ? 'IDENTITY_LINKED_ONLY_NOT_ECONOMICALLY_EVALUABLE'
      : w2.status === 'NO_MATCHING_WALLET_LP_ASSET_IN_OBSERVED_USDM_POOL_SET'
        ? 'NO_MATCH_IN_OBSERVED_SCOPE_NOT_PROOF_OF_ABSENCE'
        : 'IDENTITY_UNRESOLVED_NOT_ECONOMICALLY_EVALUABLE',
    observedAt: w2.walletSource.observedAt,
    exp03: Object.freeze({
      status: hasIdentity ? 'EXACT_TECHNICAL_IDENTITY_ONLY' : 'IDENTITY_NOT_ESTABLISHED',
      identities: Object.freeze(identities),
      eligibility: 'NOT_ASSESSED',
      valuationEvidence: 'NOT_AVAILABLE',
      haircutPolicy: 'NOT_DECLARED',
      executableValue: 'NOT_DERIVED',
      immediateLiquidity: 'NOT_OBSERVED',
      protectedCapitalContribution: 'NOT_PROJECTED',
      rule: 'Asset identity, eligibility, valuation, haircut, executable value and immediate liquidity remain distinct stages.',
    }),
    exp06: evidence,
    exp10: Object.freeze({
      status: 'NOT_EVALUABLE_NO_AUTHORIZED_RISK_BUDGET',
      riskBudget: Object.freeze({
        status: 'NOT_SUPPLIED',
        budgetRef: null,
        budgetVersion: null,
        principalRef: null,
        issuerAuthorityRef: null,
        scope: null,
        measureRef: null,
        unitRef: null,
        authorizedLimit: null,
        horizon: null,
        riskModelReference: null,
        validity: null,
        revocationStatus: null,
        evidence: null,
      }),
      missingBudgetDimensions,
      requestedExposure: 'NOT_DERIVED',
      realizedExposure: 'NOT_DERIVED',
      riskReservation: 'NOT_DEFINED_AS_A_UNIVERSAL_IMMORTAL_PRIMITIVE',
      protectedCapital: 'NOT_PROJECTED',
      researchPredicate: 'RealizedExposure + RequestedExposure <= RiskBudget',
      predicateStatus: 'NOT_EVALUABLE_INCOMPATIBLE_OR_MISSING_TYPED_INPUTS',
      reason: 'A raw LP-token quantity from CIP-30 is not an authorized RiskBudget, risk measure, valuation, realized risk exposure or ProtectedCapital component.',
    }),
    universalEconomicState: Object.freeze({
      status: 'NOT_PROJECTED',
      reason: 'W2 does not supply EEV, complete obligation coverage, worst-case exposure or the profile-specific protected components required by UniversalEconomicState.',
      zeroStateFallbackAllowed: false,
    }),
    economicGate: Object.freeze({
      status: 'NOT_EVALUATED',
      economicAdmissionRequested: false,
      reason: 'No candidate economic transition, authoritative EEV, complete obligations, executable liquidity witness or authoritative Ω/viability result is present in W2.',
    }),
    adapterReuse: Object.freeze({
      economicObservation: 'NOT_APPLICABLE_W2_IS_NOT_A_CANONICAL_ECONOMIC_STATE',
      executableLiquidityObservation: 'NOT_APPLICABLE_W2_IS_NOT_A_SPENDABLE_CONSUMED_INPUT_WITNESS',
      canonicalTransitionEvidence: 'NOT_APPLICABLE_NO_ECONOMIC_TRANSITION_OR_SETTLEMENT_TX',
      economicAdmissionWitness: 'NOT_APPLICABLE_CURRENT_CARDANO_WITNESS_IS_PRE_RICH_ACTION_AND_PRIZEPOOL_SHAPED',
    }),
    principalAndAuthority: Object.freeze({
      principalBinding: 'NOT_ESTABLISHED',
      mandate: 'NOT_SUPPLIED',
      executionCredential: 'NOT_SUPPLIED',
      ownershipAndAccountControl: 'NOT_ESTABLISHED',
    }),
    nonRegression: Object.freeze({
      noSecondEvidenceQualification: true,
      noSecondEconomicGate: true,
      noSecondUniversalEconomicState: true,
      noRiskBudgetDerivation: true,
      noRiskReservationPrimitive: true,
      noActionClassExtension: true,
    }),
  })
}

export const IMMORTAL_EXP_CONSUMER_MAP_V0_1 = Object.freeze({
  status: 'NON_NORMATIVE_CONSUMER_MAPPING',
  workstream: 'Arb application edge',
  immortalOwns: Object.freeze(['EXP-03', 'EXP-06', 'EXP-10 economic semantics and qualification']),
  arbOwns: Object.freeze(['wallet/provider observations', 'application-side exact identity links', 'consumer readiness projection']),
  adapterOwns: Object.freeze(['Cardano-native representation and chain observation/execution evidence']),
  proposalStatus: 'No new IMMORTAL semantics or canonical schema adopted',
})

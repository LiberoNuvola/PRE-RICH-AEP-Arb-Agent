/**
 * Provider-neutral comparison core for explicitly mapped trade observations.
 *
 * This module accepts normalized candidates from a provider adapter. It does not
 * parse provider payloads, verify a ProviderProfile mapping, retrieve raw bytes,
 * validate digests, establish account ownership, or perform economic admission.
 * A MATCHED result means only that one REST and one STREAM observation describe
 * the same scoped trade key and agree on the declared comparable fields.
 */

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readOwn(record, key) {
  if (!isRecord(record)) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : undefined
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function canonicalDecimal(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const trimmed = fraction.replace(/0+$/, '')
  return trimmed ? whole + '.' + trimmed : whole
}

function classifyCandidate(candidate, index) {
  if (!isRecord(candidate)) {
    return { status: 'INVALID', candidate: null, issue: { index, code: 'CANDIDATE_NOT_OBJECT' } }
  }

  const sourceFactType = readOwn(candidate, 'sourceFactType')
  const tradeId = readOwn(candidate, 'tradeId')
  if (sourceFactType === 'NOT_A_TRADE' || tradeId === '-1') {
    return {
      status: 'NOT_A_TRADE',
      candidate: null,
      issue: { index, observationRef: readOwn(candidate, 'observationRef') ?? null, code: 'EXPLICIT_NON_TRADE_EVENT' },
    }
  }

  if (sourceFactType !== 'TRADE_EXECUTION' || !nonEmpty(readOwn(candidate, 'sourceOperationRef'))) {
    return {
      status: 'UNMAPPED',
      candidate: null,
      issue: { index, observationRef: readOwn(candidate, 'observationRef') ?? null, code: 'SOURCE_OPERATION_NOT_MAPPED_TO_TRADE_EXECUTION' },
    }
  }

  const sourceChannel = readOwn(candidate, 'sourceChannel')
  if (sourceChannel !== 'REST' && sourceChannel !== 'STREAM') {
    return {
      status: 'UNMAPPED',
      candidate: null,
      issue: { index, observationRef: readOwn(candidate, 'observationRef') ?? null, code: 'SOURCE_CHANNEL_NOT_SUPPORTED' },
    }
  }

  const required = [
    'observationRef', 'rawDigestRef', 'profileRef', 'profileVersion',
    'sourceId', 'streamId', 'accountScopeRef', 'symbol', 'tradeId',
    'orderId', 'quantity', 'price', 'commissionAmount', 'commissionAsset',
  ]
  const missing = required.filter((key) => !nonEmpty(readOwn(candidate, key)))
  if (sourceChannel === 'STREAM' && !nonEmpty(readOwn(candidate, 'sourceEventId'))) {
    missing.push('sourceEventId')
  }
  if (missing.length) {
    return {
      status: 'INCOMPLETE',
      candidate: null,
      issue: { index, observationRef: readOwn(candidate, 'observationRef') ?? null, code: 'TRADE_CANDIDATE_INCOMPLETE', missing },
    }
  }

  const decimals = ['quantity', 'price', 'commissionAmount']
  if (readOwn(candidate, 'quoteQuantity') !== undefined && readOwn(candidate, 'quoteQuantity') !== null) {
    decimals.push('quoteQuantity')
  }
  const canonicalValues = {}
  for (const field of decimals) {
    const value = readOwn(candidate, field)
    const canonical = canonicalDecimal(value)
    if (canonical === null) {
      return {
        status: 'INVALID',
        candidate: null,
        issue: { index, observationRef: readOwn(candidate, 'observationRef'), code: 'TRADE_DECIMAL_INVALID', field },
      }
    }
    canonicalValues[field] = canonical
  }

  const correctionRef = readOwn(candidate, 'correctionRef')
  return {
    status: 'CANDIDATE',
    candidate: Object.freeze({
      observationRef: readOwn(candidate, 'observationRef'),
      rawDigestRef: readOwn(candidate, 'rawDigestRef'),
      profileRef: readOwn(candidate, 'profileRef'),
      profileVersion: readOwn(candidate, 'profileVersion'),
      sourceId: readOwn(candidate, 'sourceId'),
      streamId: readOwn(candidate, 'streamId'),
      sourceEventId: readOwn(candidate, 'sourceEventId') ?? null,
      sourceOperationRef: readOwn(candidate, 'sourceOperationRef'),
      sourceChannel,
      sourceFactType,
      accountScopeRef: readOwn(candidate, 'accountScopeRef'),
      symbol: readOwn(candidate, 'symbol'),
      tradeId,
      orderId: readOwn(candidate, 'orderId'),
      quantity: readOwn(candidate, 'quantity'),
      price: readOwn(candidate, 'price'),
      quoteQuantity: readOwn(candidate, 'quoteQuantity') ?? null,
      commissionAmount: readOwn(candidate, 'commissionAmount'),
      commissionAsset: readOwn(candidate, 'commissionAsset'),
      canonicalValues,
      correctionRef: correctionRef ?? null,
    }),
  }
}

function keyFor(candidate) {
  return JSON.stringify([
    candidate.profileRef,
    candidate.profileVersion,
    candidate.accountScopeRef,
    candidate.symbol,
    candidate.tradeId,
  ])
}

function sameComparedValues(left, right) {
  return left.orderId === right.orderId &&
    left.canonicalValues.quantity === right.canonicalValues.quantity &&
    left.canonicalValues.price === right.canonicalValues.price &&
    left.canonicalValues.commissionAmount === right.canonicalValues.commissionAmount &&
    left.commissionAsset === right.commissionAsset &&
    (left.canonicalValues.quoteQuantity ?? null) === (right.canonicalValues.quoteQuantity ?? null)
}

function compareTradeFacts(left, right) {
  const comparisons = []
  const compareExact = (field, a, b) => comparisons.push({
    field,
    status: a === b ? 'MATCH' : 'MISMATCH',
    left: a,
    right: b,
  })
  const compareDecimal = (field, a, b) => comparisons.push({
    field,
    status: a === b ? 'MATCH' : 'MISMATCH',
    leftCanonical: a,
    rightCanonical: b,
  })

  compareExact('orderId', left.orderId, right.orderId)
  compareDecimal('quantity', left.canonicalValues.quantity, right.canonicalValues.quantity)
  compareDecimal('price', left.canonicalValues.price, right.canonicalValues.price)
  compareDecimal('commissionAmount', left.canonicalValues.commissionAmount, right.canonicalValues.commissionAmount)
  compareExact('commissionAsset', left.commissionAsset, right.commissionAsset)

  if (left.canonicalValues.quoteQuantity !== undefined && right.canonicalValues.quoteQuantity !== undefined) {
    compareDecimal('quoteQuantity', left.canonicalValues.quoteQuantity, right.canonicalValues.quoteQuantity)
  } else {
    comparisons.push({ field: 'quoteQuantity', status: 'NOT_COMPARABLE_SINGLE_SIDE' })
  }
  return comparisons
}

function reconcileGroup(candidates, key) {
  const issues = []
  const duplicateObservationRefs = []
  const byChannel = new Map([['REST', []], ['STREAM', []]])
  const byObservationRef = new Map()

  for (const candidate of candidates) {
    const previousRef = byObservationRef.get(candidate.observationRef)
    if (previousRef) {
      if (previousRef.rawDigestRef === candidate.rawDigestRef && sameComparedValues(previousRef, candidate)) {
        duplicateObservationRefs.push(candidate.observationRef)
        continue
      }
      issues.push({ code: 'OBSERVATION_REFERENCE_REUSED_WITH_DIFFERENT_CONTENT', observationRef: candidate.observationRef })
      continue
    }
    byObservationRef.set(candidate.observationRef, candidate)
    byChannel.get(candidate.sourceChannel).push(candidate)
  }

  if (issues.length) {
    return groupResult('CONFLICTED', key, candidates, duplicateObservationRefs, null, issues, [])
  }

  const uniqueByChannel = new Map()
  for (const channel of ['REST', 'STREAM']) {
    const entries = byChannel.get(channel)
    if (entries.length > 1) {
      const first = entries[0]
      const allSameIdentity = entries.every((entry) =>
        entry.sourceId === first.sourceId &&
        entry.streamId === first.streamId &&
        entry.sourceEventId === first.sourceEventId &&
        entry.sourceOperationRef === first.sourceOperationRef)
      if (!allSameIdentity) {
        issues.push({ code: 'MULTIPLE_SOURCE_IDENTITIES_IN_CHANNEL', channel })
      } else if (entries.every((entry) => entry.rawDigestRef === first.rawDigestRef && sameComparedValues(entry, first))) {
        duplicateObservationRefs.push(...entries.slice(1).map((entry) => entry.observationRef))
        uniqueByChannel.set(channel, first)
      } else {
        issues.push({ code: 'SOURCE_IDENTITY_DIGEST_CONFLICT', channel })
      }
    } else if (entries.length === 1) {
      uniqueByChannel.set(channel, entries[0])
    }
  }

  if (issues.length) {
    return groupResult('CONFLICTED', key, candidates, duplicateObservationRefs, null, issues, [])
  }

  const rest = uniqueByChannel.get('REST')
  const stream = uniqueByChannel.get('STREAM')
  if (!rest || !stream) {
    return groupResult(
      'INCOMPLETE',
      key,
      candidates,
      duplicateObservationRefs,
      null,
      [{ code: 'INDEPENDENT_REST_AND_STREAM_OBSERVATIONS_REQUIRED', presentChannels: [...uniqueByChannel.keys()].sort() }],
      [],
    )
  }

  if (rest.correctionRef !== null || stream.correctionRef !== null) {
    return groupResult(
      'CONFLICTED',
      key,
      candidates,
      duplicateObservationRefs,
      null,
      [{ code: 'CORRECTION_OR_SUPERSESSION_REQUIRES_SEPARATE_LINEAGE_REVIEW' }],
      [],
    )
  }

  const comparisons = compareTradeFacts(rest, stream)
  const mismatches = comparisons.filter((item) => item.status === 'MISMATCH')
  if (mismatches.length) {
    return groupResult(
      'CONFLICTED',
      key,
      candidates,
      duplicateObservationRefs,
      null,
      [{ code: 'IDENTITY_CRITICAL_TRADE_FIELDS_DISAGREE', fields: mismatches.map((item) => item.field) }],
      comparisons,
    )
  }

  const observationRefs = [rest.observationRef, stream.observationRef].sort()
  const sourceValues = {}
  for (const field of ['orderId', 'quantity', 'price', 'quoteQuantity', 'commissionAmount', 'commissionAsset']) {
    sourceValues[field] = [rest, stream]
      .filter((entry) => entry[field] !== null)
      .map((entry) => ({ observationRef: entry.observationRef, value: entry[field] }))
      .sort((a, b) => a.observationRef.localeCompare(b.observationRef))
  }

  const projection = Object.freeze({
    recordType: 'ReconciledTradeFactProjection',
    evidenceClass: 'DERIVED',
    factType: 'TRADE_EXECUTION',
    profileRef: rest.profileRef,
    profileVersion: rest.profileVersion,
    accountScopeRef: rest.accountScopeRef,
    symbol: rest.symbol,
    tradeId: rest.tradeId,
    orderId: rest.orderId,
    comparableValues: Object.freeze({
      quantity: rest.canonicalValues.quantity,
      price: rest.canonicalValues.price,
      quoteQuantity: rest.canonicalValues.quoteQuantity !== undefined && stream.canonicalValues.quoteQuantity !== undefined
        ? rest.canonicalValues.quoteQuantity
        : null,
      commissionAmount: rest.canonicalValues.commissionAmount,
      commissionAsset: rest.commissionAsset,
    }),
    sourceValues: Object.freeze(sourceValues),
    observationRefs,
    comparison: comparisons,
    sourceOperationMappingStatus: 'CALLER_SUPPLIED_NOT_VERIFIED',
    rawDigestIntegrityStatus: 'NOT_CHECKED',
    verifierTrustStatus: 'NOT_ASSESSED',
    settlementStatus: 'NOT_ASSERTED',
    positionStateChanged: false,
    nettingApplied: false,
    economicAdmissionGranted: false,
    authorityGranted: false,
    externalSideEffectPerformed: false,
  })

  return groupResult('MATCHED', key, candidates, duplicateObservationRefs, projection, [], comparisons)
}

function groupResult(status, key, candidates, duplicateObservationRefs, projection, issues, comparison) {
  return Object.freeze({
    status,
    reconciliationKey: key,
    observationRefs: [...new Set(candidates.map((candidate) => candidate.observationRef))].sort(),
    duplicateObservationRefs: [...new Set(duplicateObservationRefs)].sort(),
    sourceChannels: [...new Set(candidates.map((candidate) => candidate.sourceChannel))].sort(),
    comparison,
    projection,
    issues,
  })
}

/**
 * Reconcile explicitly mapped, normalized candidates for one provider trade fact.
 *
 * Candidate input is a synthetic adapter boundary, not a ProviderProfile or
 * source-operation verifier. MATCHED requires exactly one distinct REST source
 * identity and one STREAM source identity for the complete scoped trade key.
 */
export function reconcileTradeObservationCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return Object.freeze({
      recordType: 'TradeObservationReconciliation',
      contractVersion: '0.1',
      reconciliationStatus: 'INVALID',
      groups: [],
      unclassified: [{ code: 'CANDIDATE_COLLECTION_MALFORMED' }],
      sourceOperationMappingStatus: 'NOT_VERIFIED',
      aggregateTradeCount: null,
      authorityGranted: false,
      economicAdmissionGranted: false,
      externalSideEffectPerformed: false,
    })
  }
  if (candidates.length === 0) {
    return Object.freeze({
      recordType: 'TradeObservationReconciliation',
      contractVersion: '0.1',
      reconciliationStatus: 'INCOMPLETE',
      groups: [],
      unclassified: [{ code: 'NO_TRADE_OBSERVATIONS_PROVIDED' }],
      sourceOperationMappingStatus: 'NOT_VERIFIED',
      aggregateTradeCount: null,
      authorityGranted: false,
      economicAdmissionGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  const grouped = new Map()
  const unclassified = []
  for (let index = 0; index < candidates.length; index += 1) {
    const classified = classifyCandidate(candidates[index], index)
    if (classified.status !== 'CANDIDATE') {
      unclassified.push({ status: classified.status, ...classified.issue })
      continue
    }
    const key = keyFor(classified.candidate)
    const group = grouped.get(key) ?? []
    group.push(classified.candidate)
    grouped.set(key, group)
  }

  const groups = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, values]) => reconcileGroup(values, key))

  const groupStatuses = groups.map((group) => group.status)
  const allMatched = groups.length > 0 && groupStatuses.every((status) => status === 'MATCHED') && unclassified.length === 0
  let reconciliationStatus = 'PARTIAL'
  if (allMatched) reconciliationStatus = 'MATCHED'
  else if (groupStatuses.includes('INVALID') || unclassified.some((entry) => entry.status === 'INVALID')) reconciliationStatus = 'INVALID'
  else if (groupStatuses.includes('CONFLICTED')) reconciliationStatus = 'CONFLICTED'
  else if (groupStatuses.includes('UNMAPPED') || unclassified.some((entry) => entry.status === 'UNMAPPED')) reconciliationStatus = 'UNMAPPED'
  else if (groups.length === 0 && unclassified.length && unclassified.every((entry) => entry.status === 'NOT_A_TRADE')) reconciliationStatus = 'NOT_A_TRADE'
  else if (groups.length === 0) reconciliationStatus = 'INCOMPLETE'

  return Object.freeze({
    recordType: 'TradeObservationReconciliation',
    contractVersion: '0.1',
    reconciliationStatus,
    groups,
    unclassified,
    sourceOperationMappingStatus: 'NOT_VERIFIED',
    rawDigestIntegrityStatus: 'NOT_CHECKED',
    verifierTrustStatus: 'NOT_ASSESSED',
    aggregateTradeCount: null,
    nettingApplied: false,
    settlementAsserted: false,
    positionStateChanged: false,
    authorityGranted: false,
    economicAdmissionGranted: false,
    externalSideEffectPerformed: false,
  })
}

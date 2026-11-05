/**
 * Pure S1 prototype reducer.
 * No network, filesystem, timers, credentials, actuator or external side effects.
 * It derives evidence projections only; it never grants authority/admission.
 */

const READ_ONLY_CAPABILITIES = new Set([
  'read_market_observations',
  'read_instrument_metadata',
  'normalize_observations',
  'replay_observations',
  'derive_candidate_intent',
  'simulate_candidate',
])

const FORBIDDEN_CAPABILITIES = new Set([
  'submit_order', 'amend_order', 'cancel_order', 'open_position', 'reduce_position',
  'close_position', 'transfer_asset', 'withdraw_asset', 'deposit_asset', 'borrow_asset',
  'change_margin_or_collateral', 'change_account_permissions', 'create_or_rotate_credential',
  'issue_or_revoke_mandate', 'modify_risk_budget',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwnData(record, key) {
  if (!isRecord(record)) return false
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  return Boolean(descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value'))
}

function readOwn(record, key) {
  return hasOwnData(record, key) ? record[key] : undefined
}

function parseIsoMs(value) {
  if (typeof value !== 'string') return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

function isOffsetDateTime(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    parseIsoMs(value) !== null
}

export function normalizeMarketObservation(fixture) {
  if (!isRecord(fixture) || !isRecord(readOwn(fixture, 'raw')) || !isRecord(readOwn(fixture, 'instrumentMap'))) {
    return Object.freeze({ qualityStatus: 'INVALID', reason: 'MALFORMED_FIXTURE', candidateEvaluable: false })
  }

  const raw = readOwn(fixture, 'raw')
  const instrumentMap = readOwn(fixture, 'instrumentMap')
  const instrumentKey = readOwn(raw, 'instrumentKey')
  const mapping = typeof instrumentKey === 'string' && instrumentKey.length > 0
    ? readOwn(instrumentMap, instrumentKey)
    : undefined

  // An instrument reference must come from an explicit mapping; never synthesize it from symbol fragments.
  if (!isRecord(mapping) ||
      typeof readOwn(mapping, 'instrumentRef') !== 'string' || !readOwn(mapping, 'instrumentRef') ||
      typeof readOwn(mapping, 'baseAssetRef') !== 'string' || !readOwn(mapping, 'baseAssetRef') ||
      typeof readOwn(mapping, 'quoteAssetRef') !== 'string' || !readOwn(mapping, 'quoteAssetRef')) {
    return Object.freeze({
      qualityStatus: 'INVALID',
      reason: 'INSTRUMENT_MAPPING_MISSING_OR_INCOMPLETE',
      candidateEvaluable: false,
      sourceSequence: readOwn(raw, 'sourceSequence') ?? null,
      rawInstrumentKey: instrumentKey ?? null,
    })
  }

  const profileId = readOwn(fixture, 'profileId')
  const normalizerVersion = readOwn(fixture, 'normalizerVersion')
  const sourceId = readOwn(raw, 'sourceId')
  const sourceSequence = readOwn(raw, 'sourceSequence')
  const sourceObservedAt = readOwn(raw, 'sourceObservedAt')
  const receivedAt = readOwn(fixture, 'receivedAt')
  if (typeof profileId !== 'string' || !profileId ||
      typeof normalizerVersion !== 'string' || !normalizerVersion ||
      typeof sourceId !== 'string' || !sourceId ||
      sourceSequence === undefined ||
      !isOffsetDateTime(sourceObservedAt) ||
      !isOffsetDateTime(receivedAt)) {
    return Object.freeze({
      qualityStatus: 'INCOMPLETE',
      reason: 'PROVENANCE_OR_TIMESTAMP_FIELD_MISSING_OR_INVALID',
      candidateEvaluable: false,
    })
  }
  if (!/^(0|[1-9][0-9]*)$/.test(String(sourceSequence))) {
    return Object.freeze({ qualityStatus: 'INVALID', reason: 'SOURCE_SEQUENCE_INVALID', candidateEvaluable: false })
  }

  for (const key of ['bidPrice', 'bidQuantity', 'askPrice', 'askQuantity']) {
    const value = readOwn(raw, key)
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) {
      return Object.freeze({ qualityStatus: 'INVALID', reason: `DECIMAL_INVALID:${key}`, candidateEvaluable: false })
    }
  }

  const sourceEventId = readOwn(raw, 'sourceEventId')
  if (sourceEventId !== undefined && sourceEventId !== null &&
      (typeof sourceEventId !== 'string' || !sourceEventId)) {
    return Object.freeze({ qualityStatus: 'INVALID', reason: 'SOURCE_EVENT_ID_INVALID', candidateEvaluable: false })
  }

  return Object.freeze({
    recordType: 'MarketObservationProjection',
    evidenceClass: 'DERIVED',
    qualityStatus: 'VALID',
    candidateEvaluable: true,
    profileId,
    normalizerVersion,
    sourceId,
    sourceSequence: String(sourceSequence),
    sourceObservedAt,
    receivedAt,
    instrumentKey,
    instrumentRef: readOwn(mapping, 'instrumentRef'),
    baseAssetRef: readOwn(mapping, 'baseAssetRef'),
    quoteAssetRef: readOwn(mapping, 'quoteAssetRef'),
    bidPrice: readOwn(raw, 'bidPrice'),
    bidQuantity: readOwn(raw, 'bidQuantity'),
    askPrice: readOwn(raw, 'askPrice'),
    askQuantity: readOwn(raw, 'askQuantity'),
    priceUnit: readOwn(mapping, 'quoteAssetRef'),
    quantityUnit: readOwn(mapping, 'baseAssetRef'),
    // This is the source's own event identifier, not a locally invented identifier.
    sourceEventReference: sourceEventId ?? null,
  })
}

export function classifyFreshness({ sourceObservedAt, receivedAt, maxAgeMs }) {
  const sourceMs = parseIsoMs(sourceObservedAt)
  const receivedMs = parseIsoMs(receivedAt)
  if (sourceMs === null || receivedMs === null || !Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0) {
    return Object.freeze({ qualityStatus: 'UNKNOWN', ageMs: null, reason: 'FRESHNESS_INPUT_UNVERIFIABLE', candidateEvaluable: false })
  }
  const ageMs = receivedMs - sourceMs
  if (ageMs < 0) {
    return Object.freeze({ qualityStatus: 'UNKNOWN', ageMs, reason: 'SOURCE_CLOCK_AHEAD_OF_RECEIPT', candidateEvaluable: false })
  }
  if (ageMs > maxAgeMs) {
    return Object.freeze({ qualityStatus: 'STALE', ageMs, reason: 'SOURCE_OBSERVATION_TOO_OLD', candidateEvaluable: false })
  }
  return Object.freeze({ qualityStatus: 'VALID', ageMs, reason: null, candidateEvaluable: true })
}

export function classifySequence({ lastAcceptedSequence, nextSequence }) {
  if (!Number.isSafeInteger(lastAcceptedSequence) || !Number.isSafeInteger(nextSequence) ||
      lastAcceptedSequence < 0 || nextSequence < 0) {
    return Object.freeze({ qualityStatus: 'UNKNOWN', missingSequence: null })
  }
  if (nextSequence <= lastAcceptedSequence) {
    return Object.freeze({ qualityStatus: 'CONFLICTED', missingSequence: null })
  }
  if (nextSequence === lastAcceptedSequence + 1) {
    return Object.freeze({ qualityStatus: 'VALID', missingSequence: null })
  }
  return Object.freeze({ qualityStatus: 'GAPPED', missingSequence: lastAcceptedSequence + 1 })
}

export function classifyConflictingObservations(observations) {
  if (!Array.isArray(observations) || observations.length === 0 ||
      observations.some((item) => !isRecord(item))) {
    return Object.freeze({ qualityStatus: 'UNKNOWN', preserveAll: false, preferredObservation: null })
  }
  const fingerprints = new Set(observations.map((item) => JSON.stringify({
    bidPrice: item.bidPrice ?? null,
    askPrice: item.askPrice ?? null,
    bidQuantity: item.bidQuantity ?? null,
    askQuantity: item.askQuantity ?? null,
  })))
  if (fingerprints.size > 1) {
    return Object.freeze({ qualityStatus: 'CONFLICTED', preserveAll: true, preferredObservation: null })
  }
  return Object.freeze({ qualityStatus: 'VALID', preserveAll: true, preferredObservation: 0 })
}

export function classifyAccountSnapshot(fixture) {
  if (!isRecord(fixture) || !Array.isArray(fixture.returnedCategories) ||
      !Array.isArray(fixture.requiredCategoriesForFixture)) {
    return Object.freeze({ qualityStatus: 'INVALID', unknownCategories: [], economicAdmissionAllowed: false })
  }
  const returned = new Set(fixture.returnedCategories)
  const missing = fixture.requiredCategoriesForFixture.filter((category) => !returned.has(category))
  return Object.freeze({
    recordType: 'AccountSnapshotQualityProjection',
    qualityStatus: missing.length ? 'INCOMPLETE' : 'VALID',
    unknownCategories: missing,
    economicAdmissionAllowed: false,
    observedBalances: Array.isArray(fixture.balances) ? fixture.balances : null,
    inferEmptyOrdersOrPositions: false,
    inferZeroExposure: false,
  })
}

function addDecimalStrings(left, right) {
  const parse = (value) => {
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) return null
    const [whole, fraction = ''] = value.split('.')
    return { integer: BigInt(whole + fraction), scale: fraction.length }
  }
  const a = parse(left)
  const b = parse(right)
  if (!a || !b) return null
  const scale = Math.max(a.scale, b.scale)
  const total = a.integer * 10n ** BigInt(scale - a.scale) + b.integer * 10n ** BigInt(scale - b.scale)
  const digits = total.toString().padStart(scale + 1, '0')
  if (scale === 0) return digits
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
}

function subtractDecimalStrings(left, right) {
  const parse = (value) => {
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) return null
    const [whole, fraction = ''] = value.split('.')
    return { integer: BigInt(whole + fraction), scale: fraction.length }
  }
  const a = parse(left)
  const b = parse(right)
  if (!a || !b) return null
  const scale = Math.max(a.scale, b.scale)
  const diff = a.integer * 10n ** BigInt(scale - a.scale) - b.integer * 10n ** BigInt(scale - b.scale)
  if (diff < 0n) return null
  const digits = diff.toString().padStart(scale + 1, '0')
  if (scale === 0) return digits
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
}

export function projectOrderLifecycle(events) {
  if (!Array.isArray(events) || events.length === 0 || events.some((event) => !isRecord(event))) {
    return Object.freeze({ qualityStatus: 'INVALID', orderStatus: 'UNKNOWN', fillCount: 0, filledQuantity: '0' })
  }
  const first = events[0]
  const orderId = first.orderId
  if (typeof orderId !== 'string' || !orderId) {
    return Object.freeze({ qualityStatus: 'INVALID', orderStatus: 'UNKNOWN', fillCount: 0, filledQuantity: '0' })
  }
  let accepted = false
  let cancelRequested = false
  let cancelConfirmed = false
  const fills = new Map()
  const anomalies = []

  for (const event of events) {
    if (event.orderId !== orderId) {
      anomalies.push('MIXED_ORDER_ID')
      continue
    }
    if (event.eventType === 'ORDER_ACCEPTED') accepted = true
    if (event.eventType === 'CANCEL_REQUEST_ACKNOWLEDGED') cancelRequested = true
    if (event.eventType === 'CANCEL_CONFIRMED') cancelConfirmed = true
    if (event.eventType === 'FILL') {
      if (typeof event.fillId !== 'string' || !event.fillId ||
          typeof event.quantity !== 'string' ||
          typeof event.rawDigestRef !== 'string' || !event.rawDigestRef) {
        anomalies.push('FILL_ID_QUANTITY_OR_RAW_DIGEST_MISSING')
        continue
      }
      const existing = fills.get(event.fillId)
      if (existing) {
        if (existing.quantity === event.quantity && existing.rawDigestRef === event.rawDigestRef) {
          continue
        }
        anomalies.push('FILL_ID_PAYLOAD_CONFLICT')
        continue
      }
      fills.set(event.fillId, { quantity: event.quantity, rawDigestRef: event.rawDigestRef })
      if (cancelConfirmed) anomalies.push('FILL_OBSERVED_AFTER_CANCEL_CONFIRMATION_REQUIRES_RECONCILIATION')
    }
  }

  let filledQuantity = '0'
  for (const fill of fills.values()) {
    const sum = addDecimalStrings(filledQuantity, fill.quantity)
    if (sum === null) anomalies.push('INVALID_FILL_QUANTITY')
    else filledQuantity = sum
  }

  let orderStatus = 'UNKNOWN'
  if (!accepted) orderStatus = 'UNVERIFIABLE'
  else if (cancelConfirmed) orderStatus = 'CANCELLED_WITH_RECONCILIATION_REQUIRED'
  else if (cancelRequested && fills.size > 0) orderStatus = 'CANCEL_PENDING_WITH_PARTIAL_FILL'
  else if (cancelRequested) orderStatus = 'CANCEL_PENDING'
  else if (fills.size > 0) orderStatus = 'PARTIALLY_FILLED'
  else orderStatus = 'WORKING'

  const qualityStatus = anomalies.length ? 'CONFLICTED' : (cancelRequested && !cancelConfirmed ? 'UNKNOWN' : 'VALID')
  return Object.freeze({
    recordType: 'OrderLifecycleProjection',
    evidenceClass: 'DERIVED',
    qualityStatus,
    orderId,
    orderStatus,
    fillCount: fills.size,
    filledQuantity,
    cancelRequestObserved: cancelRequested,
    cancelConfirmationObserved: cancelConfirmed,
    reservationReleased: false,
    settlementAsserted: false,
    anomalies,
  })
}

export function classifySimulationResult(simulation) {
  if (!isRecord(simulation) || typeof simulation.simulatedPnl !== 'string' || typeof simulation.modelVersion !== 'string') {
    return Object.freeze({ recordType: 'SimulationResult', qualityStatus: 'INVALID', realizedStateChanged: false })
  }
  return Object.freeze({
    recordType: 'SimulationResult',
    evidenceClass: 'SIMULATED',
    qualityStatus: 'VALID',
    simulatedPnl: simulation.simulatedPnl,
    currencyRef: simulation.currencyRef ?? null,
    modelVersion: simulation.modelVersion,
    realizedStateChanged: false,
    riskBudgetChanged: false,
    mandateChanged: false,
    externalSideEffectPerformed: false,
  })
}

export function validateCapabilityManifest(manifest) {
  if (!isRecord(manifest) || manifest.mode !== 'READ_ONLY_SIMULATION' ||
      !Array.isArray(manifest.capabilities) || !Array.isArray(manifest.forbiddenCapabilities) ||
      !Array.isArray(manifest.credentialClasses) || !Array.isArray(manifest.productionTradingEndpointAllowlist)) {
    return Object.freeze({ valid: false, reason: 'MANIFEST_MALFORMED' })
  }
  const unknown = manifest.capabilities.filter((capability) => !READ_ONLY_CAPABILITIES.has(capability))
  const forbiddenPresent = manifest.capabilities.filter((capability) => FORBIDDEN_CAPABILITIES.has(capability))
  const missingForbiddenDeclarations = [...FORBIDDEN_CAPABILITIES].filter((capability) => !manifest.forbiddenCapabilities.includes(capability))
  const valid = unknown.length === 0 && forbiddenPresent.length === 0 &&
    missingForbiddenDeclarations.length === 0 && manifest.credentialClasses.length === 0 &&
    manifest.productionTradingEndpointAllowlist.length === 0
  return Object.freeze({
    valid,
    reason: valid ? null : 'CAPABILITY_BOUNDARY_VIOLATION',
    unknownCapabilities: unknown,
    forbiddenCapabilitiesPresent: forbiddenPresent,
    forbiddenCapabilitiesUndeclared: missingForbiddenDeclarations,
    credentialClassesPresent: manifest.credentialClasses.length > 0,
    productionTradingEndpointsPresent: manifest.productionTradingEndpointAllowlist.length > 0,
  })
}

/**
 * Per-stream immutable event replay prototype.
 * The caller supplies events in the ReplayManifest's frozen order.
 * Sequence values are decimal strings. No wall-clock ordering is inferred.
 */
export function replayStream(input) {
  const streamId = isRecord(input) ? readOwn(input, 'streamId') : undefined
  const initialSequence = isRecord(input) ? readOwn(input, 'initialSequence') : undefined
  const events = isRecord(input) ? readOwn(input, 'events') : undefined
  if (typeof streamId !== 'string' || !streamId ||
      !/^(0|[1-9][0-9]*)$/.test(String(initialSequence)) || !Array.isArray(events)) {
    return Object.freeze({ status: 'INVALID_INPUT', applied: [], outcomes: [], activeEventIds: [], lastSequence: null })
  }

  let last = BigInt(initialSequence)
  const seenBySourceSequence = new Map()
  const applied = []
  const outcomes = []
  const activeEventIds = []
  const byEventId = new Map()
  const seenEventIds = new Map()
  let blocked = null

  for (const event of events) {
    if (!isRecord(event) || event.streamId !== streamId ||
        typeof event.eventId !== 'string' || !event.eventId ||
        typeof event.sourceId !== 'string' || !event.sourceId ||
        !/^(0|[1-9][0-9]*)$/.test(String(event.sequence)) ||
        typeof event.rawDigestRef !== 'string' || !event.rawDigestRef) {
      outcomes.push({ eventId: event?.eventId ?? null, classification: 'QUARANTINED', reason: 'EVENT_ENVELOPE_INVALID' })
      blocked ??= 'INVALID_INPUT'
      continue
    }

    const sequence = BigInt(event.sequence)
    // JSON tuple encoding avoids delimiter ambiguity in source identifiers.
    const identity = JSON.stringify([event.sourceId, event.streamId, sequence.toString()])
    const previousEventId = seenEventIds.get(event.eventId)
    if (previousEventId) {
      if (previousEventId.identity === identity && previousEventId.rawDigestRef === event.rawDigestRef) {
        outcomes.push({ eventId: event.eventId, classification: 'DUPLICATE_NO_OP', duplicateOf: previousEventId.eventId })
      } else {
        outcomes.push({
          eventId: event.eventId,
          classification: 'QUARANTINED',
          reason: 'EVENT_ID_REUSED_WITH_DIFFERENT_SOURCE_IDENTITY',
          previousSourceId: previousEventId.sourceId,
          previousSequence: previousEventId.sequence,
        })
        blocked = 'BLOCKED_CONFLICT'
      }
      continue
    }

    const previous = seenBySourceSequence.get(identity)
    if (previous) {
      outcomes.push({
        eventId: event.eventId,
        classification: 'QUARANTINED',
        reason: previous.rawDigestRef === event.rawDigestRef
          ? 'SAME_SOURCE_SEQUENCE_DIFFERENT_EVENT_ID'
          : 'SAME_SOURCE_SEQUENCE_DIFFERENT_DIGEST',
      })
      blocked = 'BLOCKED_CONFLICT'
      continue
    }
    seenBySourceSequence.set(identity, { eventId: event.eventId, rawDigestRef: event.rawDigestRef })
    seenEventIds.set(event.eventId, {
      identity,
      eventId: event.eventId,
      sourceId: event.sourceId,
      sequence: sequence.toString(),
      rawDigestRef: event.rawDigestRef,
    })

    if (blocked === 'BLOCKED_CONFLICT' || blocked === 'INVALID_INPUT') {
      outcomes.push({ eventId: event.eventId, classification: 'QUARANTINED', reason: 'STREAM_ALREADY_BLOCKED' })
      continue
    }

    if (sequence !== last + 1n) {
      outcomes.push({
        eventId: event.eventId,
        classification: 'GAP_BLOCKED',
        expectedSequence: (last + 1n).toString(),
        observedSequence: sequence.toString(),
      })
      blocked = 'BLOCKED_GAP'
      continue
    }

    const supersedesRef = event.supersedesRef ?? null
    if (supersedesRef !== null) {
      const prior = byEventId.get(supersedesRef)
      if (!prior || prior.streamId !== streamId) {
        outcomes.push({ eventId: event.eventId, classification: 'QUARANTINED', reason: 'CORRECTION_TARGET_UNKNOWN_OR_WRONG_STREAM' })
        blocked = 'BLOCKED_CONFLICT'
        continue
      }
      const activeIndex = activeEventIds.indexOf(supersedesRef)
      if (activeIndex < 0) {
        outcomes.push({
          eventId: event.eventId,
          classification: 'QUARANTINED',
          reason: 'CORRECTION_TARGET_NOT_ACTIVE',
          supersedesRef,
        })
        blocked = 'BLOCKED_CONFLICT'
        continue
      }
      activeEventIds.splice(activeIndex, 1)
      activeEventIds.push(event.eventId)
      outcomes.push({ eventId: event.eventId, classification: 'CORRECTION_APPLIED', supersedesRef })
    } else {
      activeEventIds.push(event.eventId)
      outcomes.push({ eventId: event.eventId, classification: 'APPLIED' })
    }

    applied.push(event.eventId)
    byEventId.set(event.eventId, { streamId, sequence: sequence.toString(), supersedesRef })
    last = sequence
  }

  const unresolved = blocked === 'BLOCKED_GAP' || blocked === 'BLOCKED_CONFLICT' || blocked === 'INVALID_INPUT'
  return Object.freeze({
    status: blocked ?? 'COMPLETE',
    applied,
    outcomes,
    activeEventIds,
    lastSequence: last.toString(),
    unresolved,
    authorityGranted: false,
    economicAdmissionGranted: false,
    externalSideEffectPerformed: false,
  })
}

export function compareReplayDeterminism(first, second) {
  // Structural equality for this fixture-only test helper; not a production digest/canonicalization scheme.
  return JSON.stringify(first) === JSON.stringify(second)
}

/**
 * Deterministic orchestration across independent streams.
 * Stream replay remains isolated; sorting result rows by streamId is presentation
 * canonicalization only and MUST NOT be interpreted as a causal/global event order.
 * No X1-X7 composition witness is consumed here, so multi-stream composition stays unresolved.
 */
export function replayStreams(input) {
  const streams = isRecord(input) ? readOwn(input, 'streams') : undefined
  if (!Array.isArray(streams) || streams.length === 0 || streams.some((stream) =>
    !isRecord(stream) || typeof stream.streamId !== 'string' || !stream.streamId ||
    !Array.isArray(stream.events) || !/^(0|[1-9][0-9]*)$/.test(String(stream.initialSequence)))) {
    return Object.freeze({
      recordType: 'MultiStreamReplayResult',
      status: 'INVALID_INPUT',
      streamResults: [],
      duplicateStreamIds: [],
      compositionStatus: 'UNVERIFIABLE',
      crossStreamOrdering: 'NOT_DECLARED',
      aggregateStateProduced: false,
      authorityGranted: false,
      economicAdmissionGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  const counts = new Map()
  for (const stream of streams) counts.set(stream.streamId, (counts.get(stream.streamId) ?? 0) + 1)
  const duplicateStreamIds = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([streamId]) => streamId)
    .sort()
  if (duplicateStreamIds.length) {
    return Object.freeze({
      recordType: 'MultiStreamReplayResult',
      status: 'INVALID_INPUT',
      streamResults: [],
      duplicateStreamIds,
      compositionStatus: 'UNVERIFIABLE',
      crossStreamOrdering: 'NOT_DECLARED',
      aggregateStateProduced: false,
      authorityGranted: false,
      economicAdmissionGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  // Stable result presentation, not an ordering relation between the events.
  const orderedStreams = [...streams].sort((left, right) =>
    left.streamId < right.streamId ? -1 : left.streamId > right.streamId ? 1 : 0)
  const streamResults = orderedStreams.map((stream) => ({
    streamId: stream.streamId,
    result: replayStream({
      streamId: stream.streamId,
      initialSequence: stream.initialSequence,
      events: stream.events,
    }),
  }))
  const unresolvedStreamIds = streamResults
    .filter(({ result }) => result.unresolved === true || result.status !== 'COMPLETE')
    .map(({ streamId }) => streamId)

  return Object.freeze({
    recordType: 'MultiStreamReplayResult',
    status: unresolvedStreamIds.length ? 'PARTIAL_UNRESOLVED' : 'COMPLETE',
    streamResults,
    duplicateStreamIds: [],
    unresolvedStreamIds,
    compositionStatus: streams.length > 1 ? 'COMPOSITION_UNRESOLVED' : 'NOT_REQUIRED_SINGLE_STREAM',
    crossStreamOrdering: 'NOT_DECLARED',
    causalOrderDerived: false,
    aggregateStateProduced: false,
    authorityGranted: false,
    economicAdmissionGranted: false,
    externalSideEffectPerformed: false,
  })
}

/**
 * Preserve gross typed exposure records without computing a scalar total,
 * offsetting obligations, converting assets or rewriting obligation ownership.
 * This is an S1 evidence classifier, not an economic admission predicate.
 */
export function classifyOpenExposureSet(input) {
  if (!isRecord(input) || input.recordType !== 'OpenExposureSet' || !Array.isArray(input.items)) {
    return Object.freeze({
      recordType: 'OpenExposureProjection',
      qualityStatus: 'INVALID',
      reason: 'EXPOSURE_SET_MALFORMED',
      grossItems: [],
      compositionStatus: 'UNVERIFIABLE',
      nettingStatus: 'NOT_EVALUATED',
      aggregateQuantity: null,
      aggregateValue: null,
      economicAdmissionGranted: false,
      authorityGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  if (input.items.length === 0) {
    return Object.freeze({
      recordType: 'OpenExposureProjection',
      qualityStatus: 'INCOMPLETE',
      reason: 'NO_EXPOSURE_RECORDS_PROVIDED',
      grossItems: [],
      compositionStatus: 'UNVERIFIABLE',
      nettingStatus: 'NOT_EVALUATED',
      aggregateQuantity: null,
      aggregateValue: null,
      zeroExposureInferred: false,
      economicAdmissionGranted: false,
      authorityGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  const required = ['recordRef', 'category', 'assetRef', 'unitRef', 'scopeRef', 'horizonRef', 'status']
  const grossItems = []
  const invalidIndexes = []
  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index]
    if (!isRecord(item) || required.some((key) => typeof readOwn(item, key) !== 'string' || !readOwn(item, key))) {
      invalidIndexes.push(index)
      continue
    }
    const observationRefs = readOwn(item, 'observationRefs')
    if (!Array.isArray(observationRefs) ||
        observationRefs.length === 0 ||
        observationRefs.some((ref) => typeof ref !== 'string' || !ref) ||
        new Set(observationRefs).size !== observationRefs.length) {
      invalidIndexes.push(index)
      continue
    }
    if (readOwn(item, 'grossQuantity') !== undefined &&
        (typeof readOwn(item, 'grossQuantity') !== 'string' ||
         !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(readOwn(item, 'grossQuantity')))) {
      invalidIndexes.push(index)
      continue
    }
    grossItems.push({
      recordRef: item.recordRef,
      category: item.category,
      assetRef: item.assetRef,
      unitRef: item.unitRef,
      scopeRef: item.scopeRef,
      horizonRef: item.horizonRef,
      status: item.status,
      observationRefs: [...observationRefs],
      grossQuantity: item.grossQuantity ?? null,
      obligationRef: item.obligationRef ?? null,
      principalRef: item.principalRef ?? null,
    })
  }

  if (invalidIndexes.length) {
    return Object.freeze({
      recordType: 'OpenExposureProjection',
      qualityStatus: 'INVALID',
      reason: 'EXPOSURE_ITEM_INVALID',
      invalidIndexes,
      grossItems,
      compositionStatus: 'UNVERIFIABLE',
      nettingStatus: 'NOT_EVALUATED',
      aggregateQuantity: null,
      aggregateValue: null,
      economicAdmissionGranted: false,
      authorityGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  const duplicateRefs = [...new Set(grossItems
    .map((item) => item.recordRef)
    .filter((recordRef, index, refs) => refs.indexOf(recordRef) !== index))].sort()
  if (duplicateRefs.length) {
    return Object.freeze({
      recordType: 'OpenExposureProjection',
      qualityStatus: 'CONFLICTED',
      reason: 'DUPLICATE_EXPOSURE_RECORD_REFERENCE',
      duplicateRefs,
      grossItems,
      compositionStatus: 'UNVERIFIABLE',
      nettingStatus: 'NOT_EVALUATED',
      aggregateQuantity: null,
      aggregateValue: null,
      economicAdmissionGranted: false,
      authorityGranted: false,
      externalSideEffectPerformed: false,
    })
  }

  return Object.freeze({
    recordType: 'OpenExposureProjection',
    qualityStatus: 'VALID',
    grossItems,
    compositionStatus: grossItems.length > 1 ? 'COMPOSITION_UNRESOLVED' : 'SINGLE_ENTRY_NO_AGGREGATION',
    nettingStatus: 'NOT_EVALUATED',
    nettingApplied: false,
    obligationTransferApplied: false,
    aggregateQuantity: null,
    aggregateValue: null,
    zeroExposureInferred: false,
    economicAdmissionGranted: false,
    authorityGranted: false,
    externalSideEffectPerformed: false,
  })
}

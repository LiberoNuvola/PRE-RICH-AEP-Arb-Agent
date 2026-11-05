/**
 * Narrow adapter from a MATCHED provider trade reconciliation to one lifecycle FILL.
 * Original ObservationRecord references and raw digests remain individually bound.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value) {
  return typeof value === 'string' && value.length > 0
}

export function toOrderLifecycleFillEvent(matchedGroup) {
  if (!isRecord(matchedGroup)) {
    return Object.freeze({ adapterStatus: 'INVALID', event: null, reason: 'RECONCILIATION_GROUP_MALFORMED' })
  }
  if (matchedGroup.status !== 'MATCHED') {
    const adapterStatus = matchedGroup.status === 'CONFLICTED' ? 'CONFLICTED' : 'INCOMPLETE'
    return Object.freeze({ adapterStatus, event: null, reason: 'RECONCILIATION_GROUP_NOT_MATCHED' })
  }

  const projection = matchedGroup.projection
  if (!isRecord(projection) ||
      projection.recordType !== 'ReconciledTradeFactProjection' ||
      projection.factType !== 'TRADE_EXECUTION' ||
      !nonEmpty(matchedGroup.reconciliationKey) ||
      projection.reconciliationKey !== matchedGroup.reconciliationKey ||
      !nonEmpty(projection.profileRef) ||
      !nonEmpty(projection.profileVersion) ||
      !nonEmpty(projection.accountScopeRef) ||
      !nonEmpty(projection.symbol) ||
      !nonEmpty(projection.tradeId) ||
      !nonEmpty(projection.orderId) ||
      !isRecord(projection.comparableValues) ||
      !nonEmpty(projection.comparableValues.quantity) ||
      !Array.isArray(projection.sourceEvidenceBindings) ||
      projection.sourceEvidenceBindings.length < 2) {
    return Object.freeze({ adapterStatus: 'INVALID', event: null, reason: 'MATCHED_TRADE_PROJECTION_INCOMPLETE' })
  }

  const refs = new Set()
  const channels = new Set()
  const sources = new Set()
  const sourceEvidenceBindings = []
  for (const entry of projection.sourceEvidenceBindings) {
    if (!isRecord(entry) ||
        !['observationRef', 'sourceReference', 'streamReference', 'sourceOperationReference', 'sourceChannel', 'rawDigestRef']
          .every((key) => nonEmpty(entry[key])) ||
        (entry.sourceEventReference !== null && !nonEmpty(entry.sourceEventReference))) {
      return Object.freeze({ adapterStatus: 'INVALID', event: null, reason: 'SOURCE_EVIDENCE_BINDING_INCOMPLETE' })
    }
    if (refs.has(entry.observationRef)) {
      return Object.freeze({ adapterStatus: 'INVALID', event: null, reason: 'DUPLICATE_OBSERVATION_REFERENCE' })
    }
    refs.add(entry.observationRef)
    channels.add(entry.sourceChannel)
    sources.add(entry.sourceReference)
    sourceEvidenceBindings.push(Object.freeze({
      observationRef: entry.observationRef,
      sourceReference: entry.sourceReference,
      streamReference: entry.streamReference,
      sourceEventReference: entry.sourceEventReference,
      sourceOperationReference: entry.sourceOperationReference,
      sourceChannel: entry.sourceChannel,
      rawDigestRef: entry.rawDigestRef,
    }))
  }
  if (channels.size < 2 || sources.size < 2) {
    return Object.freeze({ adapterStatus: 'INVALID', event: null, reason: 'DISTINCT_SOURCE_CHANNELS_REQUIRED' })
  }
  sourceEvidenceBindings.sort((left, right) =>
    left.observationRef < right.observationRef ? -1 : left.observationRef > right.observationRef ? 1 : 0)

  const evidenceBinding = Object.freeze({
    recordType: 'ReconciledTradeEvidenceBinding',
    bindingVersion: '0.1',
    reconciliationStatus: 'MATCHED',
    reconciliationKey: matchedGroup.reconciliationKey,
    profileRef: projection.profileRef,
    profileVersion: projection.profileVersion,
    accountScopeRef: projection.accountScopeRef,
    symbol: projection.symbol,
    tradeId: projection.tradeId,
    orderId: projection.orderId,
    quantity: projection.comparableValues.quantity,
    sourceOperationMappingStatus: projection.sourceOperationMappingStatus,
    sourceEvidenceBindings: Object.freeze(sourceEvidenceBindings),
  })

  return Object.freeze({
    adapterStatus: 'READY',
    event: Object.freeze({
      eventType: 'FILL',
      orderId: projection.orderId,
      fillId: projection.tradeId,
      quantity: projection.comparableValues.quantity,
      evidenceBinding,
    }),
    rawDigestCollapsed: false,
    sourceObservationCount: sourceEvidenceBindings.length,
    authorityGranted: false,
    economicAdmissionGranted: false,
    externalSideEffectPerformed: false,
  })
}

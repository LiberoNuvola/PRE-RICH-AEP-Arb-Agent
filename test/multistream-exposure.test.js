import test from 'node:test'
import assert from 'node:assert/strict'
import { replayStream, replayStreams, classifyOpenExposureSet, compareReplayDeterminism } from '../src/reducer.js'

function event(streamId, sourceId, sequence, eventId, rawDigestRef, extras = {}) {
  return { streamId, sourceId, sequence: String(sequence), eventId, rawDigestRef, supersedesRef: null, ...extras }
}

test('multi-stream replay keeps independent cursors and stable presentation without global order', () => {
  const input = {
    streams: [
      { streamId: 'stream:B', initialSequence: '8', events: [event('stream:B', 'source:B', 9, 'event:B9', 'digest:B9')] },
      { streamId: 'stream:A', initialSequence: '40', events: [event('stream:A', 'source:A', 41, 'event:A41', 'digest:A41')] },
    ],
  }
  const first = replayStreams(input)
  const second = replayStreams(input)
  assert.equal(first.status, 'COMPLETE')
  assert.deepEqual(first.streamResults.map((entry) => entry.streamId), ['stream:A', 'stream:B'])
  assert.deepEqual(first.streamResults.map((entry) => entry.result.lastSequence), ['41', '9'])
  assert.equal(first.compositionStatus, 'COMPOSITION_UNRESOLVED')
  assert.equal(first.crossStreamOrdering, 'NOT_DECLARED')
  assert.equal(first.causalOrderDerived, false)
  assert.equal('globalOrder' in first, false)
  assert.equal(first.aggregateStateProduced, false)
  assert.equal(compareReplayDeterminism(first, second), true)
})

test('a gap in one stream does not discard accepted evidence from another stream', () => {
  const result = replayStreams({
    streams: [
      { streamId: 'stream:healthy', initialSequence: '0', events: [event('stream:healthy', 'source:healthy', 1, 'event:healthy:1', 'digest:healthy:1')] },
      { streamId: 'stream:gapped', initialSequence: '5', events: [event('stream:gapped', 'source:gapped', 7, 'event:gapped:7', 'digest:gapped:7')] },
    ],
  })
  const healthy = result.streamResults.find((entry) => entry.streamId === 'stream:healthy')
  const gapped = result.streamResults.find((entry) => entry.streamId === 'stream:gapped')
  assert.equal(result.status, 'PARTIAL_UNRESOLVED')
  assert.equal(healthy.result.status, 'COMPLETE')
  assert.deepEqual(healthy.result.applied, ['event:healthy:1'])
  assert.equal(gapped.result.status, 'BLOCKED_GAP')
  assert.deepEqual(result.unresolvedStreamIds, ['stream:gapped'])
})

test('event ID reuse at a different source sequence is quarantined without overwriting lineage', () => {
  const result = replayStream({
    streamId: 'stream:event-id',
    initialSequence: '0',
    events: [
      event('stream:event-id', 'source:event-id', 1, 'event:reused', 'digest:first'),
      event('stream:event-id', 'source:event-id', 2, 'event:reused', 'digest:second'),
    ],
  })
  assert.equal(result.status, 'BLOCKED_CONFLICT')
  assert.deepEqual(result.applied, ['event:reused'])
  assert.deepEqual(result.activeEventIds, ['event:reused'])
  assert.equal(result.outcomes[1].classification, 'QUARANTINED')
  assert.equal(result.outcomes[1].reason, 'EVENT_ID_REUSED_WITH_DIFFERENT_SOURCE_IDENTITY')
  assert.equal(result.lastSequence, '1')
  assert.equal(result.authorityGranted, false)
})

test('duplicate stream declarations fail closed instead of merging cursors', () => {
  const result = replayStreams({
    streams: [
      { streamId: 'stream:same', initialSequence: '0', events: [] },
      { streamId: 'stream:same', initialSequence: '4', events: [] },
    ],
  })
  assert.equal(result.status, 'INVALID_INPUT')
  assert.deepEqual(result.duplicateStreamIds, ['stream:same'])
  assert.equal(result.aggregateStateProduced, false)
})

test('malformed stream input cannot create a partial replay', () => {
  const result = replayStreams({ streams: [{ streamId: 'stream:x', initialSequence: 'not-a-number', events: [] }] })
  assert.equal(result.status, 'INVALID_INPUT')
  assert.equal(result.streamResults.length, 0)
})

const exposureOne = {
  recordRef: 'fixture:exposure:position:AAA', category: 'REALIZED_POSITION',
  assetRef: 'fixture:asset:AAA', unitRef: 'fixture:unit:AAA', scopeRef: 'fixture:scope:principal-1',
  horizonRef: 'fixture:horizon:current', status: 'OPEN', evidenceRef: 'fixture:evidence:position-1',
  grossQuantity: '2.500', principalRef: 'fixture:principal:1',
}
const exposureTwo = {
  recordRef: 'fixture:exposure:obligation:USDX', category: 'ECONOMIC_OBLIGATION',
  assetRef: 'fixture:asset:USDX', unitRef: 'fixture:unit:USDX', scopeRef: 'fixture:scope:principal-1',
  horizonRef: 'fixture:horizon:settlement-1', status: 'PENDING', evidenceRef: 'fixture:evidence:obligation-1',
  grossQuantity: '25.00', obligationRef: 'fixture:obligation:1', principalRef: 'fixture:principal:1',
}

test('OpenExposure keeps gross typed entries distinct and never creates a scalar aggregate', () => {
  const result = classifyOpenExposureSet({ recordType: 'OpenExposureSet', items: [exposureOne, exposureTwo] })
  assert.equal(result.qualityStatus, 'VALID')
  assert.equal(result.grossItems.length, 2)
  assert.equal(result.grossItems[0].grossQuantity, '2.500')
  assert.equal(result.grossItems[1].grossQuantity, '25.00')
  assert.equal(result.grossItems[0].unitRef, 'fixture:unit:AAA')
  assert.equal(result.grossItems[1].unitRef, 'fixture:unit:USDX')
  assert.equal(result.compositionStatus, 'COMPOSITION_UNRESOLVED')
  assert.equal(result.nettingStatus, 'NOT_EVALUATED')
  assert.equal(result.nettingApplied, false)
  assert.equal(result.obligationTransferApplied, false)
  assert.equal(result.aggregateQuantity, null)
  assert.equal(result.aggregateValue, null)
  assert.equal(result.economicAdmissionGranted, false)
  assert.equal(result.authorityGranted, false)
})

test('empty exposure input does not mean zero exposure', () => {
  const result = classifyOpenExposureSet({ recordType: 'OpenExposureSet', items: [] })
  assert.equal(result.qualityStatus, 'INCOMPLETE')
  assert.equal(result.zeroExposureInferred, false)
  assert.equal(result.aggregateQuantity, null)
  assert.equal(result.aggregateValue, null)
})

test('duplicate exposure references are conflicted and not silently deduplicated', () => {
  const result = classifyOpenExposureSet({ recordType: 'OpenExposureSet', items: [exposureOne, exposureOne] })
  assert.equal(result.qualityStatus, 'CONFLICTED')
  assert.deepEqual(result.duplicateRefs, ['fixture:exposure:position:AAA'])
  assert.equal(result.grossItems.length, 2)
  assert.equal(result.aggregateQuantity, null)
})

test('invalid gross quantity is rejected without numeric coercion', () => {
  const result = classifyOpenExposureSet({
    recordType: 'OpenExposureSet',
    items: [{ ...exposureOne, grossQuantity: '2,5' }],
  })
  assert.equal(result.qualityStatus, 'INVALID')
  assert.deepEqual(result.invalidIndexes, [0])
  assert.equal(result.aggregateQuantity, null)
})

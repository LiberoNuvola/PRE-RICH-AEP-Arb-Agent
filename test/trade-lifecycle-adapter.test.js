import test from 'node:test'
import assert from 'node:assert/strict'
import { projectOrderLifecycle } from '../src/reducer.js'
import { reconcileTradeObservationCandidates } from '../src/trade-observation-reconciler.js'
import { toOrderLifecycleFillEvent } from '../src/trade-lifecycle-adapter.js'

function candidate(channel, observationRef, overrides = {}) {
  const isStream = channel === 'STREAM'
  return {
    observationRef,
    rawDigestRef: 'sha256:raw:' + observationRef,
    profileRef: 'fixture:binance-spot-profile',
    profileVersion: '0.1-candidate',
    sourceId: isStream ? 'fixture:binance-user-stream' : 'fixture:binance-rest',
    streamId: isStream ? 'fixture:account-stream:1' : 'fixture:collection-run:1',
    sourceEventId: isStream ? 'fixture:execution-id:7001' : null,
    sourceOperationRef: isStream ? 'fixture:binance:executionReport' : 'fixture:binance:myTrades',
    sourceChannel: channel,
    sourceFactType: 'TRADE_EXECUTION',
    accountScopeRef: 'fixture:account-scope:1',
    symbol: 'AAAUSDX',
    tradeId: '7001',
    orderId: '9001',
    quantity: '2.500',
    price: '10.25',
    quoteQuantity: '25.625',
    commissionAmount: '0.025',
    commissionAsset: 'AAA',
    correctionRef: null,
    ...overrides,
  }
}

function matchedGroup(overrides = {}) {
  return reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:rest:1', overrides.rest),
    candidate('STREAM', 'fixture:obs:stream:1', overrides.stream),
  ]).groups[0]
}

test('adapter emits one FILL with a multi-observation binding and no synthetic rawDigestRef', () => {
  const adapted = toOrderLifecycleFillEvent(matchedGroup())
  assert.equal(adapted.adapterStatus, 'READY')
  assert.equal(adapted.rawDigestCollapsed, false)
  assert.equal(adapted.sourceObservationCount, 2)
  assert.equal(adapted.event.rawDigestRef, undefined)
  assert.equal(adapted.event.evidenceBinding.recordType, 'ReconciledTradeEvidenceBinding')
  assert.deepEqual(
    adapted.event.evidenceBinding.sourceEvidenceBindings.map((entry) => entry.rawDigestRef).sort(),
    ['sha256:raw:fixture:obs:rest:1', 'sha256:raw:fixture:obs:stream:1'].sort(),
  )
})

test('lifecycle accepts one matched trade projection and exact replay is a no-op', () => {
  const adapted = toOrderLifecycleFillEvent(matchedGroup())
  const result = projectOrderLifecycle([
    { eventType: 'ORDER_ACCEPTED', orderId: '9001' },
    adapted.event,
    {...adapted.event, evidenceBinding: {
      ...adapted.event.evidenceBinding,
      sourceEvidenceBindings: [...adapted.event.evidenceBinding.sourceEvidenceBindings].reverse(),
    }},
  ])
  assert.equal(result.qualityStatus, 'VALID')
  assert.equal(result.fillCount, 1)
  assert.equal(result.filledQuantity, '2.5')
  assert.equal(result.fillEvidence[0].evidenceMode, 'RECONCILED_OBSERVATION_SET')
  assert.equal(result.fillEvidence[0].evidenceBinding.sourceEvidenceBindings.length, 2)
  assert.equal(result.settlementAsserted, false)
})

test('same fill identity with one changed source digest conflicts instead of collapsing evidence', () => {
  const original = toOrderLifecycleFillEvent(matchedGroup()).event
  const changed = toOrderLifecycleFillEvent(matchedGroup({
    stream: {rawDigestRef: 'sha256:raw:changed-stream-payload'},
  })).event
  const result = projectOrderLifecycle([
    { eventType: 'ORDER_ACCEPTED', orderId: '9001' },
    original,
    changed,
  ])
  assert.equal(result.qualityStatus, 'CONFLICTED')
  assert.equal(result.fillCount, 1)
  assert.ok(result.anomalies.includes('FILL_ID_PAYLOAD_CONFLICT'))
})

test('lifecycle rejects ambiguous raw digest plus reconciled binding', () => {
  const adapted = toOrderLifecycleFillEvent(matchedGroup()).event
  const result = projectOrderLifecycle([
    {eventType: 'ORDER_ACCEPTED', orderId: '9001'},
    {...adapted, rawDigestRef: 'sha256:invented-or-selected'},
  ])
  assert.equal(result.qualityStatus, 'CONFLICTED')
  assert.equal(result.fillCount, 0)
  assert.ok(result.anomalies.includes('FILL_RECONCILIATION_BINDING_INVALID'))
})

test('lifecycle rejects incomplete or duplicate source evidence bindings', () => {
  const adapted = toOrderLifecycleFillEvent(matchedGroup()).event
  const missing = structuredClone(adapted)
  missing.evidenceBinding.sourceEvidenceBindings[0].rawDigestRef = ''
  const duplicate = structuredClone(adapted)
  duplicate.evidenceBinding.sourceEvidenceBindings[1].observationRef =
    duplicate.evidenceBinding.sourceEvidenceBindings[0].observationRef
  const first = projectOrderLifecycle([{eventType: 'ORDER_ACCEPTED', orderId: '9001'}, missing])
  const second = projectOrderLifecycle([{eventType: 'ORDER_ACCEPTED', orderId: '9001'}, duplicate])
  assert.equal(first.qualityStatus, 'CONFLICTED')
  assert.equal(second.qualityStatus, 'CONFLICTED')
  assert.equal(first.fillCount, 0)
  assert.equal(second.fillCount, 0)
})

test('adapter refuses INCOMPLETE and CONFLICTED reconciliation groups', () => {
  const incomplete = reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:rest:only'),
  ]).groups[0]
  assert.equal(toOrderLifecycleFillEvent(incomplete).adapterStatus, 'INCOMPLETE')
  assert.equal(toOrderLifecycleFillEvent({
    ...matchedGroup(),
    status: 'CONFLICTED',
    projection: null,
  }).adapterStatus, 'CONFLICTED')
})

test('legacy rawDigestRef fill replay and conflict rules remain unchanged', () => {
  const replay = projectOrderLifecycle([
    {eventType: 'ORDER_ACCEPTED', orderId: '9001'},
    {eventType: 'FILL', orderId: '9001', fillId: 'legacy-fill', quantity: '1.00', rawDigestRef: 'sha256:legacy'},
    {eventType: 'FILL', orderId: '9001', fillId: 'legacy-fill', quantity: '1.00', rawDigestRef: 'sha256:legacy'},
  ])
  assert.equal(replay.qualityStatus, 'VALID')
  assert.equal(replay.fillCount, 1)

  const changed = projectOrderLifecycle([
    {eventType: 'ORDER_ACCEPTED', orderId: '9001'},
    {eventType: 'FILL', orderId: '9001', fillId: 'legacy-fill', quantity: '1.00', rawDigestRef: 'sha256:legacy'},
    {eventType: 'FILL', orderId: '9001', fillId: 'legacy-fill', quantity: '1.00', rawDigestRef: 'sha256:changed'},
  ])
  assert.equal(changed.qualityStatus, 'CONFLICTED')
  assert.equal(changed.fillCount, 1)
})

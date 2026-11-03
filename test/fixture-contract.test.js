import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  normalizeMarketObservation,
  classifyFreshness,
  classifySequence,
  classifyConflictingObservations,
  classifyAccountSnapshot,
  projectOrderLifecycle,
  classifySimulationResult,
  validateCapabilityManifest,
} from '../src/reducer.js'

const pack = JSON.parse(await readFile(new URL('../fixtures/arb-s1-fixture.v0.1.json', import.meta.url), 'utf8'))
const byId = new Map(pack.fixtures.map((fixture) => [fixture.id, fixture]))

test('S1-F01 normalizes a mapped market observation', () => {
  const result = normalizeMarketObservation(byId.get('S1-F01'))
  assert.equal(result.qualityStatus, 'VALID')
  assert.equal(result.baseAssetRef, 'fixture:asset:AAA')
  assert.equal(result.quoteAssetRef, 'fixture:asset:USDX')
  assert.equal(result.candidateEvaluable, true)
})

test('S1-F02 rejects an unmapped instrument without symbol inference', () => {
  const result = normalizeMarketObservation(byId.get('S1-F02'))
  assert.equal(result.qualityStatus, 'INVALID')
  assert.equal(result.reason, 'INSTRUMENT_MAPPING_MISSING')
  assert.equal(result.candidateEvaluable, false)
})

test('S1-F03 freshness uses the explicitly supplied fixture limit', () => {
  const fixture = byId.get('S1-F03')
  const result = classifyFreshness({ ...fixture, maxAgeMs: fixture.fixtureMaxAgeMs })
  assert.equal(result.qualityStatus, 'STALE')
  assert.equal(result.ageMs, 3000)
})

test('freshness with missing timestamps is unknown, not fresh', () => {
  const result = classifyFreshness({ sourceObservedAt: null, receivedAt: null, maxAgeMs: 1000 })
  assert.equal(result.qualityStatus, 'UNKNOWN')
  assert.equal(result.candidateEvaluable, false)
})

test('freshness accepts an observation within the supplied bound', () => {
  const result = classifyFreshness({
    sourceObservedAt: '2026-11-03T12:00:00.000Z',
    receivedAt: '2026-11-03T12:00:00.500Z',
    maxAgeMs: 1000,
  })
  assert.equal(result.qualityStatus, 'VALID')
  assert.equal(result.ageMs, 500)
})

test('sequence classifier accepts the next contiguous sequence', () => {
  assert.deepEqual(classifySequence({ lastAcceptedSequence: 41, nextSequence: 42 }), {
    qualityStatus: 'VALID', missingSequence: null,
  })
})

test('sequence classifier reports the first missing sequence', () => {
  const fixture = byId.get('S1-F04')
  const result = classifySequence({
    lastAcceptedSequence: fixture.lastAcceptedSequence,
    nextSequence: fixture.nextSequence,
  })
  assert.equal(result.qualityStatus, 'GAPPED')
  assert.equal(result.missingSequence, 42)
})

test('sequence classifier treats old or repeated sequence as conflicted', () => {
  const result = classifySequence({ lastAcceptedSequence: 8, nextSequence: 8 })
  assert.equal(result.qualityStatus, 'CONFLICTED')
})

test('conflicting observations are preserved without receipt-time preference', () => {
  const fixture = byId.get('S1-F05')
  const result = classifyConflictingObservations(fixture.observations)
  assert.equal(result.qualityStatus, 'CONFLICTED')
  assert.equal(result.preserveAll, true)
  assert.equal(result.preferredObservation, null)
})

test('identical repeated observations can be retained as equivalent evidence', () => {
  const item = { bidPrice: '1.00', askPrice: '1.01', bidQuantity: '2', askQuantity: '3' }
  const result = classifyConflictingObservations([item, { ...item }])
  assert.equal(result.qualityStatus, 'VALID')
  assert.equal(result.preserveAll, true)
})

test('S1-F06 leaves unreturned account categories unknown', () => {
  const fixture = byId.get('S1-F06')
  const result = classifyAccountSnapshot({
    returnedCategories: fixture.returnedCategories,
    requiredCategoriesForFixture: fixture.requiredCategoriesForFixture,
    balances: fixture.balances,
  })
  assert.equal(result.qualityStatus, 'INCOMPLETE')
  assert.deepEqual(result.unknownCategories, ['openOrders', 'positions', 'liabilities'])
  assert.equal(result.inferZeroExposure, false)
})

test('account snapshot is complete only when all required categories are returned', () => {
  const result = classifyAccountSnapshot({
    returnedCategories: ['balances', 'openOrders', 'positions', 'liabilities'],
    requiredCategoriesForFixture: ['balances', 'openOrders', 'positions', 'liabilities'],
    balances: [],
  })
  assert.equal(result.qualityStatus, 'VALID')
  assert.deepEqual(result.unknownCategories, [])
})

test('S1-F07 preserves a partial fill and non-terminal cancel request', () => {
  const result = projectOrderLifecycle(byId.get('S1-F07').events)
  assert.equal(result.orderStatus, 'CANCEL_PENDING_WITH_PARTIAL_FILL')
  assert.equal(result.filledQuantity, '2.000')
  assert.equal(result.reservationReleased, false)
  assert.equal(result.settlementAsserted, false)
})

test('duplicate fill identity is counted only once', () => {
  const result = projectOrderLifecycle([
    { eventType: 'ORDER_ACCEPTED', orderId: 'order:1', quantity: '4.000' },
    { eventType: 'FILL', orderId: 'order:1', fillId: 'fill:1', quantity: '1.000' },
    { eventType: 'FILL', orderId: 'order:1', fillId: 'fill:1', quantity: '1.000' },
  ])
  assert.equal(result.fillCount, 1)
  assert.equal(result.filledQuantity, '1.000')
})

test('late fill after terminal cancel is retained and flagged for reconciliation', () => {
  const result = projectOrderLifecycle([
    { eventType: 'ORDER_ACCEPTED', orderId: 'order:1', quantity: '3.000' },
    { eventType: 'CANCEL_CONFIRMED', orderId: 'order:1' },
    { eventType: 'FILL', orderId: 'order:1', fillId: 'fill:late', quantity: '1.000' },
  ])
  assert.equal(result.filledQuantity, '1.000')
  assert.equal(result.qualityStatus, 'CONFLICTED')
  assert.equal(result.reservationReleased, false)
  assert.ok(result.anomalies.includes('FILL_OBSERVED_AFTER_CANCEL_CONFIRMATION_REQUIRES_RECONCILIATION'))
})

test('S1-F08 simulation remains distinct from realized state and admission', () => {
  const result = classifySimulationResult(byId.get('S1-F08').simulation)
  assert.equal(result.evidenceClass, 'SIMULATED')
  assert.equal(result.realizedStateChanged, false)
  assert.equal(result.riskBudgetChanged, false)
  assert.equal(result.mandateChanged, false)
  assert.equal(result.externalSideEffectPerformed, false)
})

test('S1-F09 allows only the declared read-only capability manifest', () => {
  const fixture = byId.get('S1-F09')
  const result = validateCapabilityManifest({
    mode: fixture.mode,
    capabilities: fixture.capabilities,
    forbiddenCapabilities: fixture.forbiddenCapabilities,
    credentialClasses: fixture.credentialClasses,
    productionTradingEndpointAllowlist: fixture.productionTradingEndpointAllowlist,
  })
  assert.equal(result.valid, true)
})

test('capability boundary rejects mutating permissions and credential classes', () => {
  const fixture = byId.get('S1-F09')
  const result = validateCapabilityManifest({
    mode: fixture.mode,
    capabilities: [...fixture.capabilities, 'submit_order'],
    forbiddenCapabilities: fixture.forbiddenCapabilities,
    credentialClasses: ['write-api-key'],
    productionTradingEndpointAllowlist: [],
  })
  assert.equal(result.valid, false)
})

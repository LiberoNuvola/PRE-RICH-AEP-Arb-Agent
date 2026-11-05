import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileTradeObservationCandidates } from '../src/trade-observation-reconciler.js'

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

function pair(overrides = {}) {
  return [
    candidate('REST', 'fixture:obs:rest:1', overrides.rest),
    candidate('STREAM', 'fixture:obs:stream:1', overrides.stream),
  ]
}

test('same scoped trade across REST and stream matches despite different raw digests', () => {
  const result = reconcileTradeObservationCandidates(pair())
  assert.equal(result.reconciliationStatus, 'MATCHED')
  assert.equal(result.groups.length, 1)
  const group = result.groups[0]
  assert.equal(group.status, 'MATCHED')
  assert.deepEqual(group.projection.observationRefs, ['fixture:obs:rest:1', 'fixture:obs:stream:1'])
  assert.notEqual(
    pair()[0].rawDigestRef,
    pair()[1].rawDigestRef,
  )
  assert.equal(group.projection.comparableValues.quantity, '2.5')
  assert.equal(group.projection.comparableValues.price, '10.25')
  assert.deepEqual(group.projection.sourceValues.quantity, [
    { observationRef: 'fixture:obs:rest:1', value: '2.500' },
    { observationRef: 'fixture:obs:stream:1', value: '2.500' },
  ])
  assert.equal(group.projection.sourceOperationMappingStatus, 'CALLER_SUPPLIED_NOT_VERIFIED')
  assert.equal(result.rawDigestIntegrityStatus, 'NOT_CHECKED')
  assert.equal(result.aggregateTradeCount, null)
  assert.equal(result.authorityGranted, false)
  assert.equal(result.economicAdmissionGranted, false)
})

test('same key with a quantity mismatch is conflicted and emits no projection', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {quantity: '2.600'}}))
  assert.equal(result.reconciliationStatus, 'CONFLICTED')
  assert.equal(result.groups[0].status, 'CONFLICTED')
  assert.equal(result.groups[0].projection, null)
  assert.deepEqual(result.groups[0].issues[0].fields, ['quantity'])
})

test('same key with a commission asset mismatch is conflicted', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {commissionAsset: 'USDX'}}))
  assert.equal(result.groups[0].status, 'CONFLICTED')
  assert.deepEqual(result.groups[0].issues[0].fields, ['commissionAsset'])
})

test('decimal scale differences compare numerically while exact source strings remain preserved', () => {
  const result = reconcileTradeObservationCandidates(pair({
    rest: {quantity: '2.5000', price: '10.2500', commissionAmount: '0.02500'},
    stream: {quantity: '2.5', price: '10.25', commissionAmount: '0.025'},
  }))
  assert.equal(result.reconciliationStatus, 'MATCHED')
  assert.equal(result.groups[0].projection.comparableValues.quantity, '2.5')
  assert.deepEqual(result.groups[0].projection.sourceValues.quantity, [
    { observationRef: 'fixture:obs:rest:1', value: '2.5000' },
    { observationRef: 'fixture:obs:stream:1', value: '2.5' },
  ])
})

test('quote quantity is compared only when both source operations expose it', () => {
  const oneSideMissing = reconcileTradeObservationCandidates(pair({stream: {quoteQuantity: null}}))
  assert.equal(oneSideMissing.reconciliationStatus, 'MATCHED')
  assert.equal(oneSideMissing.groups[0].projection.comparableValues.quoteQuantity, null)
  assert.equal(oneSideMissing.groups[0].comparison.find((item) => item.field === 'quoteQuantity').status, 'NOT_COMPARABLE_SINGLE_SIDE')

  const bothSidesMismatch = reconcileTradeObservationCandidates(pair({stream: {quoteQuantity: '25.626'}}))
  assert.equal(bothSidesMismatch.groups[0].status, 'CONFLICTED')
  assert.deepEqual(bothSidesMismatch.groups[0].issues[0].fields, ['quoteQuantity'])
})

test('same trade ID in different account scopes is not cross-matched', () => {
  const result = reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:account1:rest'),
    candidate('STREAM', 'fixture:obs:account2:stream', {accountScopeRef: 'fixture:account-scope:2'}),
  ])
  assert.equal(result.groups.length, 2)
  assert.ok(result.groups.every((group) => group.status === 'INCOMPLETE'))
  assert.ok(result.groups.every((group) => group.projection === null))
})

test('same trade ID in different symbols is not cross-matched', () => {
  const result = reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:symbol1:rest'),
    candidate('STREAM', 'fixture:obs:symbol2:stream', {symbol: 'BBBUSDX'}),
  ])
  assert.equal(result.groups.length, 2)
  assert.ok(result.groups.every((group) => group.status === 'INCOMPLETE'))
})

test('missing trade identity is incomplete and never synthesized', () => {
  const result = reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:missing-trade', {tradeId: null}),
    candidate('STREAM', 'fixture:obs:stream:missing-counterpart'),
  ])
  assert.equal(result.reconciliationStatus, 'PARTIAL')
  assert.equal(result.unclassified[0].status, 'INCOMPLETE')
  assert.equal(result.unclassified[0].missing.includes('tradeId'), true)
})

test('provider sentinel or explicit non-trade event is not emitted as a fill', () => {
  const sentinel = reconcileTradeObservationCandidates([
    candidate('STREAM', 'fixture:obs:stp', {tradeId: '-1'}),
  ])
  assert.equal(sentinel.reconciliationStatus, 'NOT_A_TRADE')
  assert.equal(sentinel.groups.length, 0)
  assert.equal(sentinel.unclassified[0].status, 'NOT_A_TRADE')

  const explicit = reconcileTradeObservationCandidates([
    candidate('STREAM', 'fixture:obs:nontrade', {sourceFactType: 'NOT_A_TRADE'}),
  ])
  assert.equal(explicit.reconciliationStatus, 'NOT_A_TRADE')
})

test('unmapped source operation is preserved but not inferred to be a trade', () => {
  const result = reconcileTradeObservationCandidates([
    candidate('REST', 'fixture:obs:unknown', {sourceFactType: 'UNKNOWN'}),
  ])
  assert.equal(result.reconciliationStatus, 'UNMAPPED')
  assert.equal(result.groups.length, 0)
  assert.equal(result.unclassified[0].code, 'SOURCE_OPERATION_NOT_MAPPED_TO_TRADE_EXECUTION')
})

test('same exact observation reference and digest is replay-no-op; changed digest conflicts', () => {
  const rest = candidate('REST', 'fixture:obs:rest:duplicate')
  const stream = candidate('STREAM', 'fixture:obs:stream:duplicate')
  const duplicate = reconcileTradeObservationCandidates([rest, {...rest}, stream])
  assert.equal(duplicate.reconciliationStatus, 'MATCHED')
  assert.deepEqual(duplicate.groups[0].duplicateObservationRefs, ['fixture:obs:rest:duplicate'])

  const conflict = reconcileTradeObservationCandidates([
    rest,
    {...rest, rawDigestRef: 'sha256:changed'},
    stream,
  ])
  assert.equal(conflict.reconciliationStatus, 'CONFLICTED')
  assert.equal(conflict.groups[0].projection, null)
})

test('same channel source identity with changed digest is conflicted', () => {
  const rest = candidate('REST', 'fixture:obs:rest:1')
  const duplicateDelivery = candidate('REST', 'fixture:obs:rest:2')
  const stream = candidate('STREAM', 'fixture:obs:stream:1')
  const result = reconcileTradeObservationCandidates([rest, duplicateDelivery, stream])
  assert.equal(result.reconciliationStatus, 'CONFLICTED')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.groups[0].issues[0].code, 'SOURCE_IDENTITY_DIGEST_CONFLICT')
})

test('correction or supersession relation blocks matching pending lineage review', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {correctionRef: 'fixture:prior-trade'}}))
  assert.equal(result.reconciliationStatus, 'CONFLICTED')
  assert.equal(result.groups[0].issues[0].code, 'CORRECTION_OR_SUPERSESSION_REQUIRES_SEPARATE_LINEAGE_REVIEW')
  assert.equal(result.groups[0].projection, null)
})

test('single source remains INCOMPLETE and is not labelled independently corroborated', () => {
  const result = reconcileTradeObservationCandidates([candidate('REST', 'fixture:obs:rest:only')])
  assert.equal(result.reconciliationStatus, 'PARTIAL')
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].issues[0].code, 'INDEPENDENT_REST_AND_STREAM_OBSERVATIONS_REQUIRED')
  assert.equal(result.groups[0].projection, null)
})

test('invalid decimal values are rejected without binary coercion', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {quantity: '2,5'}}))
  assert.equal(result.reconciliationStatus, 'INVALID')
  assert.equal(result.unclassified[0].status, 'INVALID')
  assert.equal(result.unclassified[0].code, 'TRADE_DECIMAL_INVALID')
})

test('empty and malformed candidate collections fail closed without implying zero trades', () => {
  assert.equal(reconcileTradeObservationCandidates([]).reconciliationStatus, 'INCOMPLETE')
  const malformed = reconcileTradeObservationCandidates(null)
  assert.equal(malformed.reconciliationStatus, 'INVALID')
  assert.equal(malformed.aggregateTradeCount, null)
})


test('balance, collateral-lock and fee-schedule observations are not inferred to be trades', () => {
  const nonTradeCases = [
    ['BALANCE_CHANGE', 'fixture:binance:balanceUpdate'],
    ['BALANCE_SNAPSHOT', 'fixture:binance:account.status'],
    ['ACCOUNT_POSITION_UPDATE', 'fixture:binance:outboundAccountPosition'],
    ['BALANCE_DELTA', 'fixture:binance:balanceUpdate'],
    ['COLLATERAL_LOCK_CHANGE', 'fixture:binance:externalLockUpdate'],
    ['FEE_SCHEDULE', 'fixture:binance:account.commission'],
    ['SETTLEMENT', 'fixture:binance:unmapped-settlement'],
  ]

  for (const [sourceFactType, sourceOperationRef] of nonTradeCases) {
    const result = reconcileTradeObservationCandidates([
      candidate('STREAM', 'fixture:obs:non-trade:' + sourceFactType, {
        sourceFactType,
        sourceOperationRef,
      }),
    ])
    assert.equal(result.reconciliationStatus, 'UNMAPPED', sourceFactType)
    assert.equal(result.groups.length, 0, sourceFactType)
    assert.equal(result.unclassified[0].status, 'UNMAPPED', sourceFactType)
  }
})

test('matching amount and asset do not join a trade to an external lock event', () => {
  const trade = candidate('REST', 'fixture:obs:trade:9001')
  const lock = candidate('STREAM', 'fixture:obs:external-lock:9001', {
    sourceFactType: 'COLLATERAL_LOCK_CHANGE',
    sourceOperationRef: 'fixture:binance:externalLockUpdate',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
  })
  const result = reconcileTradeObservationCandidates([trade, lock])
  assert.equal(result.reconciliationStatus, 'UNMAPPED')
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
})

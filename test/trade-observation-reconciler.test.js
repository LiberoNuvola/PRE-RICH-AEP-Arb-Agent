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

test('same key with a commission amount mismatch is conflicted and emits no projection', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {commissionAmount: '0.026'}}))
  assert.equal(result.groups[0].status, 'CONFLICTED')
  assert.equal(result.groups[0].projection, null)
  assert.deepEqual(result.groups[0].issues[0].fields, ['commissionAmount'])
})

test('same key with a commission asset mismatch is conflicted', () => {
  const result = reconcileTradeObservationCandidates(pair({stream: {commissionAsset: 'USDX'}}))
  assert.equal(result.groups[0].status, 'CONFLICTED')
  assert.deepEqual(result.groups[0].issues[0].fields, ['commissionAsset'])
})

test('explicit zero commission and its asset are preserved as a valid trade attribute', () => {
  const result = reconcileTradeObservationCandidates(pair({
    rest: {commissionAmount: '0.00000000', commissionAsset: 'BNB'},
    stream: {commissionAmount: '0', commissionAsset: 'BNB'},
  }))
  assert.equal(result.reconciliationStatus, 'MATCHED')
  assert.equal(result.groups[0].projection.comparableValues.commissionAmount, '0')
  assert.equal(result.groups[0].projection.comparableValues.commissionAsset, 'BNB')
  assert.deepEqual(result.groups[0].projection.sourceValues.commissionAmount, [
    {observationRef: 'fixture:obs:rest:1', value: '0.00000000'},
    {observationRef: 'fixture:obs:stream:1', value: '0'},
  ])
})

test('multiple fills from one order retain separate fee attributes by trade ID', () => {
  const firstRest = candidate('REST', 'fixture:obs:rest:trade:7001')
  const firstStream = candidate('STREAM', 'fixture:obs:stream:trade:7001')
  const secondRest = candidate('REST', 'fixture:obs:rest:trade:7002', {
    tradeId: '7002', quantity: '1.0', price: '20', quoteQuantity: '20',
    commissionAmount: '0.003', commissionAsset: 'BNB',
  })
  const secondStream = candidate('STREAM', 'fixture:obs:stream:trade:7002', {
    tradeId: '7002', sourceEventId: 'fixture:execution-id:7002', quantity: '1.0',
    price: '20', quoteQuantity: '20', commissionAmount: '0.003', commissionAsset: 'BNB',
  })
  const result = reconcileTradeObservationCandidates([firstRest, firstStream, secondRest, secondStream])
  assert.equal(result.reconciliationStatus, 'MATCHED')
  assert.equal(result.groups.length, 2)
  assert.deepEqual(result.groups.map((group) => group.projection.tradeId), ['7001', '7002'])
  assert.deepEqual(result.groups.map((group) => group.projection.comparableValues.commissionAmount), ['0.025', '0.003'])
  assert.deepEqual(result.groups.map((group) => group.projection.comparableValues.commissionAsset), ['AAA', 'BNB'])
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


test('balance, collateral-lock and tariff observations are not inferred to be trades', () => {
  const nonTradeCases = [
    ['BALANCE_CHANGE', 'fixture:binance:balanceUpdate'],
    ['BALANCE_SNAPSHOT', 'fixture:binance:account.status'],
    ['ACCOUNT_POSITION_UPDATE', 'fixture:binance:outboundAccountPosition'],
    ['BALANCE_DELTA', 'fixture:binance:balanceUpdate'],
    ['COLLATERAL_LOCK_CHANGE', 'fixture:binance:externalLockUpdate'],
    ['SOR_ALLOCATION', 'fixture:binance:myAllocations'],
    ['SPOT_INVENTORY_STATE', 'fixture:binance:account.status'],
    ['DERIVATIVE_POSITION_STATE', 'fixture:binance:futures.positionRisk'],
    ['UNIVERSAL_TRANSFER', 'fixture:binance:asset.transfer.history'],
    ['DEPOSIT_HISTORY', 'fixture:binance:capital.deposit.hisrec'],
    ['WITHDRAWAL_HISTORY', 'fixture:binance:capital.withdraw.history'],
    ['OBLIGATION_PAYMENT', 'fixture:profile:obligation-payment'],
    ['OBLIGATION_SETTLEMENT', 'fixture:profile:obligation-settlement'],
    ['OBLIGATION_NOVATION', 'fixture:profile:obligation-novation'],
    ['LIABILITY_REASSIGNMENT', 'fixture:profile:liability-reassignment'],
    ['MARGIN_BORROW_REPAY', 'fixture:binance:margin.borrow-repay'],
    ['MARGIN_INTEREST', 'fixture:binance:margin.interestHistory'],
    ['MARGIN_INTEREST_RATE', 'fixture:binance:margin.interestRateHistory'],
    ['MARGIN_ACCOUNT_STATE', 'fixture:binance:margin.account'],
    ['ISOLATED_MARGIN_ACCOUNT_STATE', 'fixture:binance:margin.isolated.account'],
    ['MARGIN_CAPITAL_FLOW', 'fixture:binance:margin.capital-flow'],
    ['MARGIN_TRANSFER_HISTORY', 'fixture:binance:margin.transfer'],
    ['MARGIN_LIABILITY_CHANGE', 'fixture:binance:margin.USER_LIABILITY_CHANGE'],
    ['MARGIN_LEVEL_STATUS_CHANGE', 'fixture:binance:margin.MARGIN_LEVEL_STATUS_CHANGE'],
    ['MARGIN_FORCE_LIQUIDATION', 'fixture:binance:margin.forceLiquidationRec'],
    ['MARGIN_SMALL_LIABILITY_EXCHANGE', 'fixture:binance:margin.exchange-small-liability-history'],
    ['MARGIN_COLLATERAL_RATIO', 'fixture:binance:margin.crossMarginCollateralRatio'],
    ['MARGIN_ASSET_CAPABILITY', 'fixture:binance:margin.allAssets'],
    ['MARGIN_PRICE_INDEX', 'fixture:binance:margin.priceIndex'],
    ['MARGIN_RISK_BASED_LIQUIDATION_RATIO', 'fixture:binance:margin.risk-based-liquidation-ratio'],
    ['MARGIN_BORROW_CAPACITY', 'fixture:binance:margin.maxBorrowable'],
    ['MARGIN_TRANSFER_CAPACITY', 'fixture:binance:margin.maxTransferable'],
    ['MARGIN_PROVIDER_LENDING_INVENTORY', 'fixture:binance:margin.available-inventory'],
    ['MARGIN_LIQUIDATION_LOAN', 'fixture:binance:margin.liquidation-loan'],
    ['MARGIN_LIQUIDATION_LOAN_REPAYMENT', 'fixture:binance:margin.liquidation-loan.repay-history'],
    ['MARGIN_INSTITUTIONAL_LOAN_FLOW', 'fixture:binance:margin.capital-flow.note'],
    ['FEE_SCHEDULE', 'fixture:binance:account.commission'],
    ['COMMISSION_RATE_SNAPSHOT', 'fixture:binance:account.commission'],
    ['TEST_ORDER_COMMISSION_RATES', 'fixture:binance:order.test.computeCommissionRates'],
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

test('SOR allocation with tradeId sentinel is preserved as a separate non-trade item', () => {
  const allocation = candidate('STREAM', 'fixture:obs:sor:allocation:stream', {
    sourceFactType: 'SOR_ALLOCATION',
    sourceOperationRef: 'fixture:binance:executionReport:SOR',
    sourceEventId: 'fixture:execution-id:sor:allocation:1',
    tradeId: '-1',
    orderId: '9001',
  })
  const result = reconcileTradeObservationCandidates([allocation])
  assert.equal(result.reconciliationStatus, 'NOT_A_TRADE')
  assert.equal(result.groups.length, 0)
  assert.equal(result.unclassified[0].status, 'NOT_A_TRADE')
})

test('SOR allocation sharing an orderId is not folded into its direct trade', () => {
  const [restTrade, streamTrade] = pair()
  const allocation = candidate('STREAM', 'fixture:obs:sor:allocation:stream', {
    sourceFactType: 'SOR_ALLOCATION',
    sourceOperationRef: 'fixture:binance:executionReport:SOR',
    sourceEventId: 'fixture:execution-id:sor:allocation:1',
    tradeId: '-1',
    orderId: '9001',
    quantity: restTrade.quantity,
    price: restTrade.price,
    quoteQuantity: restTrade.quoteQuantity,
    commissionAmount: restTrade.commissionAmount,
    commissionAsset: restTrade.commissionAsset,
    allocationId: '0',
  })
  const result = reconcileTradeObservationCandidates([restTrade, streamTrade, allocation])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'MATCHED')
  assert.equal(result.groups[0].projection.tradeId, '7001')
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'NOT_A_TRADE')
})

test('Wallet transfer, deposit and withdrawal history are not trades', () => {
  const walletRecords = [
    ['UNIVERSAL_TRANSFER', 'fixture:binance:asset.transfer.history'],
    ['DEPOSIT_HISTORY', 'fixture:binance:capital.deposit.hisrec'],
    ['WITHDRAWAL_HISTORY', 'fixture:binance:capital.withdraw.history'],
  ]
  for (const [sourceFactType, sourceOperationRef] of walletRecords) {
    const result = reconcileTradeObservationCandidates([
      candidate('REST', 'fixture:obs:wallet:' + sourceFactType, {
        sourceFactType,
        sourceOperationRef,
      }),
    ])
    assert.equal(result.reconciliationStatus, 'UNMAPPED', sourceFactType)
    assert.equal(result.groups.length, 0, sourceFactType)
    assert.equal(result.unclassified[0].status, 'UNMAPPED', sourceFactType)
  }
})

test('a wallet transfer matching trade amount and asset is not folded into the trade', () => {
  const trade = candidate('REST', 'fixture:obs:trade:wallet-transfer:1')
  const transfer = candidate('STREAM', 'fixture:obs:wallet-transfer:1', {
    sourceFactType: 'UNIVERSAL_TRANSFER',
    sourceOperationRef: 'fixture:binance:asset.transfer.history',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([trade, transfer])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
})

test('obligation payment, settlement, novation and reassignment are not trade executions', () => {
  const obligationCases = [
    ['OBLIGATION_PAYMENT', 'fixture:profile:obligation-payment'],
    ['OBLIGATION_SETTLEMENT', 'fixture:profile:obligation-settlement'],
    ['OBLIGATION_NOVATION', 'fixture:profile:obligation-novation'],
    ['LIABILITY_REASSIGNMENT', 'fixture:profile:liability-reassignment'],
  ]
  for (const [sourceFactType, sourceOperationRef] of obligationCases) {
    const result = reconcileTradeObservationCandidates([
      candidate('REST', 'fixture:obs:obligation:' + sourceFactType, {
        sourceFactType,
        sourceOperationRef,
        tradeId: null,
        orderId: null,
      }),
    ])
    assert.equal(result.reconciliationStatus, 'UNMAPPED', sourceFactType)
    assert.equal(result.groups.length, 0, sourceFactType)
    assert.equal(result.unclassified[0].status, 'UNMAPPED', sourceFactType)
  }
})

test('a payment matching an obligation amount and asset is not a trade or proof of discharge', () => {
  const trade = candidate('REST', 'fixture:obs:trade:obligation-payment:1')
  const payment = candidate('REST', 'fixture:obs:payment:obligation:1', {
    sourceFactType: 'OBLIGATION_PAYMENT',
    sourceOperationRef: 'fixture:profile:obligation-payment',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([trade, payment])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
})

test('Margin liability, interest, account, capital-flow and liquidation observations are not trades', () => {
  const marginCases = [
    ['MARGIN_BORROW_REPAY', 'fixture:binance:margin.borrow-repay'],
    ['MARGIN_INTEREST', 'fixture:binance:margin.interestHistory'],
    ['MARGIN_INTEREST_RATE', 'fixture:binance:margin.interestRateHistory'],
    ['MARGIN_ACCOUNT_STATE', 'fixture:binance:margin.account'],
    ['ISOLATED_MARGIN_ACCOUNT_STATE', 'fixture:binance:margin.isolated.account'],
    ['MARGIN_CAPITAL_FLOW', 'fixture:binance:margin.capital-flow'],
    ['MARGIN_TRANSFER_HISTORY', 'fixture:binance:margin.transfer'],
    ['MARGIN_LIABILITY_CHANGE', 'fixture:binance:margin.USER_LIABILITY_CHANGE'],
    ['MARGIN_LEVEL_STATUS_CHANGE', 'fixture:binance:margin.MARGIN_LEVEL_STATUS_CHANGE'],
    ['MARGIN_FORCE_LIQUIDATION', 'fixture:binance:margin.forceLiquidationRec'],
    ['MARGIN_SMALL_LIABILITY_EXCHANGE', 'fixture:binance:margin.exchange-small-liability-history'],
    ['MARGIN_COLLATERAL_RATIO', 'fixture:binance:margin.crossMarginCollateralRatio'],
    ['MARGIN_ASSET_CAPABILITY', 'fixture:binance:margin.allAssets'],
    ['MARGIN_PRICE_INDEX', 'fixture:binance:margin.priceIndex'],
    ['MARGIN_RISK_BASED_LIQUIDATION_RATIO', 'fixture:binance:margin.risk-based-liquidation-ratio'],
    ['MARGIN_BORROW_CAPACITY', 'fixture:binance:margin.maxBorrowable'],
    ['MARGIN_TRANSFER_CAPACITY', 'fixture:binance:margin.maxTransferable'],
    ['MARGIN_PROVIDER_LENDING_INVENTORY', 'fixture:binance:margin.available-inventory'],
    ['MARGIN_LIQUIDATION_LOAN', 'fixture:binance:margin.liquidation-loan'],
    ['MARGIN_LIQUIDATION_LOAN_REPAYMENT', 'fixture:binance:margin.liquidation-loan.repay-history'],
    ['MARGIN_INSTITUTIONAL_LOAN_FLOW', 'fixture:binance:margin.capital-flow.note'],
  ]
  for (const [sourceFactType, sourceOperationRef] of marginCases) {
    const result = reconcileTradeObservationCandidates([
      candidate('REST', 'fixture:obs:margin:' + sourceFactType, {
        sourceFactType,
        sourceOperationRef,
        tradeId: null,
        orderId: null,
      }),
    ])
    assert.equal(result.reconciliationStatus, 'UNMAPPED', sourceFactType)
    assert.equal(result.groups.length, 0, sourceFactType)
    assert.equal(result.unclassified[0].status, 'UNMAPPED', sourceFactType)
  }
})

test('Margin capital-flow and transfer rows matching a reconciled trade do not add executions', () => {
  const [restTrade, streamTrade] = pair()
  const capitalFlow = candidate('REST', 'fixture:obs:margin:capital-flow:trade:1', {
    sourceFactType: 'MARGIN_CAPITAL_FLOW',
    sourceOperationRef: 'fixture:binance:margin.capital-flow',
    sourceEventId: null,
    quantity: restTrade.quantity,
    commissionAsset: restTrade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const transfer = candidate('REST', 'fixture:obs:margin:transfer:trade:1', {
    sourceFactType: 'MARGIN_TRANSFER_HISTORY',
    sourceOperationRef: 'fixture:binance:margin.transfer',
    sourceEventId: null,
    quantity: restTrade.quantity,
    commissionAsset: restTrade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([restTrade, streamTrade, capitalFlow, transfer])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'MATCHED')
  assert.equal(result.groups[0].projection.observationRefs.length, 2)
  assert.equal(result.unclassified.length, 2)
  assert.deepEqual(result.unclassified.map(x => x.status), ['UNMAPPED', 'UNMAPPED'])
})

test('liquidation-deficit repayment evidence matching a trade amount is not a trade projection', () => {
  const trade = candidate('REST', 'fixture:obs:trade:liquidation-deficit:1')
  const evidence = candidate('REST', 'fixture:obs:margin:liquidation-deficit-repay:1', {
    sourceFactType: 'MARGIN_LIQUIDATION_LOAN_REPAYMENT',
    sourceOperationRef: 'fixture:binance:margin.liquidation-loan.repay-history',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([trade, evidence])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
})

test('Margin capacity and collateral metadata matching a trade amount do not create a trade projection', () => {
  const trade = candidate('REST', 'fixture:obs:trade:margin-capacity:1')
  const capacity = candidate('REST', 'fixture:obs:margin:max-borrowable:1', {
    sourceFactType: 'MARGIN_BORROW_CAPACITY',
    sourceOperationRef: 'fixture:binance:margin.maxBorrowable',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([trade, capacity])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
})

test('a Margin borrow matching a trade asset and amount is not folded into the trade', () => {
  const trade = candidate('REST', 'fixture:obs:trade:margin-borrow:1')
  const borrow = candidate('REST', 'fixture:obs:margin:borrow:1', {
    sourceFactType: 'MARGIN_BORROW_REPAY',
    sourceOperationRef: 'fixture:binance:margin.borrow-repay',
    sourceEventId: null,
    quantity: trade.quantity,
    commissionAsset: trade.commissionAsset,
    tradeId: null,
    orderId: null,
  })
  const result = reconcileTradeObservationCandidates([trade, borrow])
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].status, 'INCOMPLETE')
  assert.equal(result.groups[0].projection, null)
  assert.equal(result.unclassified.length, 1)
  assert.equal(result.unclassified[0].status, 'UNMAPPED')
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

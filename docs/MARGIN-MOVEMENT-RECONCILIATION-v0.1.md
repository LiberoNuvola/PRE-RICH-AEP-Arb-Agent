# Margin Movement Reconciliation v0.1

**Date:** 2026-11-06  
**Repository:** PRE-RICH AEP Arb Agent  
**Status:** documentation-only; Margin is not selected or enabled in S1

## 1. Purpose and boundary

This document maps overlapping read-only Binance Margin activity families. Its purpose is to prevent one economic/account movement from being counted once per API that reports it. It does not implement a Margin ledger, movement resolver, collection client or economic authority.

No Margin endpoint, stream, credential or mutation is enabled. The Cross/Isolated account scope remains part of every observation identity. Asset, amount, sign, symbol or timestamp alone is never a cross-family identity.

## 2. Source families are not additive

| Family | Source | Primary identity / fields | Evidentiary role |
|---|---|---|---|
| Margin order | GET /sapi/v1/margin/allOrders | symbol, orderId, clientOrderId, executedQty, cummulativeQuoteQty, status, side, isIsolated, time/updateTime | Parent order and aggregate execution state |
| Individual Margin trade | GET /sapi/v1/margin/myTrades | id, orderId, symbol, isIsolated, price, qty, commission, commissionAsset, isBuyer, isMaker, time | Individual execution and actual per-trade commission |
| Margin capital-flow | GET /sapi/v1/margin/capital-flow | row id, tranId, asset, symbol, type, amount, optional note | Broad activity/reporting view; may include transfer, borrow, repay, buy/sell income/expense and trading commission categories |
| Margin borrow/repay | GET /sapi/v1/margin/borrow-repay | txId, query BORROW/REPAY, asset, principal, interest, amount, status, timestamp, Cross/Isolated scope | Borrow/repay operation and lifecycle status |
| Margin transfer | GET /sapi/v1/margin/transfer | txId, amount, asset, status, type ROLL_IN/ROLL_OUT, transFrom/transTo, fromSymbol/toSymbol | Cross/Isolated Margin wallet movement |
| Wallet universal transfer | GET /sapi/v1/asset/transfer | tranId, direction-coded type, asset/amount/time | Wallet-level internal transfer report; distinct from Margin transfer response |
| Force liquidation | GET /sapi/v1/margin/forceLiquidationRec | orderId, symbol, isIsolated, executedQty, avgPrice, qty, side, updatedTime | Liquidation-specific order execution view |
| Liability stream | USER_LIABILITY_CHANGE | event time E, asset a, update type t, principal p, interest i | Liability change observation; no transaction ID |
| Account snapshot | GET /sapi/v1/margin/account or /isolated/account | free, locked, borrowed, interest, netAsset, pair/account risk values | Point-in-time state, not an additional transaction |

## 3. Narrow positive lineage: order → fills

A Margin order and its individual trades can be related using the exact provider order identity within the declared context:

- same provider profile and version;
- same account scope;
- same symbol;
- same Cross vs Isolated scope (isIsolated);
- exact orderId.

The order is the parent. Each myTrades.id is an individual execution under that order. allOrders.executedQty and cummulativeQuoteQty are order-level aggregates: they can be compared with the fill set as controls but must never be added to underlying fill quantities as a separate execution.

Margin myTrades includes the actual trade's commission amount and commissionAsset; retain these against the exact trade ID. Do not replace the charged commission with a fee-rate estimate or add a separate capital-flow commission row without exact identity.

### 3.1 Force-liquidation linkage

forceLiquidationRec exposes orderId, symbol and isIsolated. This permits a candidate relation to the corresponding Margin order using the same exact provider/account/symbol/scope/orderId. The order's individual myTrades may then be enumerated using its orderId and exact scope. Preserve the force-liquidation row as a distinct provider observation of that order; compare its executedQty with the order/fill records rather than treating it as another fill.

The Cross liquidation-deficit loan API does not expose this orderId. Therefore no record-level relation from a force-liquidation order to the deficit-loan amount or its repayments is established by the reviewed schemas.

## 4. Capital-flow is a broad report, not another movement ledger

The capital-flow endpoint returns id, tranId, timestamp, asset, symbol, type, amount and optional note. fromId advances by row id (records with id > fromId); it does not use tranId as its documented cursor. Its query scope is the last 90 days with a maximum 7-day time interval per request.

Visible type categories include TRANSFER, BORROW, REPAY, BUY_INCOME, BUY_EXPENSE, SELL_INCOME, SELL_EXPENSE and TRADING_COMMISSION (the published selector exposes further values). This breadth means capital-flow can describe an effect that also appears in more specific debt, trade, fee or transfer families.

Since 2026-07-10, note can mark INSTITUTIONAL_LOAN_TRANSFER, INSTITUTIONAL_LOAN_BORROW or INSTITUTIONAL_LOAN_REPAY. This is a classifier, not a canonical loan ID or event linkage.

Do not add capital-flow rows to:
- borrow/repay history as a second loan or repayment;
- Margin myTrades as a second execution;
- per-trade commission as a second fee;
- Margin transfer or Wallet transfer history as a second wallet movement.

The response has id and tranId, but the reviewed docs do not provide a general binding from these fields to borrow/repay txId, Margin transfer txId, Margin trade id/orderId or Wallet universal-transfer tranId. Preserve all identifiers separately. Do not join by asset + amount + time or by note.

## 5. Borrow/repay, order side effects and account state

The borrow-repay history is the specific operation source. Only CONFIRMED rows describe completed account effects; PENDING remains unresolved; FAILED means no account effect. Keep principal and interest components distinct.

Margin order requests expose sideEffectType values NO_SIDE_EFFECT, MARGIN_BUY, AUTO_REPAY and AUTO_BORROW_REPAY. These describe requested order behavior; they are not themselves proof that a borrow or repayment completed. Require the specific borrow/repay result with confirmed status before recording the associated liability event. If request evidence is unavailable or cannot be bound to an operation ID, retain the order intent without inferring a debt event.

The account snapshot and USER_LIABILITY_CHANGE event do not provide a shared event cursor with borrow/repay history. Snapshots are state observations, not another borrow/repayment. The liability stream schema has no transaction ID; it cannot be deduplicated to REST by asset, amount and event time.

## 6. Margin transfer identity boundary

GET /sapi/v1/margin/transfer returns a Margin transfer row with txId, type (ROLL_IN/ROLL_OUT), direction fields (transFrom, transTo), and optional fromSymbol/toSymbol, plus asset, amount, status and time. GET /sapi/v1/margin/capital-flow has a TRANSFER type and its own id/tranId. Wallet universal transfer history has another tranId namespace and its own direction-coded type.

The reviewed docs do not define a universal equivalence among:
- Margin transfer txId;
- Margin capital-flow id or tranId;
- Wallet universal-transfer tranId;
- borrow/repay txId.

A confirmed Margin transfer proves a wallet movement within the provider's declared source/destination scope. It does not by itself prove a borrow, repayment, payment, discharge, settlement or novation. The direction-coded row is not a second independent asset. Keep each family separately evidenced unless a provider-defined shared identity is supplied.

## 7. Cross-family rules

| Compare | Allowed relation | Blocker / non-regression |
|---|---|---|
| allOrders ↔ myTrades | orderId under same provider/account/symbol/isIsolated scope | Aggregate executedQty/cummulativeQuoteQty is control data, not an extra fill |
| forceLiquidationRec ↔ allOrders ↔ myTrades | same scoped orderId lineage | No inference to liquidation-deficit loan ID or debt repayment |
| capital-flow ↔ myTrades/commission | explanatory report view where a later exact provider mapping exists | Current capital-flow row exposes no trade ID/orderId/commission item ID; no amount/time matching |
| capital-flow ↔ borrow-repay | same operation only if explicit common ID is documented in a future source version | id/tranId vs borrow-repay txId; never sum as two debts |
| capital-flow ↔ Margin transfer ↔ Wallet transfer | same transfer only if an exact shared provider identity is documented | id, tranId, txId namespaces remain distinct |
| borrow-repay ↔ account snapshot | confirmed event may explain a later point-state difference | No atomic account cursor; do not reconstruct complete balance history from snapshots |
| USER_LIABILITY_CHANGE ↔ REST debt history | retain as stream observation for comparison | no transaction ID; no time/amount deduplication |
| force-liquidation record ↔ liquidation-deficit loan | provider-described causal context only | no shared order/loan ID; unresolved relation |
| collateral/risk snapshot ↔ movement records | contextual risk/state comparison | aggregate risk values are not movement records |

## 8. Query completeness and replay

- Margin capital-flow: 90-day history, at most 7 days per time query, limit max 1000, fromId returns IDs strictly greater than the cursor.
- Margin transfer: descending results, 7 days by default, max 30-day query interval, pages max 100.
- Margin myTrades: fromId fetches trade IDs greater than or equal to the cursor; otherwise recent 24 hours; time window less than 24 hours; max 1000.
- Margin allOrders: symbol required, orderId can continue from an order ID; otherwise recent history with less-than-24-hour time windows; max 500.
- Force-liquidation history is descending and paginated.
- A successful query or partial page does not prove family completeness. Retain exact query boundaries, page progression, and exhaustion evidence per family. A missing row never proves no activity where retention, scope or pagination is incomplete.

## 9. IMMORTAL non-regression

- EXP-03: resource identity, eligibility, valuation, haircut and executable liquidity remain distinct.
- EXP-05: no payment/repayment discharges a canonical obligation without its explicit established right and exactly-once settlement evidence.
- EXP-06 / EXP-12: provider events and crosswalks do not prove verifier trust or Principal authority.
- EXP-08: retain gross obligations; no implicit netting.
- EXP-09: transfer or reassignment is not novation.
- EXP-10: RiskBudget, RealizedExposure and ProtectedCapital are distinct.
- X2: a shared resource is counted once or partitioned exclusively.
- X4: a coupled cross-system obligation commits atomically or remains unresolved in both systems.

No Margin ledger/parser is added. No IMMORTAL formula, ProtectedCapital/R7, C-COMP, or authority state is modified. Provider selection, live conformance, D0/D1 and independent review remain open.

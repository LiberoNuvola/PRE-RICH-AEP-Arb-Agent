# Binance Spot Read-Only Candidate — Endpoint and Field Mapping v0.1

**Status:** documentation-only mapping; candidate profile, not selected or conformant  
**Date:** 2026-11-04  
**Branch:** Immortal-Protocol  
**Provider product perimeter:** Binance Spot account/trading observations only

## 1. Purpose and hard boundary

This document pins the first candidate source operations and maps documented fields to Arb's existing provider-neutral evidence envelope. It does not implement a client, sign requests, connect an account, or authorize an integration.

Candidate operations are read-only:
- signed USER_DATA queries;
- USER_STREAM subscription only;
- no TRADE methods;
- no transfer, withdrawal, borrow, repay, or other mutating operations;
- no credential or account is requested or connected.

Binance documents distinct security types: USER_DATA for private account information, TRADE for placing/canceling orders, and USER_STREAM for managing user-stream subscriptions. It also documents that a key does not have TRADE permission by default and that a separate USER_DATA-only key can be used for monitoring. This is a provider capability statement, not a recommendation to create or share a key. Source: https://developers.binance.com/en/docs/products/spot/rest-api

## 2. Endpoint-to-family mapping

The initial candidate uses the current Spot WebSocket API at wss://ws-api.binance.com:443/ws-api/v3 for signed query operations and the authenticated User Data Stream for push observations.

| Arb family | Official operation/event | Documented fields to preserve | Identity / ordering | Coverage status |
|---|---|---|---|---|
| Account snapshot / balances | account.status (USER_DATA) | accountType, updateTime, balances[].asset, free, locked; permission flags as metadata only | Response ID is request correlation, not account event identity; preserve receipt time and updateTime | Snapshot is not atomic with other families |
| Balance change | outboundAccountPosition | e, E, u, B[].a, B[].f, B[].l | Event type + event time + account update time + exact asset; no invented sequence | Push event; stream gaps require REST reconciliation |
| Balance delta | balanceUpdate | e, E, a, d, T | Preserve delta, asset, event time and transaction/clear time; payload has no transaction ID | Does not identify transfer counterparty |
| Order lifecycle | allOrders / order.status (USER_DATA) | symbol, orderId, orderListId, clientOrderId, price, origQty, executedQty, cummulativeQuoteQty, status, timeInForce, type, side, time, updateTime | Product scope + symbol + orderId; clientOrderId is separate | Per-symbol history; documented query limits apply |
| Order update / execution report | executionReport | s, c, S, o, f, q, p, x, X, i, l, z, L, n, N, T, t, I, Z, Y, C, r, v and conditional fields | i = order ID; I = execution ID; t = trade ID when present; c = client order ID | Event evidence, not guaranteed complete replay |
| Fills / trades | myTrades (USER_DATA) | symbol, id (trade ID), orderId, orderListId, price, qty, quoteQty, commission, commissionAsset, time, isBuyer, isMaker, isBestMatch where returned | Product scope + symbol + trade ID; link to order ID | Per-symbol; max 1000; time interval max 24 hours; fromId cannot combine with time filters |
| Fees / commission schedule | account.commission and trade fee fields | standard/special/tax maker/taker/buyer/seller rates; discount flags, asset/rate; actual commission and commissionAsset | Rate schedule is not actual fee; preserve separately | Current rates do not prove historical applied rate |
| Order-list lifecycle | allOrderLists / listStatus | orderListId, contingencyType, listStatusType, listOrderStatus, listClientOrderId, transactionTime, member order IDs | Parent order-list identity separate from member order IDs | Preserve OCO/OTO parent-child lineage |
| Prevented / self-trade match | conditional execution-report fields and prevented-matches query | prevented match ID/quantity/price/quote quantity where exposed | Distinct from executed trade identity | Not an execution/fill |

## 3. Important field semantics

### 3.1 Account and balances

account.status returns account type, permissions, update time and balances. Each balance has an asset code, free quantity and locked quantity. The documentation allows omitting zero balances; the candidate profile must explicitly set omitZeroBalances=false so absence is not confused with zero or omitted data.

A returned balance is a provider observation. It is not automatically eligible asset, executable liquidity, collateral, EEV, ProtectedCapital or a liability-adjusted economic amount.

### 3.2 Orders and fills

For allOrders, Binance documents:
- orderId filtering from an ID;
- if startTime and/or endTime are used, orderId is ignored;
- filtering uses the time of the last execution-status update;
- startTime/endTime interval cannot exceed 24 hours;
- some historical cummulativeQuoteQty values may be negative, meaning data is not available at that time.

For myTrades, Binance documents:
- maximum limit 1000 (default 500);
- fromId returns trade IDs greater than or equal to the requested ID;
- fromId cannot be combined with startTime/endTime;
- time interval cannot exceed 24 hours;
- orderId is an alternative filter and cannot be combined with time filters.

A successful request or a page smaller than the maximum does not prove completeness. Record exact query, pagination progression, all time windows, response counts and terminal condition. If exhaustion cannot be established, coverage is PARTIAL or UNKNOWN.

### 3.3 Stream event identity and duplicate prevention

The User Data Stream executionReport carries order ID i, execution ID I, trade ID t (non-trade events may use a sentinel), last executed quantity l, cumulative filled quantity z, last executed price L, commission n and commission asset N, plus event time E and transaction time T.

The historical myTrades result separately carries trade ID, order ID, quantity, price and commission fields. The deduplication key for an actual trade must use provider trade identity in its scoped context, not a normalized amount/time hash. Stream execution reports and historical trade rows are two observations of potentially the same underlying trade, not two fills.

Do not treat executionReport as a second independent fill if the corresponding myTrades row is already present. Preserve both raw observations and bind them to one trade identity. Any conflict is a blocker/conflict, not a reason to pick the convenient value.

### 3.4 Corrections, cancellations and prevented matches

The reviewed Spot documentation exposes order execution type/status, cancel/replace lineage fields, reject/expiry reasons and prevented-match identifiers. That does not establish a general trade-bust/correction endpoint or universal correction model. Until a documented operation is identified, correction/bust completeness is UNKNOWN.

A prevented match / STP event is not an executed fill. Preserve its distinct identifiers and quantities without adding it to trade quantity or gross executed exposure.

## 4. Timestamp and units contract

- Binance JSON time fields are milliseconds by default. The general REST documentation also supports requesting microseconds using X-MBX-TIME-UNIT. The candidate profile must pin one unit and reject mixed-unit ambiguity.
- Preserve provider source time fields exactly, then normalize without overwriting the raw value.
- Quantities, prices, commissions and rates are decimal strings. Preserve exact lexical value and asset/unit context; do not coerce through binary floating point.
- For executionReport, keep event time E, transaction time T, order creation time O, working time W and update time semantics distinct where present.
- Local receipt time is a separate observation timestamp, not a substitute for provider event time.

## 5. Read-only collection plan

Permitted candidate operations:
- account.status — signed USER_DATA;
- allOrders, order.status, myTrades, account.commission, allOrderLists — signed USER_DATA;
- subscribe/list/unsubscribe to authenticated User Data Stream — USER_STREAM;
- local receipt, hashing, normalization and replay of received payloads.

Explicitly prohibited:
- order.place, order.cancel, order.cancelReplace, amend, OCO/OTO creation;
- any TRADE method;
- Margin borrow/repay or transfer/wallet operations;
- deposit/withdraw, internal transfer or asset conversion;
- API-key creation, permission changes or account setup by this workstream.

No key is needed for the current synthetic-only work.

## 6. Snapshot and stream reconciliation — no atomicity claim

The official documentation describes separate account, order, trade and commission queries, plus asynchronous user-data events. This review found no documented atomic snapshot token spanning all these families.

1. Record each query's request parameters, response, source time fields, receipt time, profile version and evidence digest.
2. Persist raw stream events before deriving projections.
3. Record subscription start, termination events, disconnects, reconnects and unobserved intervals as explicit coverage gaps.
4. Query account/order/trade state around handoff and reconcile overlaps by exact provider identities.
5. Never infer a globally coherent account instant from separate family responses.
6. Never use stream receipt order as global causal order across unrelated families.
7. If REST/stream facts disagree or a gap cannot be repaired, preserve CONFLICTED/PARTIAL/UNKNOWN coverage.

The User Data Stream documentation states outboundAccountPosition is sent when balances change, and balanceUpdate is used for deposits/withdrawals and transfers between accounts. These events do not alone prove complete transfer lifecycle, counterparty identity or settlement finality.

## 7. Mapping to existing Arb envelope

| Existing Arb field | Binance candidate mapping |
|---|---|
| Provider / product | binance / spot only |
| Protocol / version | Spot WebSocket API v3 and User Data Stream; pin documentation revision and retrieval date |
| Source operation | Exact method/event name, e.g. account.status, myTrades, executionReport |
| Data family | account_balance, order, fill, fee_schedule, order_list, prevented_match |
| Source identity | Scoped provider identifiers above; never ticker alone |
| Snapshot identity | Local collection-run identity; no provider-wide atomic snapshot assumed |
| Event identity | Local eventId distinct from provider sourceEventId; use documented provider execution/trade/order identity where appropriate |
| Time model | Raw millisecond fields + explicit event/effective/transaction semantics + local receipt time |
| Correction model | Documented cancel/replace and status changes only; trade bust/correction coverage UNKNOWN |
| Coverage rule | Per-family/per-query; zero omission disabled for account balances; query bounds and terminal pagination evidence required |
| Evidence | Retain raw response/event bytes, exact digest, evidence version and source documentation reference; no verification promotion without separate verifier |

The candidate must not place every provider payload into OpenExposure. OpenExposure remains a gross projection only when a source fact is correctly typed and mapped. Balances, account permissions, commission schedules and order-list parent records remain source-family observations.

## 8. Required synthetic conformance vectors

1. Account snapshot with nonzero, locked and zero balances.
2. Zero-balance omission accidentally enabled — fail profile conformance.
3. One partial fill represented by executionReport and matching myTrades row — exactly one trade identity in projection.
4. Duplicate stream delivery with identical execution ID.
5. Same execution ID with conflicting payload — CONFLICTED, never overwrite.
6. Cancel/replace preserving original client order ID and new order identity.
7. OCO parent list and member orders preserving hierarchy.
8. Prevented match / STP expiry — not counted as fill.
9. 24-hour query-bound violation — rejected before request planning.
10. 1000-row page and continuation via trade ID; incomplete exhaustion remains PARTIAL.
11. Negative historical cummulativeQuoteQty — preserved as unavailable, not zero.
12. Stream termination/reconnect with explicit gap and REST repair attempt.
13. Stream event before delayed REST snapshot and vice versa — no invented global order.
14. Commission asset different from quote/base asset — preserve exact fee asset.
15. Missing or mixed timestamp units — reject or mark UNKNOWN.
16. Balance delta without unique transaction reference — do not invent transfer identity.

## 9. Official sources reviewed

- Binance Spot REST API — security, timestamp and error semantics: https://developers.binance.com/en/docs/products/spot/rest-api
- Binance Spot WebSocket API — Account: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account
- Binance Spot User Data Stream events: https://github.com/binance/binance-spot-api-docs/blob/master/user-data-stream.md
- Binance Margin REST API — Borrow and Repay: https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/borrow-repay

Margin is cited only to establish separate borrow/repay and interest-history operations. Margin is out of scope for this Spot candidate.

## 10. Non-regression

Documentation only. No schema, reducer, application code, client, signature code, credentials, account connection, verifier, evidence registry, economic state, valuation, EEV, ProtectedCapital, RiskBudget, netting, authority or actuator changed.

S1 remains synthetic/read-only. Provider selection, provider conformance, D0/D1 and independent review remain OPEN. S2/S3 remain unauthorized.

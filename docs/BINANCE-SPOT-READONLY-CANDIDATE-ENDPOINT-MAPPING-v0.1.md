# Binance Spot Read-Only Candidate — Endpoint and Field Mapping v0.1

**Status:** documentation-only mapping; candidate profile, not selected or conformant  
**Date:** 2026-11-05  
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
| Account snapshot / balances | account.status (USER_DATA) | accountType, result.updateTime, balances[].asset, free, locked; pin omitZeroBalances=false; permission flags as metadata only | Request id is correlation only, not snapshot/event identity; preserve request/receipt times and updateTime | Current account-state response; source is Memory => Database; no shared stream cursor/snapshot token documented |
| Balance change | outboundAccountPosition | e, E, u, B[].a, B[].f, B[].l; SBE also exposes optional subscriptionId | Event type + event time + last account update time + exact asset; no per-account sequence/cursor; subscriptionId is subscription context, not a transaction key | Push event contains assets possibly changed by the event, not a whole-account snapshot; stream gaps remain gaps |
| Balance delta | balanceUpdate | JSON: e, E, a, d, T; SBE: freeQtyDelta maps to d, clearTime maps to T, optional subscriptionId | Preserve exact event type, raw delta, asset and times; no event sequence/cursor or transfer ID; subscriptionId is subscription context, not transaction identity | Documented for deposits/withdrawals/inter-account transfers only; not a complete balance-change ledger, lock event or settlement proof |
| External lock change | externalLockUpdate | JSON: e, E, a, d, T; SBE: lockedQtyDelta maps to d, clearTime maps to T, optional subscriptionId | Preserve exact event type, raw locked-quantity delta, asset and times; no external-system, loan, collateral-agreement or obligation ID; subscriptionId is not a lock/event identity | Partial collateral/encumbrance observation only; do not infer debt, ownership, valuation or a new asset/liability |
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

### 3.5 External lock/unlock observations

The JSON User Data Stream variant exposes `e`, `E`, `a`, `d` and `T`. The official SBE schema makes the field semantics more precise:
- `BalanceUpdateEvent`: `freeQtyDelta` maps to JSON `d`; `clearTime` maps to `T`.
- `ExternalLockUpdateEvent`: `lockedQtyDelta` maps to JSON `d`; `clearTime` maps to `T`.
- `OutboundAccountPositionEvent`: carries `updateTime` and per-asset `free` / `locked` quantities.

The optional SBE `subscriptionId` is also present on these event types. It identifies the stream subscription context; it is not a provider event ID, transaction ID, lock ID, loan ID, collateral-agreement ID or obligation reference. A common `subscriptionId` across these events therefore does not establish that they describe the same underlying operation.

The event-type distinction matters: the same JSON key `d` is a free-balance delta in `balanceUpdate` but a locked-quantity delta in `externalLockUpdate`. Preserve the event type, raw lexical value, exact asset, representation (JSON/SBE) and both source times. The reviewed schema identifies the lock field as `lockedQtyDelta` but does not specify a positive/negative direction convention; do not independently infer LOCK versus UNLOCK from the sign until an approved provider profile pins that convention.

The Spot User Data Stream describes `externalLockUpdate` as being sent when part of the Spot wallet balance is locked or unlocked by an external system (with margin collateral as an example). The payload does not expose the external system, loan/credit, collateral agreement, counterparty or obligation identity.

Therefore this event is evidence of a reported encumbrance/availability change, not proof of the underlying debt, contractual collateral relationship, asset valuation, collateral eligibility or settlement. It must not be counted as an additional asset or as a liability merely because a quantity changed. Relating it to a balance snapshot, balance delta, loan, position or settlement requires a separate explicit provider identity/mapping; same asset, amount, timestamp or subscriptionId is insufficient.

An external lock can change the distinction between total, free and locked amounts. Do not count the same units once as freely executable balance and again as a separately created collateral asset. Whether and how the underlying value enters the IMMORTAL asset-side partition is a profile qualification question, not an adapter inference.

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

## 6. Balance snapshot, delta and stream reconciliation — no exact reconstruction claim

The official Spot API exposes three distinct views:

- `account.status` returns an account-state response with `updateTime` and a `balances[]` collection (`asset`, `free`, `locked`). `omitZeroBalances` defaults to `false`; the candidate must pin it to `false`. Its documented data source is `Memory => Database`.
- `outboundAccountPosition` is pushed when an account balance changes and contains the assets that may have changed, with their `free` and `locked` quantities. It is a changed-asset update, not a complete account snapshot.
- `balanceUpdate` is documented for deposits, withdrawals and transfers between accounts. It is a narrower delta event, not a record of every balance-changing cause.

The reviewed JSON payloads and SBE event definitions expose timestamps (`E`, `T`, `u`) and subscription context, but no per-account event sequence/cursor or provider event ID for these balance events. In the SBE message header for these event types, the fields identify message length/template/schema/version; they do not supply an account sequence. `subscriptionId` identifies the User Data Stream subscription, not an individual balance event. Therefore:

1. Never reconstruct account state by summing `balanceUpdate` deltas: that family is not exhaustive for balance changes.
2. Never treat `outboundAccountPosition` as an all-assets snapshot: it reports the assets possibly changed by the triggering event.
3. Do not create a one-to-one link between a `balanceUpdate` and an `outboundAccountPosition` from same asset, amount, `E`/`T`/`u`, receipt order or `subscriptionId`.
4. Retain `account.status.updateTime`, `outboundAccountPosition.u`, `balanceUpdate.E/T`, request times and local receipt times as distinct temporal evidence. Timestamp comparison may flag an inconsistency; without a documented shared sequence/watermark it cannot prove event inclusion, event uniqueness or exact ordering.
5. Preserve snapshot rows and delta/position events as separate ObservationRecords. A delta may affect account state later visible in a position update or snapshot, but this is a family-level relationship, not a proved record-level pairing.

### 6.1 Capture and recovery boundary

The safe S1 collection posture is evidence preservation, not an invented event-sourcing algorithm:

1. Record the successful User Data Stream subscription response and exact `subscriptionId`; use `session.subscriptions` to inspect active subscriptions. The aggregate `session.status.userDataStream` flag only reports whether at least one subscription is active in the session.
2. Persist every raw event with source representation (JSON/SBE), subscription ID, source fields, local receipt time and digest. Do not use the subscription ID as an event key.
3. Query `account.status` with `omitZeroBalances=false`; retain request correlation ID, `updateTime`, request interval, receipt interval, raw response and profile version.
4. Do not apply all buffered stream deltas on top of the snapshot as if a shared snapshot watermark existed. No reviewed API contract establishes that boundary.
5. Treat explicit `eventStreamTerminated`, `serverShutdown`, socket close, subscription disappearance or a local receive gap as a coverage discontinuity. Preserve the exact known reason where available; do not require a termination event to declare a locally observed disconnect.
6. After reconnect/re-subscribe, obtain a new `account.status` response as a new point-state observation. It may re-establish a current balance baseline, but it does not backfill the missing event history or resolve what happened during the gap.
7. Keep the missed interval PARTIAL/UNKNOWN even when the new snapshot is available. Do not relabel the historical stream coverage COMPLETE or manufacture missing `balanceUpdate` records.

The User Data Stream documentation identifies `eventStreamTerminated` for documented subscription-ending actions; the WebSocket API also exposes session subscription inspection. Neither operation supplies a cursor for replaying events that were not received. These observations do not prove complete transfer lifecycle, counterparty identity or settlement finality.

## 7. Mapping to existing Arb envelope

| Existing Arb field | Binance candidate mapping |
|---|---|
| Provider / product | binance / spot only |
| Protocol / version | Spot WebSocket API v3 and User Data Stream; pin documentation revision and retrieval date |
| Source operation | Exact method/event name, e.g. account.status, myTrades, executionReport |
| Data family | account_balance, collateral_lock_change (partial), order, fill, fee_schedule, order_list, prevented_match |
| Source identity | Scoped provider identifiers above; never ticker alone |
| Snapshot identity | Local collection-run identity; no provider-wide atomic snapshot assumed |
| Event identity | Local eventId distinct from provider sourceEventId; use documented provider execution/trade/order identity where appropriate |
| Time model | Raw millisecond fields + explicit event/effective/transaction semantics + local receipt time |
| Correction model | Documented cancel/replace and status changes only; trade bust/correction coverage UNKNOWN |
| Coverage rule | Per-family/per-query; zero omission disabled for account balances; query bounds and terminal pagination evidence required |
| Evidence | Retain raw response/event bytes, exact digest, evidence version and source documentation reference; no verification promotion without separate verifier |

The candidate must not place every provider payload into OpenExposure. OpenExposure remains a gross projection only when a source fact is correctly typed and mapped. Balances, external lock changes, account permissions, commission schedules and order-list parent records remain source-family observations. A fee rate schedule is not an actual fee charge; a reported lock change is not itself a liability or proof of collateral ownership.

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
17. externalLockUpdate lock/unlock change — preserve as a separate encumbrance observation; do not manufacture a debt, collateral agreement or settlement reference.
18. externalLockUpdate and a fill with the same asset/amount/time but no shared provider identity — do not join them.
19. account.commission schedule and a trade's actual commission — preserve schedule and charged amount as distinct fact types.
20. balanceUpdate and outboundAccountPosition reflecting a similar asset movement without a shared event/transaction ID — preserve both observations and do not claim independent corroboration or a single merged event.
21. JSON/SBE balanceUpdate, externalLockUpdate and outboundAccountPosition share one stream subscription context; equal subscriptionId plus asset/time/amount does not create a cross-family event or transaction identity.
22. A `balanceUpdate` (deposit/withdrawal/inter-account transfer) and a same-asset `outboundAccountPosition` event have no shared ID — preserve both; no one-to-one event pairing.
23. A trade or lock changes free/locked state but has no `balanceUpdate` event — do not label delta-stream coverage complete or state unchanged.
24. `account.status.updateTime` equals or differs from `outboundAccountPosition.u` — record both; do not treat either as a unique event cursor or shared watermark.
25. `account.status` queried with `omitZeroBalances=true` — reject candidate completeness; absent asset is not a zero-balance assertion.
26. Subscription or socket interruption followed by a new account snapshot — preserve the gap as PARTIAL; the snapshot restores a current point-state only, not missing event history.

## 9. Official sources reviewed

- Binance Spot REST API — security, timestamp and error semantics: https://developers.binance.com/en/docs/products/spot/rest-api
- Binance Spot WebSocket API — Account: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account
- Binance Spot WebSocket API — session and subscription methods: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/user-data-stream
- Binance Spot WebSocket API connection and session contract: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-api.md
- Binance Spot User Data Stream events: https://developers.binance.com/en/docs/products/spot/user-data-stream
- Binance Spot WebSocket stream event schemas (including externalLockUpdate): https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-streams/~schemas
- Binance Spot SBE schema (spot_3_1.xml): https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/spot_3_1.xml
- Binance Margin REST API — Borrow and Repay: https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/borrow-repay

Margin is cited only to establish separate borrow/repay and interest-history operations. Margin is out of scope for this Spot candidate.

## 10. Non-regression

Documentation and negative family-classification tests only. No schema, runtime reducer, application code, client, signature code, credentials, account connection, verifier, evidence registry, economic state, valuation, EEV, ProtectedCapital, RiskBudget, netting, authority or actuator changed.

S1 remains synthetic/read-only. Provider selection, provider conformance, D0/D1 and independent review remain OPEN. S2/S3 remain unauthorized.


## 11. Synthetic conformance execution boundary

The 16 vectors in section 8 are now classified against the existing S1 reducer contract before any provider-specific implementation:

| Vector | Existing contract exercised | Expected disposition |
|---|---|---|
| BSC-01 balances, free/locked/zero | `classifyAccountSnapshot` plus raw fixture preservation | Preserve decimal strings and explicit zero rows; no balance valuation |
| BSC-02 zero omission enabled | ProviderProfile conformance | Reject profile configuration; omitted assets remain unknown |
| BSC-03 executionReport + myTrades same trade | Provider identity reconciliation before lifecycle projection | Preserve two raw observations, one scoped trade identity |
| BSC-04 exact repeated stream event | `replayStream` | Exact event/source/stream/sequence/digest duplicate is a no-op |
| BSC-05 reused event identity, changed digest | `replayStream` | Block stream as conflict |
| BSC-06 cancel/replace | Order identity mapping | Preserve original and replacement order IDs with explicit replace lineage |
| BSC-07 OCO parent/member orders | Order-list mapping | Preserve parent list ID and member order IDs separately |
| BSC-08 prevented/STP match | Event-family classification | Not a fill; do not add to executed quantity |
| BSC-09 query window > 24h | Collection request planning | Reject before collection; no silent window truncation |
| BSC-10 1000-row page | CollectionCoverage | Full page is not terminal proof; remain PARTIAL until continuation/exhaustion evidence |
| BSC-11 negative cumulative quote quantity | Raw field interpretation | Preserve raw sentinel and mark unavailable; never coerce to zero |
| BSC-12 stream reconnect gap | `replayStream` | Gap blocks that stream; coverage stays PARTIAL until separately evidenced repair |
| BSC-13 REST/stream temporal skew | ObservationRecord and per-family coverage | Preserve each clock; no atomic snapshot or cross-family causal order |
| BSC-14 fee asset differs from base/quote | Raw trade/fee mapping | Preserve commissionAsset exactly; do not infer quote denomination |
| BSC-15 missing/mixed time units | ProviderProfile time contract | UNKNOWN / non-conformant until one source unit is pinned per field/profile |
| BSC-16 balance delta without transfer ID | Event-family classification | Preserve balance delta only; transfer identity and lifecycle remain UNKNOWN |

### 11.1 Existing reducer compatibility finding

The generic reducer's `projectOrderLifecycle` deduplicates a repeated `fillId` only when both quantity and `rawDigestRef` match. A Binance `executionReport` and its corresponding `myTrades` row are distinct raw observations and will normally have different raw digests even when they refer to the same provider trade ID.

Therefore, these two records must **not** be fed as duplicate FILL events to `projectOrderLifecycle`. First preserve both ObservationRecords and reconcile them at the provider-observation identity layer using the documented scoped trade identity; only the single reconciled trade projection may be supplied to the generic lifecycle reducer. If the two observations disagree on quantity, order identity, commission or commission asset, preserve both and classify the reconciliation as CONFLICTED. This is a mapping requirement, not permission to weaken the reducer's exact-digest duplicate rule.

The S1 branch now contains a synthetic comparison core (reconcileTradeObservationCandidates) and a narrow adapter (toOrderLifecycleFillEvent) that bind a MATCHED REST/STREAM trade to one lifecycle FILL without collapsing its original raw digests. The lifecycle reducer accepts this explicit evidence-binding mode while preserving the legacy single-digest rule. This is not a Binance payload parser, a verified ProviderProfile mapping, a live provider adapter, or a provider-conformance result; the candidates are already normalized and the source-operation mapping is caller-supplied.

### 11.2 What the vectors do not prove

- They do not establish provider selection, production readiness, live API behavior, or the completeness of Binance account history.
- They do not add typed balance/fee/transfer schemas or a provider-specific normalizer.
- They do not prove raw digest integrity, signature validity, Principal attribution, D0/D1, independent verification, or IMMORTAL economic qualification.
- They do not authorize any TRADE, Margin, transfer, withdrawal, credential-management or actuator capability.

**Current gate:** documentation and synthetic test design only. S1 remains read-only. Provider selection/conformance, D0/D1 and independent review remain OPEN; S2/S3 remain unauthorized.


## 12. Cross-family reconciliation boundary

The family-to-family rules are recorded separately in [CROSS-FAMILY-RECONCILIATION-CONTRACT-v0.1.md](CROSS-FAMILY-RECONCILIATION-CONTRACT-v0.1.md). Matching amount/asset/time is not a join key; a fill is not a balance delta or a settlement; an external lock is not an independently created asset or liability; and a commission schedule is not the commission actually charged. Where the provider supplies no shared identity, Arb preserves the observations without asserting a relation. No cross-family accounting projection or aggregation is implemented.

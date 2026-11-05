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
| Order update / execution report | executionReport | s, c, S, o, f, q, p, x, X, i, l, z, L, n, N, T, t, I, Z, Y, C, r, v; SOR fields `a` (allocId), `b` (matchType), `k` (workingFloor), `uS` (usedSor) where present | i = order ID; I = execution ID; t = direct trade ID when non-negative; `a` links an allocation item; c = client order ID | Event evidence, not guaranteed complete replay; `t=-1` plus SOR allocation fields is not a direct trade |
| Fills / trades | myTrades (USER_DATA) | symbol, id (trade ID), orderId, orderListId, price, qty, quoteQty, time, isBuyer, isMaker, isBestMatch where returned | Product scope + account scope + symbol + non-negative trade ID; link to parent order ID | Per-symbol; max 1000; time interval max 24 hours; fromId cannot combine with time filters; direct trades only |
| SOR allocations | myAllocations (USER_DATA) | symbol, allocationId, allocationType, orderId, orderListId, price, qty, quoteQty, commission, commissionAsset, time, isBuyer, isMaker, isAllocator | Account scope + symbol + allocationId; executionReport.allocId is the stream-side reference; orderId is the parent order link | SOR-only; max 1000; time interval max 24 hours; supports orderId or fromAllocationId query; an order may include both allocations and direct trades |
| Actual per-item commission | myTrades + myAllocations + executionReport | Direct trade: `commission`, `commissionAsset`; SOR allocation: same fields; stream: `n`, `N` plus `t` or `a` allocation ID | Bind direct fee by scoped trade ID; bind SOR fee by scoped allocation ID; commission is an attribute of that item | Preserve exact amount/asset; REST/stream copies are evidence of one charge, not two |
| Current commission schedule | `account.commission` / `GET /api/v3/account/commission` | `symbol`, `standardCommission`, `specialCommission`, `taxCommission`, `discount` (account/symbol enablement, discount asset and multiplier) | Current per-symbol tariff observation; request/receipt time only, no effective-from/version field in response | Context only; does not prove which rates applied to a historical trade |
| Order-list lifecycle | allOrderLists / listStatus | orderListId, contingencyType, listStatusType, listOrderStatus, listClientOrderId, transactionTime, member order IDs | Parent order-list identity separate from member order IDs | Preserve OCO/OTO parent-child lineage |
| Prevented / self-trade match | conditional execution-report fields and prevented-matches query | prevented match ID/quantity/price/quote quantity where exposed | Distinct from executed trade identity | Not an execution/fill |

## 2.1 Companion Wallet history sources — documented, not enabled

The following official Wallet REST history operations are relevant to cross-family transfer evidence, but they are **not part of the current Spot-only collection allowlist**. This is a documentation crosswalk only. Do not call them, create transfer/withdrawal operations, enable extra API permissions or expand the selected provider profile in S1 without a separate scope decision. In particular, only the read-only `GET` history endpoints are described below; the corresponding transfer/withdraw `POST` methods remain prohibited.

| Family | Read-only Wallet operation | Fields to preserve | Identity and limits | Scope note |
|---|---|---|---|---|
| Internal Binance wallet transfer | `GET /sapi/v1/asset/transfer` — Query User Universal Transfer History | `asset`, `amount`, `type`, `status`, `tranId`, `timestamp`; also preserve request `type`, `fromSymbol`, `toSymbol`, page `current` and `size` | `tranId` scoped to the Binance user account and universal-transfer operation; query requires `type`; `size` max 100; history limited to last 6 months, default 7 days | `type` declares product direction (for example Spot → Funding, Spot → USDⓈ-M Futures, Spot → Margin). Isolated-Margin transfer queries may require `fromSymbol` / `toSymbol`. It is a cross-wallet record, not an external blockchain transfer or a Spot trade. |
| External deposit | `GET /sapi/v1/capital/deposit/hisrec` — Deposit History (supporting network) | `id`, `amount`, `coin`, `network`, `status`, `address`, `addressTag`, `txId`, `insertTime`, `completeTime`, `transferType`, `confirmTimes`, `unlockConfirm`, `walletType`, `travelRuleStatus`; `sourceAddress` only when `includeSource=true` | Keep Binance deposit-row `id` separate from chain `txId`; query windows max 90 days, `limit` max 1000 with `offset` | A Binance credit record is not itself proof of the source wallet's ownership or a unique chain transfer sub-event. Preserve raw status (including pending/rejected/credited-but-restricted states). |
| External withdrawal | `GET /sapi/v1/capital/withdraw/history` — Withdraw History (supporting network) | `id`, `amount`, `transactionFee`, `coin`, `status`, `address`, `txId`, `applyTime`, `network`, `transferType`, `withdrawOrderId`, `confirmNo`, `walletType`, `txKey`, `completeTime` | Keep Binance withdrawal-row `id`, optional client-supplied `withdrawOrderId`, and chain `txId` distinct; query windows max 90 days, `limit` max 1000; `withdrawOrderId` filter has a 7-day window | Older records may omit `network`; preserve missing as missing. `transactionFee` is a withdrawal/network fee, not trade commission. Do not infer net amount by subtracting it without a source-defined amount convention. |

The universal-transfer history row gives one `tranId`, one direction-coded `type`, asset, amount, status and timestamp. It does not create two independent transfer records for source and destination. Its `type` identifies the product-direction category (e.g. `MAIN_FUNDING` / `FUNDING_MAIN`); isolated-margin symbol fields refine the isolated account scope. The history API supports only a rolling six-month query window. Preserve exact pagination and query coverage; a `total` value or a partial page is not proof that the requested period has been fully exhausted.

For on-chain deposit/withdrawal records, `id` is Binance's internal history-row identity; `txId` is the chain transaction identifier. A withdrawal can additionally carry a caller-supplied `withdrawOrderId`. These values are not interchangeable. A shared `txId` by itself does not prove that two records describe the same asset movement: one chain transaction may contain more than one output or token event. A cross-platform match must pin network/chain and exact asset identity (including token contract where applicable), destination/source address and tag/memo where applicable, and the chain-specific transaction sub-event/output locator where needed. Binance's cited history responses do not supply a universal sub-event locator for every network. Without it, keep the candidate link UNLINKED or PARTIAL rather than joining by hash, amount and nearby time alone.

Neither the Spot `balanceUpdate` nor `outboundAccountPosition` payload carries the Wallet `tranId`, deposit-row `id`, withdrawal-row `id` or `withdrawOrderId`. Thus Wallet history can identify a transfer/deposit/withdrawal record, but it cannot be deterministically paired with one particular Spot balance event using the fields currently mapped. It can be related at family level to the resulting balance state; preserve both source observations and do not count the history record plus balance event as two independent asset movements.

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

### 3.4 SOR allocations are a separate execution family

Binance documents `GET /api/v3/myAllocations` (and WebSocket `myAllocations`) as the query for allocations resulting from SOR order placement. Each record includes `symbol`, `allocationId`, `allocationType`, `orderId`, `orderListId`, `price`, `qty`, `quoteQty`, `commission`, `commissionAsset`, `time`, `isBuyer`, `isMaker` and `isAllocator`. Query scope is per symbol; `orderId` can retrieve an order's allocations, while `fromAllocationId` continues the allocation history. The limit is 1000 and a start/end time interval cannot exceed 24 hours. Preserve exact request parameters, pagination and coverage; a full page is not exhaustion evidence.

SOR is not a synonym for an ordinary exchange trade. Binance's SOR FAQ states that a fill routed through SOR is represented as `matchType=ONE_PARTY_TRADE_REPORT`, with `tradeId=-1`, and an `allocId` that identifies the allocation. The SOR allocation query returns the corresponding `allocationId`. In a User Data Stream `executionReport`, preserve `a` (allocation ID), `b` (match type), `k` (working floor) and `uS` (used SOR) when present. The exact allocation link is scoped by provider profile/account, submitted symbol and `allocId == allocationId`; retain `orderId` as the parent-order relation and compare the available quantity, price, quote quantity and commission fields. Do not use `orderId` alone as the allocation identity.

A SOR order can contain **both** direct trades and SOR allocations. Direct trades are retrieved from `myTrades` with a non-negative trade ID; SOR allocations are retrieved from `myAllocations` by allocation ID. Keep these as different typed execution items under the same parent order. Do not force `tradeId=-1` into the direct-trade reconciler, and do not classify it as "no inventory movement": the SOR allocation is a separate provider-reported movement family. Conversely, do not count both the SOR allocation and its `executionReport` as two movements; they are two observations of one allocation identified by `allocId`.

The order-level `executedQty` and `cummulativeQuoteQty` are aggregate controls across the order's fills. The SOR FAQ examples show those totals alongside allocation items. When direct trades and allocations are both present, compare complete item coverage against these order totals only after both item families have independently demonstrated query exhaustion. Never add the order aggregate as an additional fill or inventory movement.

#### Per-item Spot inventory effect (derived, not a position)

For a directly traded fill or SOR allocation, the account-side gross asset movement can be represented as separate components, using the exact `baseAsset` and `quoteAsset` for the **submitted order symbol** from Exchange Information (do not parse asset codes from the symbol string):

- Account BUY: `+qty` in the base asset and `-quoteQty` in the submitted symbol's quote asset.
- Account SELL: `-qty` in the base asset and `+quoteQty` in the submitted symbol's quote asset.
- Commission: a separate `-commission` component in the exact `commissionAsset`.

Keep the commission component distinct even when its asset is the base or quote asset; only a later explicitly typed per-asset movement projection may combine components with exact decimal arithmetic. For SOR, the submitted symbol's quote asset remains the asset the account spends/receives even when the router consumes liquidity from another eligible symbol/quote book.

This projection is an explained effect of one execution item; it is not the current Spot balance, a native exchange position, valuation, PnL, or a complete inventory ledger. `account.status` remains the account-state observation. Its `free` quantity is available to trade/withdraw; `locked` is an amount of the same asset held by open orders or other platform services. Treat `free` and `locked` as a decomposition of one asset balance, not two additional holdings. A balance snapshot cannot be reconstructed from direct trades and SOR allocations alone because deposits, withdrawals, internal transfers, locks and other services also affect balances, and the Spot balance event stream is not exhaustive.

### 3.5 Actual commission versus tariff context

For a real fill, the reviewed Spot representations carry one actual commission amount and one charged asset: `myTrades.commission` / `commissionAsset`, and on `executionReport` with `x=TRADE`, `n` / `N` with the provider trade ID `t`. Keep that pair bound to the scoped trade identity. It is a trade attribute (`ATTRIBUTE_OF`), not a second fill or a separate balance movement to add to the fill. The REST and stream copies of the same trade commission are one charge with two evidence records.

Preserve the commission amount as a decimal string, including an explicit zero, and preserve `commissionAsset` exactly. Do not infer the charged asset from the market's base/quote assets, the configured discount asset, or the current account balance. A zero commission amount does not erase the fill. A non-trade `executionReport` (for example `x=NEW`, or the `t=-1` sentinel) is not a fee-bearing trade and must not create a commission fact.

`account.commission` / `GET /api/v3/account/commission` returns the account's **current** per-symbol standard, special and tax rates plus a discount configuration. Its response does not provide a tariff version or effective-from time. Capture the query and receipt times as observation times; do not present them as the tariff's historical effective interval. `order.test` / `POST /api/v3/order/test` with `computeCommissionRates=true` returns rates for a hypothetical test order; the endpoint validates the test order without sending it to the matching engine. Neither response is proof of the actual charge on a past fill.

The Commission FAQ describes standard, tax and special rate components, side/liquidity-role dependence, and a BNB discount that applies to standard commission but not tax or special commission; BNB payment also depends on account/symbol discount enablement and sufficient BNB balance. If BNB is insufficient, the commission may instead be deducted in the received asset. The trade records expose the actual total `commission` and `commissionAsset`, not a per-trade breakdown of those rate components. Therefore do not recompute, decompose, convert, aggregate by order ID, or substitute a tariff-derived amount for the provider-reported actual fee. If REST and stream disagree on amount or asset for the same scoped trade, classify the trade as conflicted.

### 3.6 Corrections, cancellations and prevented matches

The reviewed Spot documentation exposes order execution type/status, cancel/replace lineage fields, reject/expiry reasons and prevented-match identifiers. That does not establish a general trade-bust/correction endpoint or universal correction model. Until a documented operation is identified, correction/bust completeness is UNKNOWN.

A prevented match / STP event is not an executed fill. Preserve its distinct identifiers and quantities without adding it to trade quantity or gross executed exposure.

### 3.7 External lock/unlock observations

The JSON User Data Stream variant exposes `e`, `E`, `a`, `d` and `T`. The official SBE schema makes the field semantics more precise:
- `BalanceUpdateEvent`: `freeQtyDelta` maps to JSON `d`; `clearTime` maps to `T`.
- `ExternalLockUpdateEvent`: `lockedQtyDelta` maps to JSON `d`; `clearTime` maps to `T`.
- `OutboundAccountPositionEvent`: carries `updateTime` and per-asset `free` / `locked` quantities.

The optional SBE `subscriptionId` is also present on these event types. It identifies the stream subscription context; it is not a provider event ID, transaction ID, lock ID, loan ID, collateral-agreement ID or obligation reference. A common `subscriptionId` across these events therefore does not establish that they describe the same underlying operation.

The event-type distinction matters: the same JSON key `d` is a free-balance delta in `balanceUpdate` but a locked-quantity delta in `externalLockUpdate`. Preserve the event type, raw lexical value, exact asset, representation (JSON/SBE) and both source times. The reviewed schema identifies the lock field as `lockedQtyDelta` but does not specify a positive/negative direction convention; do not independently infer LOCK versus UNLOCK from the sign until an approved provider profile pins that convention.

The Spot User Data Stream describes `externalLockUpdate` as being sent when part of the Spot wallet balance is locked or unlocked by an external system (with margin collateral as an example). The payload does not expose the external system, loan/credit, collateral agreement, counterparty or obligation identity.

Therefore this event is evidence of a reported encumbrance/availability change, not proof of the underlying debt, contractual collateral relationship, asset valuation, collateral eligibility or settlement. It must not be counted as an additional asset or as a liability merely because a quantity changed. Relating it to a balance snapshot, balance delta, loan, position or settlement requires a separate explicit provider identity/mapping; same asset, amount, timestamp or subscriptionId is insufficient.

An external lock can change the distinction between total, free and locked amounts. Do not count the same units once as freely executable balance and again as a separately created collateral asset. Whether and how the underlying value enters the IMMORTAL asset-side partition is a profile qualification question, not an adapter inference.

### 3.8 Transfers, deposits and withdrawals — identity layers

The Spot User Data Stream documentation says `balanceUpdate` can occur on deposits, withdrawals and transfers between accounts (for example Spot to Margin), but its payload is only a balance delta: asset, delta and event/clear time. It has no documented `tranId`, deposit-row ID, withdrawal-row ID, blockchain `txId` or counterparty account ID. `outboundAccountPosition` is a changed-asset balance update and likewise has no common Wallet-record key. Same asset, amount and nearby `E`/`T`/receipt time may create a search candidate, not a proven event link.

Keep these identity layers separate:

- **Internal Binance product-wallet movement:** `tranId` from `GET /sapi/v1/asset/transfer`, with `type` declaring direction between product wallets, `asset`, `amount`, `status` and `timestamp`. It is not a blockchain transaction hash.
- **Binance inbound deposit record:** Wallet row `id` plus `txId`, `network`, `coin`, `address`, optional `addressTag`, amount, source/status/times. `sourceAddress` is only returned when `includeSource=true`.
- **Binance outbound withdrawal record:** Wallet row `id`, chain `txId`, `network`, `coin`, destination `address`, `amount`, `transactionFee`, status and times; `withdrawOrderId` is an optional caller-supplied lookup key, not the chain ID.
- **Spot balance effect:** a separate `balanceUpdate` / `outboundAccountPosition` observation. No common provider key currently links it one-to-one to any of the above history rows.

Use only `GET` Wallet history methods as documentation candidates. The transfer-creation `POST /sapi/v1/asset/transfer`, withdrawal-creation `POST /sapi/v1/capital/withdraw/apply` and all permission-changing or other mutating methods are outside this read-only work. The universal-transfer type vocabulary includes Spot ↔ Funding, Spot ↔ Futures, Spot ↔ Margin, Options and Portfolio Margin. Do not infer that all those scopes are included in the current Spot candidate; every source/destination product is a separate scope that would need its own profile and coverage.

The universal-transfer history endpoint is limited to six months and returns pages (`current`, `size` up to 100); deposit and withdrawal history queries are limited to 90-day windows with up to 1000 records per page. For withdrawal history, a `withdrawOrderId` filter constrains the time window to 7 days. Query coverage must preserve exact filters, pages, count/terminal evidence, and retrieval times. If the supported history horizon does not cover the required accounting period, coverage is PARTIAL/UNKNOWN; do not interpret no returned rows as zero historical transfers.

Deposit status codes include pending, success, rejected, credited-but-not-withdrawable, wrong-deposit and waiting-user-confirmation states. Preserve the provider's raw code and its documented status definition; do not collapse all credited/pending/restricted statuses to a single settled state. Withdrawal status remains a raw provider lifecycle field; do not invent a success/finality meaning from an undocumented enum. A `txId` is a chain transaction identity, not necessarily a unique asset-transfer event: chain-specific evidence may be required to distinguish outputs or token-transfer logs. The Binance internal row ID and chain ID must both be retained.

A transfer record proves only the movement stated within its documented product/account scope. It does not by itself prove beneficial ownership of an external address, the counterparty's identity, novation of a liability, discharge of a commitment, or finality of a related obligation. In particular, a transfer to Margin is not a borrowing record, and a transfer from Margin is not a repayment record; require the separate Margin borrow/repay history and obligation identity before classifying either.

### 3.9 Transfer, payment, discharge and novation are separate facts

The same asset movement can be relevant to several workflows, but it does not collapse them into one semantic event:

| Observed operation | What the source can establish | What it cannot establish by itself |
|---|---|---|
| Internal Binance wallet transfer (`tranId`, `type`, `asset`, `amount`, `status`) | A direction-coded movement between Binance product-wallet scopes, subject to the returned status | A loan, repayment, payment to an external creditor, discharge of an obligation, or novation |
| External deposit (`id`, `txId`, network, asset/address and status) | A Binance deposit history record and its reported chain reference/status | Beneficial ownership of the source address, the economic purpose, or discharge of an obligation |
| External withdrawal (`id`, `txId`, `withdrawOrderId`, address, amount, fee and status) | A Binance withdrawal history record and its reported destination/chain metadata | Beneficial ownership/control of the destination, creditor receipt, legal satisfaction of a debt, or novation |
| Authorized payment against an established obligation | A candidate `DISCHARGES` relation, but only after matching the existing obligation and the profile's payment/finality requirements | The creation of a new obligation or the transfer of debtor identity |
| Authorized transfer/novation of an obligation | A profile-governed change of responsible party while preserving canonical obligation lineage | Settlement or extinction merely because an asset was moved |

#### 3.9.1 Payment is not discharge by amount matching

To assert `DISCHARGES`, the profile must already identify the obligation/right being consumed. The evidence package must establish, at minimum:

1. canonical obligation/right identity and current lifecycle state;
2. authorized payment instruction or settlement reference bound to that obligation;
3. intended beneficiary/payee and a qualified binding between that beneficiary and the actual destination/account/address at the relevant time;
4. exact asset/network/unit, amount semantics (gross/net/fee), and the profile's explicit rule for full or partial payment;
5. source transfer/withdrawal record and the relevant destination receipt/finality evidence required by the profile;
6. idempotent consumption evidence so the same obligation cannot be settled twice.

A matching amount, asset, sign, timestamp, transaction hash or `withdrawOrderId` by itself is not this evidence. `withdrawOrderId` is a client-side identifier supplied when the withdrawal is created; it may correlate with a separately preserved payment intent only if that intent-to-ID binding is itself authenticated and retained. It is not a provider proof of the underlying obligation or authorization.

Until the evidence is sufficient, the transfer/payment and the obligation remain separate facts. The relation is INCOMPLETE or UNLINKED (or CONFLICTED where a declared identity resolves incompatibly); the existing obligation is not moved to R7 L4. R7's existing `settle: L1 | L2 → L4` transition remains exactly-once and requires the canonical right/settlement evidence; this document does not add a new R7 transition or define legal discharge.

#### 3.9.2 Internal wallet movement is not borrow or repayment

A `tranId` and direction `type` such as Spot → Margin prove only the Wallet operation represented by that history row. They do not prove that a margin loan was created, collateralized, repaid or extinguished. A Margin borrow/repay record and its own obligation identity/lifecycle must be collected and reconciled in the Margin product profile. The same rule applies to Futures funding transfers: a wallet movement to/from Futures is not itself a position close, realized PnL settlement or funding-fee payment.

The Wallet history record is one transfer fact, not a separate debit event plus credit event to be summed as two independent gross transfers. Its source/destination effects may be reflected in distinct product balance observations; those are state/effect observations and must not duplicate the `tranId` transfer as a second economic operation.

#### 3.9.3 Novation is not an asset transfer or operational reassignment

EXP-09 remains profile/research-owned for transferability and legal novation semantics. A true obligation transfer requires an explicit governing profile rule and evidence for the original canonical obligation, source and destination responsible parties, beneficiary/creditor, unchanged or explicitly amended terms and remaining amount, effective time, required consent, authorization and destination acceptance. The old and new references must retain lineage to one economic obligation unless the profile explicitly defines a lawful split/merge.

A Wallet transfer, a change of Binance sub-account/product wallet, a new address, an operator/worker reassignment or a changed local owner field does not establish novation. Without the profile rule and required attestations, preserve the original obligation and mark the proposed transfer relation INCOMPLETE/UNLINKED; do not erase the source responsibility, mint a second independent claim, or infer the destination's acceptance.

#### 3.9.4 No implicit netting; composed systems remain coupled

EXP-08 requires gross obligations to remain separately identifiable. Opposite balance movements, transfers in both directions, matching asset amounts, or a debit in one scope and credit in another do not create a netted obligation. Netting is possible only under an explicit profile policy with its own eligibility, consent, scope, timing and evidence; preserve the original gross records and the authorized net result separately.

Where a transfer/novation/payment couples two economic systems, apply C-COMP rather than reconciling each side independently: X2 requires one canonical exhaustive resource partition or non-overlapping exclusive shares; X4 requires an atomic cross-system commit or the same unresolved exposure represented in both systems until settlement; X5/X5b require the joint certificate and joint gate. References to the same cross-system obligation must not cause the same resource or commitment to be counted twice.

## 4. Timestamp and units contract

- Binance JSON time fields are milliseconds by default. The general REST documentation also supports requesting microseconds using X-MBX-TIME-UNIT. The candidate profile must pin one unit and reject mixed-unit ambiguity.
- Preserve provider source time fields exactly, then normalize without overwriting the raw value.
- Quantities, prices, commissions and rates are decimal strings. Preserve exact lexical value and asset/unit context; do not coerce through binary floating point.
- For executionReport, keep event time E, transaction time T, order creation time O, working time W and update time semantics distinct where present.
- Local receipt time is a separate observation timestamp, not a substitute for provider event time.

## 5. Read-only collection plan

Permitted candidate operations:
- account.status — signed USER_DATA;
- allOrders, order.status, myTrades, myAllocations, account.commission, allOrderLists — signed USER_DATA;
- subscribe/list/unsubscribe to authenticated User Data Stream — USER_STREAM;
- local receipt, hashing, normalization and replay of received payloads.

The three Wallet `GET` histories in §2.1 are documentation crosswalks only and are not included in the current S1 collection allowlist; they require separate scope/profile approval before collection.

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

The reviewed JSON payloads and SBE event definitions expose timestamps (`E`, `T`, `u`) and subscription context, but no per-account event sequence/cursor or provider event ID for these balance events. In the SBE message header for these event types, the fields identify message length/template/schema/version; they do not supply an account sequence. `subscriptionId` identifies the User Data Stream subscription, not an individual balance event. The SBE version must be pinned per environment: as of 2026-11-05 the official lifecycle lists PROD 3:5 and SPOT TESTNET 3:6. The `ServerShutdownEvent.shutdownTime` (`T`) field is only present from SBE 3:6; the current Production lifecycle remains at 3:5, so a Production SBE observer must not assume this field is available. Therefore:

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

The User Data Stream documentation identifies `eventStreamTerminated` for documented subscription-ending actions; the WebSocket API also exposes session subscription inspection. `serverShutdown` is an additional infrastructure-discontinuity signal. In the 2026-10-30 Spot Testnet rollout, its payload gained `T` (shutdown time); for SBE this field is present only in schema 3:6 and later. Production remains on SBE 3:5 as of 2026-11-05, so record `T` only when the negotiated environment/schema actually exposes it. None of these signals supplies a cursor for replaying events that were not received. These observations do not prove complete transfer lifecycle, counterparty identity or settlement finality.

## 7. Mapping to existing Arb envelope

| Existing Arb field | Binance candidate mapping |
|---|---|
| Provider / product | binance / spot only |
| Protocol / version | Spot WebSocket API v3 and User Data Stream; pin documentation revision, retrieval date, environment and SBE schema id/version. As of 2026-11-05, Binance lifecycle files report PROD SBE 3:5 (released 2026-07-07) and SPOT TESTNET SBE 3:6 (released 2026-10-30); never infer Production support from the latest schema file in the source tree. |
| Source operation | Exact method/event name, e.g. account.status, myTrades, executionReport |
| Data family | account_balance, collateral_lock_change (partial), order, direct_trade, sor_allocation, fee_schedule, order_list, prevented_match |
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
27. PROD SBE 3:5 versus TESTNET SBE 3:6 — pin schema by environment; do not assume `serverShutdown.shutdownTime` (`T`) exists in Production until its lifecycle announces 3:6+.
28. `myTrades.commission` and `executionReport.n` disagree for the same scoped trade ID — classify CONFLICTED; do not select one source.
29. Explicit zero `commission` with a reported `commissionAsset` — preserve zero and asset; do not drop the trade or synthesize a different fee.
30. `account.commission` or `computeCommissionRates` observed near a trade — do not infer the historical applied rate or recalculate its actual commission.
31. Multiple fills with one order ID but different trade IDs and commission assets — preserve one commission attribute per trade; do not aggregate/deduplicate by order ID.
32. BNB discount enabled but actual `commissionAsset` reports another asset — preserve the actual asset; do not infer BNB payment from the tariff flags.
33. A SOR `executionReport` has `tradeId=-1`, `matchType=ONE_PARTY_TRADE_REPORT` and `allocId`; preserve it as a SOR allocation candidate, not a direct trade or an empty event.
34. `executionReport.allocId` equals `myAllocations.allocationId` in the same scoped account/symbol — bind those two observations to one allocation; changed quantity/price/quoteQty/commission/asset is CONFLICTED.
35. One SOR order contains both direct trade IDs and allocation IDs — preserve separate execution items under one parent order; do not deduplicate by orderId or add order-level executedQty/cummulativeQuoteQty again.
36. SOR route uses another eligible quote book — apply the submitted order symbol's quote asset to the user's account movement; do not use the underlying book's quote asset.
37. Universal-transfer history `tranId` plus direction-coded `type` identifies one cross-wallet operation, but `balanceUpdate` has no `tranId` — retain the records separately; do not pair by amount/asset/time alone.
38. Deposit and withdrawal rows share a chain `txId` but have distinct internal IDs/network/asset/address/status fields — do not merge without chain-specific asset and sub-event evidence.
39. A withdrawal includes `transactionFee` and `withdrawOrderId` — preserve network fee and caller-supplied lookup ID separately from trade commission, internal row `id` and chain `txId`.
40. Deposit status is pending/restricted/rejected or waiting confirmation — preserve raw status; do not classify as a completed usable balance transfer.
41. Universal-transfer history is queried beyond the six-month retention window or pages are not exhausted — classify coverage PARTIAL/UNKNOWN; absence of rows is not proof of zero transfers.
42. A Spot → Margin `tranId` matches a borrow/repay asset and amount — do not classify as borrowing, collateralization or repayment without the separate Margin obligation record.
43. A withdrawal row matches an existing obligation by asset and amount but lacks its canonical obligation/payment reference and qualified beneficiary binding — no `DISCHARGES` relation and no R7 L1/L2 → L4 transition.
44. A withdrawal status or chain `txId` exists without destination receipt/finality or profile settlement evidence — preserve the withdrawal observation; do not infer legal/economic discharge.
45. A Wallet transfer or local owner reassignment changes the operational account/scope but lacks EXP-09 profile rule, source/destination party identity, consent and authorization — no novation and no erasure of the original obligation.
46. Opposite-signed transfers or payments concern separate obligations — retain gross facts; no implicit EXP-08 netting from sign, amount or asset.
47. A coupled cross-system obligation is observed on one side only — retain unresolved exposure on both sides under C-COMP X4 and avoid double-counting the shared resource under X2.
48. A `withdrawOrderId` resembles a local obligation ID but the signed/authenticated intent-to-ID binding is absent — treat as unqualified correlation metadata, not obligation identity.

## 9. Official sources reviewed

- Binance Spot REST API — security, timestamp and error semantics: https://developers.binance.com/en/docs/products/spot/rest-api
- Binance Spot WebSocket API — Account: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account
- Binance Spot Commission Rates FAQ: https://developers.binance.com/en/docs/products/spot/faqs/commission_faq
- Binance Spot Smart Order Routing FAQ: https://developers.binance.com/en/docs/products/spot/faqs/sor_faq
- Binance Spot API Glossary: https://developers.binance.com/en/docs/products/spot/faqs/spot_glossary
- Binance Wallet REST API — Asset (universal transfer history): https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/asset
- Binance Wallet REST API — Capital (deposit / withdrawal history): https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/capital
- Binance Spot WebSocket API — session and subscription methods: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/user-data-stream
- Binance Spot WebSocket API connection and session contract: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-api.md
- Binance Spot User Data Stream events: https://developers.binance.com/en/docs/products/spot/user-data-stream
- Binance Spot WebSocket stream event schemas (including externalLockUpdate): https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-streams/~schemas
- Binance SBE lifecycle — Production: https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/sbe_schema_lifecycle_prod.json
- Binance SBE lifecycle — Spot Testnet: https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/sbe_schema_lifecycle_testnet.json
- Spot Testnet changelog 2026-10-30 (SBE 3:6 and `serverShutdown.T`): https://github.com/binance/binance-spot-api-docs/blob/master/testnet/CHANGELOG.md
- Spot SBE schema 3:6: https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/spot_3_6.xml
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

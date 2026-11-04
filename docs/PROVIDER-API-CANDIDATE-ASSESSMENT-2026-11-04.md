# Provider API Candidate Assessment — Binance Spot vs Kraken Spot vs Coinbase Advanced Trade

**Status:** official-documentation desk review; candidate assessment only  
**Date:** 2026-11-04  
**Branch:** `Immortal-Protocol`  
**Decision:** Binance Spot is the recommended first *synthetic profile candidate* for review. No provider is selected for implementation, no account is connected, and no credentials are requested.

## 1. Purpose and boundary

This review tests which official provider API is the most useful first target for the existing Arb provider-neutral contract. It does not authorize a provider adapter, live collection, paper trading, or execution.

Arb remains a source-observation and reconciliation boundary. It does not become an economic ledger, valuation engine, netting engine, RiskBudget controller, EEV authority, Principal verifier, or actuator. All observations remain gross, scoped, versioned, and independently verifiable only where separate evidence exists.

## 2. Executive comparison

| Capability | Binance Spot (+ separate Margin docs) | Kraken Spot | Coinbase Advanced Trade |
|---|---|---|---|
| Account/balance reads | Documented account information endpoint; user-data account updates over WebSocket | Balance endpoint and ledger/history surfaces | Accounts API |
| Orders/current + history | Open orders and all-order history; order-list/OCO history | Open and closed orders; closed history paginated | Orders list/history with cursor-based paging |
| Fills/trades | `myTrades`, trade IDs and linked order IDs | TradesHistory; 50 records per page with `ofs` | Fills endpoint, cursor/pagination |
| Live private events | User Data Stream: balance and order events | Private WebSocket interfaces | Authenticated `user` channel |
| Fees | Per-trade commission fields and commission-rate endpoint | Order/trade fee fields and ledger | Fill/order fee details |
| Borrow/interest/liability evidence | Separate Margin API includes borrow/repay records and interest history | Ledger and product-specific account history; exact financing mapping needs further endpoint review | Not established by this Advanced Trade desk review |
| Pagination/history constraints | ID/time filters; several Spot order/trade queries impose a 24-hour maximum time window; Margin interest history documents 90-day lookback and 30-day query interval | Closed orders: 50/page with offset; TradesHistory: 50/page; export API offers longer historical retrieval workflow | Cursor pagination; endpoint-specific limits and retention still need profile pinning |
| Snapshot coherence | No common atomic snapshot across these separate REST families established by this review | No common atomic cross-family snapshot established | No common atomic cross-family snapshot established |
| Read-only permission design | Documentation distinguishes `USER_DATA` from `TRADE`; separate least-privilege key design is possible | API key permissions distinguish query scopes from modify/close scopes | Key permissions exist; exact least-privilege profile must be validated against current docs |
| Overall usefulness as first test | **High** — broad observable lifecycle surface and explicit private stream | **High** — strong historical ledger/export path; useful second comparator | **Medium** — clear order/fill stream surface; broader liability/financing coverage not established here |

This is a desk assessment, not a completeness certification. A missing item in this table means “not established by the reviewed documentation”, not “the provider cannot expose it”.

## 3. Binance Spot — recommended first synthetic candidate

Official sources reviewed:

- Spot REST API: https://developers.binance.com/en/docs/products/spot/rest-api
- Account WebSocket API: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account
- User Data Streams: https://github.com/binance/binance-spot-api-docs/blob/master/user-data-stream.md
- Official API documentation index: https://github.com/binance/binance-spot-api-docs
- Margin borrow/repay and interest: https://developers.binance.com/en/docs/products/margin-trading/borrow-and-repay/Margin-Account-Borrow-Repay

### Evidence strengths

1. Spot account information is available through a USER_DATA endpoint.
2. Order history distinguishes active, canceled and filled orders. The documented account order history supports order-ID and time filters.
3. Trade history exposes trade ID and order ID, and records execution facts such as price, quantity, commission, commission asset and time.
4. User Data Streams expose account balance changes and order/trade updates in real time.
5. Documentation separates `USER_DATA` from `TRADE`; it states that API keys do not have trading permission by default and describes using a separate USER_DATA-only key for monitoring.
6. The separate Margin API documents borrow/repay records, principal, interest, status and transaction ID, plus interest history with a stated 90-day lookback and 30-day maximum interval.

### Constraints and unknowns

- Several Spot history queries have endpoint-specific limits, including a maximum 24-hour range for some time-filtered order/trade-history requests. Collection must use the documented cursor/ID/time strategy and prove exhaustion; one broad query cannot be treated as full history.
- Margin interest history is bounded by documented lookback/query windows. Historical completeness must be qualified to the available window.
- Spot balances, orders, fills and Margin liabilities are separate source families. No cross-family atomic snapshot is established by this review.
- Spot is not the same thing as Futures, COIN-M, Options, Portfolio Margin or every wallet product. Do not claim those are covered by a Spot profile.
- User Data Stream events are observations, not proof of durable delivery, gap-free replay, settlement finality or independent verification. REST reconciliation and explicit gap handling remain necessary.
- This review does not select or implement a Binance product/profile version.

### Proposed initial profile perimeter

`BINANCE_SPOT_READONLY_CANDIDATE` — synthetic fixtures only:
- account balances;
- open orders and order history;
- trade/fill history;
- per-trade commissions and commission-rate metadata;
- private user-data event shapes for account and order updates.

Explicitly out of scope for this first profile:
- Margin, Futures, Options, Portfolio Margin and Earn;
- deposits/withdrawals and wallet transfer lifecycle;
- tax/accounting statements;
- EEV, executable liquidity, collateral eligibility, valuation or netting;
- any order placement, cancel, amend, borrow, repay, transfer or withdrawal operation.

Margin debt/interest is a separate follow-on profile candidate, not silently merged into Spot.

## 4. Kraken Spot — strong historical comparator

Official sources reviewed:

- API Center: https://docs.kraken.com/api/
- Closed Orders: https://docs-legacy.kraken.com/api/docs/rest-api/get-closed-orders/
- API key permission metadata: https://docs.kraken.com/api/docs/rest-api/get-api-key-info
- Account history export guidance: https://support.kraken.com/in/articles/360025484891-how-to-export-your-account-history-via-api
- TradesHistory guidance: https://support.kraken.com/articles/360000912103-how-to-retrieve-your-account-s-trading-history

### Evidence strengths

- Closed orders return up to 50 records per request and expose offset pagination, order status, open/close times, executed volume, cost, fee and linked trade IDs where requested.
- TradesHistory returns up to 50 records per request with offset pagination.
- Kraken documents an export workflow for longer trades/ledger histories, including asynchronous request status and retrieval.
- API key permission metadata separates querying funds, open/closed trades and ledger from modifying/closing trades, deposits and withdrawals.

### Constraints and unknowns

- Offset pagination must be bounded and its terminal condition evidenced; the API's returned count and ordering need to be pinned in a provider profile.
- Export is a distinct asynchronous workflow, not interchangeable with a live snapshot or a gap-free event stream.
- Exact spot/margin/futures product coverage, correction semantics, settlement meaning, retention and cross-family snapshot guarantees require further endpoint-by-endpoint review.
- No claim is made that all financing or liability categories are covered by the inspected Spot documentation.

Kraken is an excellent second comparator, particularly for ledger and historical-export reconciliation, but a slightly less direct first exercise for the combined live account/order event stream plus a distinct margin-interest follow-up.

## 5. Coinbase Advanced Trade — useful order/fill comparator

Official sources reviewed:

- Advanced Trade WebSocket feed: https://help.coinbase.com/en/developer-platform/websocket-feeds/advanced-trade
- Advanced Trade API documentation entry point: https://docs.cdp.coinbase.com/advanced-trade/docs/welcome
- Advanced Trade reference entry point: https://docs.cdp.coinbase.com/advanced-trade/reference
- Coinbase order-management semantics: https://help.coinbase.com/en/coinbase/trading-and-funding/advanced-trade/order-management

### Evidence strengths

- The authenticated `user` WebSocket channel provides private user/order-related updates.
- The API surface includes account, order and fill retrieval; order/fill pagination uses cursor-based pages.
- Coinbase's user-facing documentation explicitly distinguishes partially filled orders and funds held for open orders, useful reminders for preserving order lifecycle and available-vs-held balance distinctions.

### Constraints and unknowns

- The current desk review did not establish a complete, typed account-liability, borrow/interest, collateral and settlement family comparable to the Binance Margin or Kraken ledger paths.
- Exact cursor exhaustion, retention, correction/bust semantics, and cross-family snapshot behavior still need to be pinned from endpoint-level official references before a profile can be considered.
- Advanced Trade must not be conflated with Coinbase Exchange API or other Coinbase products.

Coinbase is a useful order/fill stream comparator, but the currently reviewed official material supports a narrower initial lifecycle assessment.

## 6. Why Binance Spot is the first candidate — and what this does not mean

The recommendation is based on test value, not brand preference:

1. It covers the core first slice: account balances, orders, fills, fees and private event updates.
2. Its documented permission model supports a design that separates USER_DATA from TRADE.
3. Its separate Margin documentation gives a later, concrete way to test financing/liability observations without adding those semantics to the Spot profile.
4. Its endpoint constraints create realistic fixtures for pagination windows, historical incompleteness and stream/REST reconciliation.

It does **not** mean:
- Binance is selected by the user or approved as an integration;
- a Binance profile is implemented or conformant;
- account data is complete, atomic, independently verified or economically qualified;
- an API key or account connection should be created;
- S2 or S3 is authorized.

## 7. Required next work before any profile implementation

1. Pin exact official Spot REST/WebSocket endpoint versions and retrieve the current endpoint schemas.
2. Build a family mapping table with source operation, provider fields, IDs, units, event/correction semantics, pagination and documented query limits.
3. Distinguish source-guaranteed, documented-conditional, observed-only, unknown and not-exposed fields.
4. Specify REST snapshot + WebSocket handoff/reconciliation without claiming atomicity or gap-free replay.
5. Build synthetic adversarial fixtures: partial fill, cancel/replace, duplicate event, missing event, delayed event, fee asset, historical query window truncation, stream disconnect, and cross-family time skew.
6. Keep Margin as a separate candidate profile until its account, debt, interest, transfer and repayment families are reviewed independently.
7. Reconcile each mapped source fact with an existing IMMORTAL consumer; do not create universal account state, EEV, ProtectedCapital, netting, risk or authority semantics.
8. Keep S1 synthetic-only. D0, D1, independent review and provider conformance remain OPEN; S2/S3 remain unauthorized.

## 8. Non-regression

This document is documentation-only. It does not change schemas, reducers, wallet code, IMMORTAL contracts, EXP semantics, EEV, ProtectedCapital, RiskBudget, admission, verifier, authority or actuation. It does not add provider credentials, network clients or a live adapter.

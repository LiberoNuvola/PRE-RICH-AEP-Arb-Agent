# Margin Consistency Crosswalk v0.1

**Date:** 2026-11-06  
**Repository:** PRE-RICH AEP Arb Agent  
**Status:** documentation-only; Binance Margin is not selected or enabled in S1

## 1. Boundary

This crosswalk complements the Binance Spot read-only candidate endpoint mapping and cross-family reconciliation contract. It is not a provider adapter, accounting ledger, valuation engine, collateral registry or economic authority. No Margin endpoint, stream, credential, account or mutation is enabled.

Cross Classic, each Isolated pair, Spot, Wallet transfer history and liquidation-deficit loans remain distinct scopes/families.

## 2. Evidence classes

| Class | Provider evidence | What it establishes | What it does not establish |
|---|---|---|---|
| Asset/liability snapshot | GET /sapi/v1/margin/account; GET /sapi/v1/margin/isolated/account | Current reported buckets, liabilities, interest and account/pair risk values | Loan-event history, atomic global state or collateral agreement |
| Debt event history | GET /sapi/v1/margin/borrow-repay | BORROW/REPAY rows, txId, status, principal and interest | A universal original-loan ID in other families |
| Actual interest history | GET /sapi/v1/margin/interestHistory | Charged-interest rows with txId, type, asset, principal and interest | Which original borrow created each row |
| Broad capital flow | GET /sapi/v1/margin/capital-flow | Activity rows including borrow, repay, trades, liquidation and auto top-up; id, tranId, type and amount | A second independent movement for each activity or equality mapping to borrow-repay txId |
| Institutional-loan classifier | capital-flow.note | Since 2026-07-10, category labels for institutional transfer, borrow and repay | A unique contract/loan/obligation ID; note is classification, not lineage |
| Collateral/risk calculation | Margin Level, Borrow Margin Level, Transfer-Out Margin Level and aggregate collateral fields | Provider-computed risk/capacity views over existing account resources | New asset lots, separately pledged units or a second liability |
| Collateral/price parameters | crossMarginCollateralRatio, priceIndex, risk-based-liquidation-ratio | Parameter and price observations used by provider calculations | A user-specific asset movement or pledge; Cross ratio parameters do not apply to Isolated |
| Capacity/supply | maxBorrowable, maxTransferable, available-inventory | Current borrow/transfer capacity and provider lending-pool supply | A completed borrow, repayment, wallet transfer or collateralization |
| Ordinary Margin transfer | GET /sapi/v1/margin/transfer and Wallet universal-transfer history | Cross-wallet movement and direction/scope metadata | Borrow, repayment, settlement, novation or another independent asset movement |
| Force liquidation | GET /sapi/v1/margin/forceLiquidationRec, Margin order/trade and capital flow | Order-level liquidation execution evidence where returned | Full debt discharge or proof no liquidation occurred when history is empty |
| Liquidation-deficit loan | GET /sapi/v1/margin/liquidation-loan and .../repay-history | A distinct Cross bankruptcy deficit loan and original/repaid/remaining totals | Ordinary Margin borrow or direct link to a force-liquidation order or borrow-repay txId |

## 3. Resource consistency rules

### 3.1 One reported asset state, multiple views

Preserve exact per-asset/per-pair fields: free, locked, borrowed, interest, netAsset and (where returned) totalAsset/netAssetOfBtc. The current API response schema does not specify a complete algebraic derivation for netAsset; Arb must not reconstruct it as free + locked − borrowed − interest.

Do not:
- add free and locked to netAsset as if they were separate holdings;
- add per-asset rows to aggregate BTC totals or TotalCollateralValueInUSDT;
- treat collateral value, Margin Level, Borrow Margin Level or Transfer-Out Margin Level as additional assets;
- combine a Cross row with an Isolated base/quote row merely because the asset code matches;
- use a Spot balance or Spot externalLockUpdate as a Margin balance/loan/collateral row.

Provider collateral value is a derived view over the same underlying resources. It is not a newly created resource or evidence that a separate security-interest agreement exists.

### 3.2 Cross Classic risk views are separate calculations

The dedicated Binance Margin Level and Risk Control page was updated 2026-06-18 and says the revised calculation applies from 2026-06-15:

1. **Account Margin Level** = collateral value / (total liabilities + outstanding interest). The published calculation uses Price Index and BTC values. For net-positive positions, haircut and Price Index apply to net asset value after liabilities and interest; the debt-equivalent portion is recognized at 100%. For net-negative positions with assets still positive, asset value is recognized at 100%. Outstanding interest for this view is first interest + periodic interest − interest paid.
2. **Borrow Margin Level** is a borrowing-capacity view using collateral value, Mark Price and the Borrow Collateral Ratio.
3. **Transfer-Out Margin Level** is a transfer-capacity view using collateral value, Mark Price and the Transfer-out Collateral Ratio. Binance says Borrow and Transfer-out ratios may differ and apply to net collateral. For these capacity views, outstanding interest is first interest + total periodic interest, without the interest-paid subtraction stated for Account Margin Level.

The provider example applies maximum Mark Price to debt tokens and minimum Mark Price to other tokens. Keep Price Index and Mark Price observations distinct with their own timestamps/scopes. Never reconstruct the levels from asynchronously sampled snapshots or collapse them into a single scalar.

**Documentation conflict:** the generic Cross Margin Collateral Haircuts FAQ retains text that says Classic Margin Level does not incorporate haircuts. This conflicts with the dedicated Risk Control page updated 2026-06-18. The dedicated page is the chosen current formula source; retain the conflicting FAQ as a documentation/version caveat. A time-pinned collateral-ratio response is still required before numeric parameters can be used.

### 3.3 Isolated Margin is pair-local

Only assets in the exact Isolated pair account can serve as collateral for that account. Assets in Cross Margin or another Isolated pair are not shared collateral. Isolated Margin Level is total value of assets in that pair divided by total liabilities plus outstanding interest, with values in quote currency. Borrow Margin Level is a separate Mark Price view. Cross collateral-ratio schedules do not apply to Isolated.

Pair scope remains part of every identity. Matching the asset code does not allow pooling a base-asset row from one pair with a quote-asset row from another.

## 4. Liability and event consistency

| Pair | Permitted use | Non-regression |
|---|---|---|
| Borrow/repay history ↔ account snapshot | A CONFIRMED operation may explain a later snapshot change | Snapshot is state, not another debt event; PENDING is unresolved; FAILED is not an account effect |
| Borrow/repay ↔ capital-flow | Compare event family and provider IDs only where exact source mapping exists | Keep txId, id and tranId distinct; institutional note is not a join key or second loan event |
| Repay row ↔ interest history | Preserve principal repaid, repayment-interest component and interest charges as separate facts | No origin-borrow ID in interestHistory; do not re-add interest to snapshot or allocate by asset/time/amount |
| Margin transfer ↔ Wallet transfer / capital-flow | Compare one cross-wallet action if an explicit shared ID is documented | Current schemas do not prove equality between Margin transfer txId, Wallet tranId, capital-flow tranId or borrow-repay txId |
| Force-liquidation record ↔ Margin order | Exact scoped orderId may link the record to its order | Execution evidence is not proof of debt discharge |
| Force liquidation ↔ liquidation-deficit loan | Record the provider-described causal context | No shared liquidation-order ID is exposed; keep record-level relation unresolved |
| Liquidation-deficit summary ↔ repayment history | Compare aggregate amount, repaidAmount and remainingAmount with returned rows | repayId is repayment-row ID, not loan ID; history is 90 days and excludes FAILED; PENDING is not completed |
| Liquidation-deficit ↔ ordinary Margin borrowed/interest | Preserve as separate exposure family | No shared origin ID or explicit inclusion rule; do not merge, net or silently add |
| Small-liability conversion ↔ liability | Evidence of debt denomination conversion | No originating loan ID or discharge evidence; not cash repayment/netting |
| Snapshot ↔ risk parameters/prices | Explain provider outputs only with aligned timestamps/scope | No synthetic risk result from stale/asynchronous inputs |

### 4.1 Cross liquidation-deficit loan

Binance introduced two read-only endpoints on 2026-05-05:

- GET /sapi/v1/margin/liquidation-loan: current Cross liquidation-deficit summary with asset (USDC by default), original amount, repaidAmount and remainingAmount. Binance describes it as a shortfall when Cross account equity becomes negative after liquidation (bankruptcy).
- GET /sapi/v1/margin/liquidation-loan/repay-history: paginated rows with repayId, asset, amount, status (SUCCESS or PENDING) and createTime, plus total. It supports a maximum 90-day query range (default last 7 days); failed rows are excluded.

This is not ordinary borrow-repay. The repayment history has no liquidation-loan ID or originating force-liquidation order ID. The aggregate summary is a snapshot; repayment-history rows are events. Do not add summary amount to the same residual balance, and do not treat PENDING as completed. Query completeness is bounded by the 90-day range/retention. Binance's account-activity guide notes takeover liquidation may have no liquidation-history record, so absence of a force-liquidation row does not prove no liquidation occurred.

### 4.2 Institutional loan marker

The Margin change log effective 2026-07-10 added optional capital-flow.note values:
- INSTITUTIONAL_LOAN_TRANSFER
- INSTITUTIONAL_LOAN_BORROW
- INSTITUTIONAL_LOAN_REPAY

Preserve raw note. It is a useful category marker but no unique institutional loan/contract/obligation ID is exposed. Do not infer a canonical relationship to borrow-repay txId or capital-flow id/tranId; do not add a note-tagged capital-flow row as a second debt/transfer fact.

## 5. Query coverage

- Cross/Isolated account queries, price-index queries, capacity outputs and asset metadata are point observations, not a globally atomic Margin state.
- Preserve exact query parameters, receipt time, provider timestamps and per-family pagination boundaries.
- Capital-flow is limited to 90 days and a maximum 7-day range per request; fromId does not extend the time range.
- Liquidation-loan repayment history is limited to a 90-day range and excludes FAILED rows.
- Interest history has 90-day retention and maximum 30-day query windows; borrow/repay history has separate 7/30-day constraints.
- Do not infer zero liabilities, zero interest, no liquidation or no collateral from an absent row, unrequested endpoint, unexhausted page or gap between non-atomic snapshots.

## 6. IMMORTAL boundary

This crosswalk preserves:
- EXP-03: identity, eligibility, valuation, haircut and executable liquidity remain distinct.
- EXP-05: settlement consumes an established right exactly once; these repayment records do not supply a canonical IMMORTAL obligation ID.
- EXP-06 / EXP-12: provider observation/category marker does not prove verifier trust or Principal authority.
- EXP-08: preserve gross obligations; no implicit netting.
- EXP-09: transfer/reclassification/institutional note is not novation.
- EXP-10: RiskBudget, RealizedExposure and ProtectedCapital remain separate.
- X2: shared resources are counted once or partitioned exclusively.
- X4: cross-system obligations commit atomically or remain unresolved in both systems.

No IMMORTAL accounting formula, ProtectedCapital/R7, C-COMP or economic authority is changed. Arb adds no Margin ledger or parser. Provider selection, live conformance, D0/D1 and independent review remain open.

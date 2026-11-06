# IMMORTAL / Arb — Cross-Family Reconciliation Contract v0.1

**Status:** S1 design boundary; synthetic/read-only; non-normative for IMMORTAL policy  
**Date:** 2026-11-05  
**Scope:** provider observations for balances, orders, fills, fees, collateral/locks, positions, liabilities, transfers and settlement  
**Ownership:** Arb preserves and relates provider evidence; the applicable profile interprets domain facts; IMMORTAL owns protected accounting, economic admission and normative composition.

## 1. Purpose

This contract defines how Arb may record relations between facts exposed by different provider data families without collapsing them into a second account ledger.

Cross-family reconciliation is not a process of summing every number returned by every endpoint. It distinguishes:
- two observations of the same source fact;
- two different facts related by causation or lifecycle;
- a snapshot of state that reflects one or more earlier events;
- a charge/obligation that is an attribute of another source fact;
- a settlement that may discharge an already-established obligation/right.

Only the first relation can justify one canonical source-fact projection. The other relations must preserve both facts and their separate meanings. No relation by itself authorizes valuation, netting, novation, settlement, or an IMMORTAL state transition.

## 2. IMMORTAL accounting boundary reused

The IMMORTAL R7 accounting contract is two-sided:

- asset-side cells A1–A5 describe executable assets and their valuation/evidence state;
- commitment-side cells L1–L6 describe accepted commitments, conditional allocation, unresolved exposure, settled obligations, expired rights and unrepresented exposure;
- the A4 ↔ L3 contingency relation is explicit;
- historical facts H are separate from both sides;
- RawSurplus = max(0, EEV - ProtectedCapital) is the derived boundary between the two sides, not another bucket.

The profile must prove the partition exhaustive and disjoint (PC1–PC7). An omitted commitment may leave the arithmetic over recorded cells internally consistent while overstating RawSurplus. Arb therefore cannot declare completeness because its endpoints all returned HTTP success or because its locally observed rows reconcile.

Relevant existing IMMORTAL contracts:
- [Accounting Partition and Conservation Certification — R7 v3](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/docs/02-certification/ACCOUNTING_PARTITION_AND_CONSERVATION_CERTIFICATION.md)
- [Composition Contract — C-COMP v3](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/b3-materios-provenance-evidence/docs/01-contracts/15_COMPOSITION_CONTRACT.md)
- [EXP-01…EXP-12 Universal / Profile / Adapter Ownership Matrix v1](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/docs/research/EXP-01-12-UNIVERSAL-PROFILE-ADAPTER-OWNERSHIP-MATRIX-v1.md)
- [IMMORTAL–Cormia EXP Generalization Crosswalk v1.0](https://app.notion.com/p/40cc4454d6d581b1b4cac0eb7468d1c2?pvs=204)

This is reuse of existing boundaries, not a new Arb ledger, new ProtectedCapital formula, or new IMMORTAL rule.

## 3. Relation vocabulary

These labels are design terms for the review process; they are not yet a universal schema enum or an implemented reconciler.

| Relation | Meaning | What may be concluded |
|---|---|---|
| SAME_SOURCE_FACT | Different provider representations identify the same provider-native fact under a complete scoped identity | One derived source-fact projection may reference all contributing ObservationRecords; originals remain preserved |
| ATTRIBUTE_OF | A value or classification is an attribute attached to another fact (for example, commission amount on a trade) | Keep the attribute bound to its parent fact; do not duplicate the parent fact or silently turn a schedule into an actual charge |
| CAUSES_OR_AFFECTS | One event may cause or affect another family’s state (for example, a fill may affect balances) | Preserve both events and their different semantics; causal attribution requires explicit evidence |
| STATE_SNAPSHOT_OF | A snapshot represents state at a boundary after one or more events | Preserve its snapshot scope/time; do not add the snapshot quantity to its causal events |
| ENCUMBERS_OR_RELEASES | A lock/unlock changes availability or encumbrance of an asset | Preserve the lock event and the underlying asset separately; it does not itself create a new asset or prove a debt |
| DISCHARGES | An authorized settlement consumes an already-established obligation/right | Reduce the obligation exactly once only with the applicable settlement/finality evidence |
| TRANSFER_OF | An explicit transfer moves an identified resource/obligation between declared scopes | Preserve source, destination, terms, authorization and history; do not infer ownership or novation from balance movements |

A missing relation is not proof that two observations are independent, unrelated, or zero. It means that Arb cannot assert the relation from the available evidence.

## 4. Evidence and join rules

### 4.1 Minimum scoping

Any proposed relation must be scoped by the exact ProviderProfile identity and version and must preserve the relevant resource/account scope. Depending on the fact, the join identity may additionally require:
- provider product and environment;
- symbol/instrument or exact asset identity;
- provider-native event, trade, order, fee, transfer, loan, settlement or collateral reference;
- source operation and source family;
- unit, precision and amount semantics;
- effective/source time and snapshot/query boundary;
- correction, reversal or supersession lineage.

The identity must come from an official provider contract or an explicitly qualified application profile. Do not synthesize it from labels, tickers, matching values, amount/time proximity, array order, or a local ObservationRecord eventId.

### 4.2 No amount/time joins

The following are insufficient to link facts:
- same asset;
- same quantity or delta;
- nearby timestamps;
- same account scope;
- same order ID where the two facts are not documented as the same semantic object;
- a local event ID generated independently for each observation.

When no provider-native or profile-authorized join key exists, preserve both observations as unlinked. Do not emit a merged fact and do not assign a false NO_OVERLAP result.

### 4.3 Status interpretation

The following are design dispositions, not current schema enums:
- MATCHED: a complete provider/profile-scoped identity and required field agreement establish the declared relation.
- INCOMPLETE: a plausible relation exists but one or more required identifiers, fields, coverage conditions or temporal boundaries are missing.
- CONFLICTED: the same declared relation key resolves to incompatible facts or correction lineage.
- UNLINKED: no documented relation key is available. Both records remain valid observations of their own source families; no cross-family claim is made.

A relation status never upgrades ObservationRecord quality, verifies raw bytes, qualifies provider trust, establishes Principal ownership, or creates authority.

## 5. Family-by-family relation matrix

| Family A | Family B | Permitted relation to investigate | Non-regression rule |
|---|---|---|---|
| Order | Direct trade / SOR allocation | Direct trades use scoped non-negative trade IDs; SOR allocations use `allocId == allocationId` under the same account/symbol/order. SOR orders can contain both item types. | Keep direct trades and allocations distinct; never infer allocation identity from orderId alone; do not add order aggregate quantities as another execution item |
| Direct trade / SOR allocation | Actual fee/commission | `myTrades`/`myAllocations` carry actual commission attributes; `executionReport.n`/`N` carry the stream representation. SOR commission binds through `allocId`/`allocationId`; direct trade commission through tradeId. | Compare amount and asset per exact item identity; preserve one charge with multiple evidence records; never aggregate/deduplicate by parent order ID |
| Direct trade / SOR allocation | Balance delta/snapshot | An execution item may affect later account balance state | No join by asset + amount + nearby time; a balance delta/snapshot is not a second execution and does not by itself prove settlement |
| Balance delta | Account balance update | A deposit/withdrawal/inter-account transfer may later be reflected in a changed-asset balance event | `balanceUpdate` is not exhaustive for balance changes and has no shared event key with `outboundAccountPosition`; no one-to-one pairing or delta-based reconstruction |
| Balance | External collateral lock | The event semantics permit an `ENCUMBERS_OR_RELEASES` relation in principle; record-level relation to a specific balance update/snapshot remains unlinked without a documented shared identity | Do not link on asset/amount/time/subscriptionId; do not count the same units as both free executable balance and an additional collateral asset; lock event alone does not establish a debt or its creditor |
| Direct trade / SOR allocation | Derived Spot asset movement | Each complete item has a derivable account-side base/quote movement and a separate commission component; SOR uses the submitted order symbol's quote asset | This is an item-level flow projection, not a live balance or native position; do not reconstruct complete account inventory from executions alone or add `free` and `locked` as separate holdings |
| Direct trade / SOR allocation | Spot account balance | The execution item may partially explain subsequent asset balances, using side, submitted-symbol base/quote mapping and actual commission asset | Compare item effects to balance state only as partial explanatory evidence; balances also change through non-trade services and have no exact shared snapshot cursor |
| Margin borrow / repay | Margin liability snapshot | Borrow/repay history has per-operation txId, BORROW/REPAY type, status, asset and scope; Cross/Isolated snapshots expose borrowed and interest by asset | Only CONFIRMED operations describe completed account effects; snapshots are state, not additional debt events; preserve Cross and Isolated scopes separately |
| Margin borrow/repay | USER_LIABILITY_CHANGE stream event | The stream reports asset, update type, principal and interest quantities | No txId or originating obligation ID in the stream schema; do not deduplicate to REST by asset/amount/time alone |
| Margin repay | Actual interest history | A repayment row contains principal and interest components; interestHistory independently records interest charges by txId and type | Preserve principal, repay-interest and interest-history facts distinctly; do not double-count or join to an originating borrow without an explicit shared ID |
| Margin capital-flow | Borrow/repay and Margin transfer history | Capital-flow rows expose id, tranId, type, asset, symbol and amount | Keep ID namespaces separate; the published schemas do not establish tranId=borrow-repay txId or equality with Wallet transfer tranId |
| Margin collateral/risk snapshot | Borrowed assets / Margin liabilities | Margin account exposes free/locked/borrowed/interest/netAsset and risk ratios | Keep constituent buckets and aggregate metrics distinct; collateral haircuts, risk ratios and totals are account-level calculations, not extra assets, debts or collateral-agreement evidence. Do not sum with constituent rows |
| Margin snapshot buckets | Margin collateral/risk values | The same Cross or Isolated asset state contributes to provider-calculated collateral and risk outputs | Collateral Value/Margin Level are derived views over the account's existing assets and liabilities, not a second asset, pledge transaction or extra ProtectedCapital; do not add them to per-asset rows |
| Margin capital-flow institutional-loan note | Borrow/repay and transfer histories | Since 2026-07-10, note labels institutional loan transfer/borrow/repay categories | The note is a category marker, not a canonical loan ID; do not join or sum the record as a second loan event without a source identity relation |
| Margin force liquidation | Margin order / debt lifecycle | Force-liquidation record can link to Margin order by scoped orderId | Liquidation execution is not itself proof of debt repayment or full liability discharge; reconcile resulting trades and later liability state separately |
| Cross liquidation-deficit loan | Ordinary Cross Margin borrowed/interest snapshot | The liquidation-loan endpoint reports a bankruptcy deficit created when liquidation leaves Cross equity negative | This is a separately typed USDC deficit loan; no field establishes inclusion/exclusion in all account aggregates or links it to normal borrow-repay txId. Keep separate and unresolved; do not add it to borrowed/interest without exact provider proof |
| Cross liquidation-deficit repayment history | Liquidation-deficit loan summary | Repayment rows expose repayId, asset, amount, SUCCESS/PENDING status and createTime; current summary exposes original/repaid/remaining amounts | PENDING does not reduce a liability; SUCCESS is completed repayment evidence. History excludes failed records and is limited to 90 days; no repayment row carries a liquidation-loan ID or force-liquidation orderId |
| Cross Margin haircut/price inputs | Collateral/risk snapshot | Cross Classic uses Price Index for Margin Level and Mark Price plus collateral ratios for Borrow/Transfer-Out Margin Level | Three views have different price bases and interest inputs; never combine them into one ratio or rebuild them from non-atomic observations |
| Isolated pair asset buckets | Cross collateral ratios / other Isolated pairs | The pair account alone supplies its collateral scope | Cross collateral ratios do not apply; no sharing across pairs or Cross scope |
| Small-liability exchange | Source/target asset liability | History records a source asset/amount and target asset/amount | Preserve as debt-denomination conversion; no original debt ID or settlement/discharge proof is exposed |
| Balance | Borrow/liability | A loan disbursement could affect an asset balance while also establishing a liability | Require explicit loan/borrow identity and product-specific source semantics; never infer a loan from a balance increase. Spot remains outside Margin liability scope |
| Liability | Settlement | Settlement may discharge an established right/obligation | Require the same obligation identity, authorized settlement reference, asset/amount, lifecycle state and applicable finality evidence; discharge once |
| Internal Wallet transfer | Source/destination product-wallet balances | Wallet history `tranId` plus direction-coded `type` records one cross-wallet operation; the record does not carry the balance-stream's event ID | Keep the `tranId` record and each balance observation separate; no amount/asset/time-only pairing; a product transfer is not a trade, borrow, repayment, settlement or novation |
| Wallet deposit/withdrawal | External chain movement | Binance history row `id` identifies its internal record; `txId` identifies the chain transaction; network, asset, addresses/tags and status provide context | `txId` alone may not identify a unique output/token event; require chain-specific asset and sub-event evidence for cross-platform joins; do not confuse `withdrawOrderId` or internal row `id` with `txId` |
| Deposit/withdrawal or internal transfer | Spot balance event/snapshot | The history operation may explain a later account balance delta or snapshot | Spot `balanceUpdate`/`outboundAccountPosition` expose no `tranId`, Wallet row `id` or `withdrawOrderId`; retain separate evidence and do not assert a one-to-one event pairing |
| Transfer/payment | Established obligation/right | A transfer can be a candidate payment effect only when a profile-bound payment instruction identifies the canonical obligation, beneficiary, asset, amount semantics and applicable finality evidence | Do not infer `DISCHARGES` from asset/amount/time/txId/status alone; only the existing R7 settlement transition may consume L1/L2 → L4, exactly once |
| Obligation transfer / proposed novation | Original and destination obligation records | EXP-09 profile policy may authorize a responsibility change with source/destination identity, consent, authority, terms and preserved obligation lineage | A wallet move, changed account/address or operational reassignment is not novation; no universal legal novation rule is selected |
| Opposite transfers / separate obligations | Gross obligation set | A declared profile may define a permitted netting relation | EXP-08: retain gross identities and amounts; no offset by opposite signs, common asset, amount or timestamp |
| Coupled cross-system transfer / obligation | Joint composed state | X4 requires atomic commit or exposure unresolved in both systems; X2 requires one canonical partition or non-overlapping resource shares | Do not locally discharge/reassign one side while the other is absent; do not double-count the shared resource |
| Collateral | Liability/financing | A collateral relation may secure a separate liability | Require explicit collateral-agreement/loan relation and profile semantics; an encumbrance is not the liability itself |
| Current fee schedule | Actual fee | `account.commission` is a current per-symbol tariff snapshot; `computeCommissionRates` is a hypothetical test-order rate response | Neither carries a historical effective-from/version binding to a past trade; preserve request/receipt time separately and never calculate/substitute the actual charge |

## 6. Binance Spot candidate: concrete constraints

The current Binance Spot work is a documentation-only candidate, not a selected or conformant provider profile.

Official Spot User Data Stream events include:
- outboundAccountPosition: changed account balances with account update time;
- balanceUpdate: balance delta with asset, delta and clear/transaction time, but no transfer ID in the published event schema;
- externalLockUpdate: asset lock/unlock change with event/transaction time and delta.

The JSON externalLockUpdate event exposes e, E, a, d and T. In the official SBE schema, d maps to lockedQtyDelta, while balanceUpdate.d maps to freeQtyDelta; outboundAccountPosition instead carries account update time and per-asset free/locked quantities. The optional SBE subscriptionId appears across these event types as subscription context, not as a provider event, transaction, lock, loan, collateral-agreement or obligation ID. The event schemas expose no shared cross-family correlation key. Thus externalLockUpdate is partial encumbrance evidence only. It must not be promoted to a loan, margin liability, transferable obligation, asset valuation, or settlement record; matching asset, amount, time or subscriptionId does not establish a record-level relation.

The current Spot mapping also distinguishes:
- actual per-trade commission amount/asset embedded in `myTrades` and `executionReport` (`x=TRADE`), keyed to the scoped trade identity;
- current per-symbol rate snapshots from `account.commission`;
- hypothetical order-specific rate output from `order.test` / `computeCommissionRates`;
- trade IDs, order IDs and execution IDs;
- balance deltas and account snapshots.

The tariff APIs do not expose a historical effective-from/version binding to an executed trade. Standard, tax and special rates, role/side and discount conditions are contextual tariff components, not a trade receipt. The actual trade records expose the total commission amount and charged asset; keep them as the source-of-record for that trade and do not infer the charged asset from current discount settings. These identities and families are not interchangeable. `account.status` supplies current Spot asset balances (`free` / `locked`), not native long/short positions; the reviewed Spot Account APIs expose no separate position endpoint. The `free` and `locked` values are two components of the same asset balance. A native position-risk model belongs to a different product: Binance Futures exposes `/fapi/v3/positionRisk` and `ACCOUNT_UPDATE`, while Margin has separate borrow/repay and leveraged-position semantics. Keep those as separate product profiles/account scopes.

For Spot, direct trades and SOR allocations are separate execution-item families. `myTrades.id` is the direct trade identity; `myAllocations.allocationId` is the SOR allocation identity. The SOR FAQ explicitly binds an execution-report `allocId` to a queryable allocation and states that one order may contain both allocations and direct trades. Order-level executed quantities are aggregate controls, not extra movements. Per-item gross asset movement can be derived from account side, submitted-symbol `baseAsset`/`quoteAsset`, `qty`/`quoteQty`, and the actual commission asset; this remains a derived flow, not current inventory.

`outboundAccountPosition` supplies the assets possibly changed by one account update; `balanceUpdate` is limited in the docs to deposits, withdrawals and transfers between accounts. The balance APIs expose no shared account event cursor or atomic snapshot watermark. A post-gap snapshot can restore current point-state, not missing history. The Wallet REST histories `GET /sapi/v1/asset/transfer`, `GET /sapi/v1/capital/deposit/hisrec` and `GET /sapi/v1/capital/withdraw/history` expose distinct internal `tranId` / row `id` / chain `txId` identities. They are mapped only as supporting cross-family references; they are outside the current Spot-only collection allowlist and require separate profile/scope approval. None of these identifiers is carried by the Spot balance events, so a record-level pairing with `balanceUpdate` or `outboundAccountPosition` remains unproven. Universal-transfer history is only available for six months; deposit/withdrawal history query windows are limited to 90 days. Margin/Futures, liability, transfer execution and settlement-finality semantics remain separate families.


## 6.1 Companion Margin evidence boundary

The Binance Margin documentation supplies more than one liability view:

- operation history (`GET /sapi/v1/margin/borrow-repay`) with BORROW/REPAY, txId, status and principal/interest breakdown;
- current account-state snapshots (`/sapi/v1/margin/account`, `/sapi/v1/margin/isolated/account`) with per-asset borrowed/interest/free/locked/netAsset and aggregate risk measures;
- actual interest history (`/sapi/v1/margin/interestHistory`) and separate rate context;
- capital-flow and wallet-transfer history with separate identity fields;
- a Risk Data Stream event (`USER_LIABILITY_CHANGE`) without a provider transaction ID in its schema;
- liquidation and small-liability exchange records as separate lifecycle families.

These sources support a Margin candidate profile, not a universal liability ledger. Cross Margin and Isolated Margin are different product scopes. The current Spot-only S1 allowlist does not call any Margin endpoint or subscribe to any Margin Risk Data Stream. In particular, the Margin change log removed the legacy listenKey documentation on 2025-11-10 and recommends migration to `POST /sapi/v1/userListenToken` plus `userDataStream.subscribe.listenToken`; payload schema references alone do not prove that an Arb Margin stream adapter, event ordering contract or complete account stream has been implemented. The Margin change log also adds a Cross liquidation-deficit loan query and repayment history (2026-05-05), and institutional-loan classification values to capital-flow (2026-07-10). These are detailed in the [Margin consistency crosswalk](MARGIN-CONSISTENCY-CROSSWALK-v0.1.md); neither is an enabled S1 source.

### 6.1.1 Collateral and risk values are not additional resources

The dedicated Binance Margin Level and Risk Control page (updated 2026-06-18) states that Cross Classic haircuts entered all three levels effective 2026-06-15. Account Margin Level is collateral value / (total liabilities + outstanding interest). The collateral calculation applies haircut and Price Index to net asset value after liabilities/interest on net-positive positions, recognizes the debt-equivalent portion at 100%, and recognizes positive asset balances in net-negative positions at 100%. For this view, outstanding interest is first interest + periodic interest − interest paid.

Borrow Margin Level and Transfer-Out Margin Level are separate capacity views using collateral value, Mark Price and their respective collateral ratios. Binance states that the two ratios may differ and apply to net collateral. Their documented outstanding-interest input is first interest + total periodic interest. The provider example applies maximum Mark Price to debt tokens and minimum Mark Price to other tokens.

Do not collapse the three views or rebuild them from non-atomic account, interest and price observations. The generic Cross Margin Collateral Haircuts FAQ retains text that conflicts with the dedicated Risk Control page; see the [Margin consistency crosswalk](MARGIN-CONSISTENCY-CROSSWALK-v0.1.md) for the source-version caveat.

Cross Margin Pro was phased out on 2026-02-05. The API schema still labels `MARGIN_2` as Pro and still exposes `collateralMarginLevel`; preserve such fields raw, but do not assign them current Cross Classic semantics. Cross account summary fields (including BTC totals, `TotalCollateralValueInUSDT` and `totalOpenOrderLossInUSDT`) are aggregate views and must not be added to constituent `userAssets[]` rows. The documented field schema does not define an algebraic calculation for `netAsset`; Arb must not derive it by subtracting borrowed/interest from free/locked.

For Isolated Margin, only assets in the exact pair account can collateralize that account; Cross Margin and other Isolated balances cannot be used as collateral. Its Margin Level is total value of assets in that pair divided by total liabilities plus outstanding interest, in quote currency; Borrow Margin Level is a separate Mark Price view. The Cross collateral-ratio schedule does not apply to Isolated Margin.

The supporting GET endpoints have distinct evidentiary classes: `crossMarginCollateralRatio` is a parameter schedule; `allAssets.isMortgageable` is asset capability metadata; `priceIndex` and `risk-based-liquidation-ratio` are valuation/risk inputs; `maxBorrowable` and `maxTransferable` are current capacity outputs; and `available-inventory` is provider-side lending supply. None is a borrow/repayment/transfer event, none by itself proves that a quantity was pledged, and none creates a separate collateral resource. The separate liquidation-loan summary and repay-history endpoints represent a Cross bankruptcy deficit, not an ordinary borrow-repay pair. All these operations remain outside the Spot S1 collection allowlist.

Official provider references:
- [Spot User Data Stream](https://developers.binance.com/en/docs/products/spot/user-data-stream)
- [Spot Smart Order Routing FAQ](https://developers.binance.com/en/docs/products/spot/faqs/sor_faq)
- [Spot API Glossary](https://developers.binance.com/en/docs/products/spot/faqs/spot_glossary)
- [Binance Wallet REST API — Asset](https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/asset)
- [Binance Wallet REST API — Capital](https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/capital)
- [Binance Margin REST API — Account](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/account)
- [Binance Margin REST API — Borrow and Repay](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/borrow-repay)
- [Binance Margin REST API — Transfer](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/transfer)
- [Binance Margin REST API — Market Data](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/market-data)
- [Binance Margin Level and Risk Control](https://www.binance.com/en/support/faq/binance-margin-level-and-risk-control-360030493931)
- [Binance Cross Margin Pro phase-out notice](https://www.binance.com/en/support/faq/detail/0b5441a1c1ff431bb2e135dfa8e6ffba)
- [Binance Margin REST API — Trade / liquidation](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/rest-api/trade)
- [Binance Margin WebSocket event schemas](https://developers.binance.com/en/docs/catalog/core-trading-margin-trading/api/ws-streams/~schemas)
- [Binance Margin Trading change log](https://developers.binance.com/en/docs/products/margin-trading/change-log)
- [Spot Commission Rates FAQ](https://developers.binance.com/en/docs/products/spot/faqs/commission_faq)
- [Spot WebSocket stream event schemas](https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-streams/~schemas)
- [SBE lifecycle — Production](https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/sbe_schema_lifecycle_prod.json) and [Spot Testnet](https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/sbe_schema_lifecycle_testnet.json): pin schema by environment (PROD 3:5; TESTNET 3:6 as of 2026-11-05)
- [Spot Testnet changelog 2026-10-30](https://github.com/binance/binance-spot-api-docs/blob/master/testnet/CHANGELOG.md) and [SBE schema 3:6](https://github.com/binance/binance-spot-api-docs/blob/master/sbe/schemas/spot_3_6.xml): `serverShutdown.shutdownTime` is 3:6+ only
- [Spot WebSocket Account API](https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account)
- [Spot REST API](https://developers.binance.com/en/docs/products/spot/rest-api)

## 7. IMMORTAL transition constraints

Arb must preserve the distinctions already expressed by IMMORTAL:

1. EXP-01 / R7: distinguish assets from commitments; represent every material accepted obligation before the creating transition is executable. An unrepresented L6 commitment blocks the transition.
2. EXP-02: preserve source, receipt and effective times separately; never mix horizons or infer a default maturity.
3. EXP-03: asset identity, eligibility, valuation, haircut, executable liquidity and ProtectedCapital are separate stages.
4. EXP-05: use the existing pattern verify right → settle once → reduce liability once; settlement does not re-evaluate a mutable claim.
5. EXP-06: preserve evidence source, observation, digest, evidence version and verification status as separate inputs; a reference binding is not verifier trust or authority.
6. EXP-08: retain gross claims; no offset without an explicit profile policy and admissible relation.
7. EXP-09: a transfer/reassignment is not novation; preserve source/destination, terms, authority and history.
8. EXP-10: RiskBudget, RealizedExposure and ProtectedCapital remain distinct.
9. EXP-12: observer, verifier, appraiser, Principal and authorizing authority remain separate roles.

Where resources are shared or cross-system obligations are coupled, normative C-COMP applies: X2 requires one canonical exhaustive resource partition or non-overlapping exclusive shares; X4 requires atomic commit across systems or unresolved exposure represented in both; X5/X5b require a joint certificate and joint gate. No local Arb reconciliation can discharge these requirements.

## 8. S1 implementation status and blockers

Implemented in Arb:
- immutable ObservationRecord envelopes and per-family CollectionCoverage;
- OpenExposure gross-item classifier and structural ObservationRecord resolver;
- synthetic trade-level REST/STREAM reconciliation;
- trade-to-lifecycle binding that preserves every source ObservationRecord and its individual raw digest.

Not implemented:
- cross-family join/relation resolver;
- transfer-to-obligation discharge and EXP-09 novation qualification resolver (design only; no runtime implementation);
- Margin borrow/repay, interest and liability-state parser/reconciler (documentation crosswalk only; no runtime implementation);
- SOR allocation parser/reconciler for the documented `allocId` ↔ `allocationId` relation;
- complete Spot asset-movement and balance reconciliation; the current Binance contract exposes no adequate account cursor/atomic boundary;
- typed ProviderProfile mappings for balance, collateral, direct trades, SOR allocations, liability, transfer and settlement fields;
- provider parser/client or selected provider profile;
- source-population exhaustiveness and cross-family atomic snapshot proof;
- valuation, EEV, ProtectedCapital classification, RiskBudget, netting, novation, settlement-finality decision or IMMORTAL admission.

The next safe implementation gate is provider-specific evidence for an exact family pair and its documented relationship. Do not build a generic join engine before a concrete official API contract and a demonstrated consumer need exist.

## 9. Non-regression

This contract is a design boundary only. It adds no financial ledger, global account snapshot, cross-family aggregation, netting, valuation, EvidenceQualification, verifier registry, RiskBudget, authority, actuator or execution capability.

S1 remains synthetic/read-only. Provider selection/conformance, D0/D1 and independent external review remain OPEN. S2/S3 remain unauthorized.

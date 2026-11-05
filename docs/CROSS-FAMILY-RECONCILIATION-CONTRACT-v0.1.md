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
| Order | Fill/execution | A fill may reference its parent order via the provider order ID; order lifecycle remains distinct | Do not add cumulative order executed quantity to per-trade fill quantities; preserve cancel/replace lineage |
| Fill | Actual fee/commission | `myTrades.commission` / `commissionAsset` and `executionReport.n` / `N` (`x=TRADE`) are `ATTRIBUTE_OF` the scoped trade identity; the two channels may represent the same charge | Reconcile per trade ID; compare amount and asset; never count REST and stream as two charges or aggregate/deduplicate by order ID |
| Fill | Balance delta/snapshot | A fill may cause a later balance change or be reflected in a snapshot | No join by asset + amount + nearby time; a balance delta/snapshot is not a second fill and does not by itself prove settlement |
| Balance delta | Account position update | A deposit/withdrawal/inter-account transfer may later be reflected in a changed-asset position event | `balanceUpdate` is not exhaustive for balance changes and has no shared event key with `outboundAccountPosition`; no one-to-one pairing or delta-based reconstruction |
| Balance | External collateral lock | The event semantics permit an `ENCUMBERS_OR_RELEASES` relation in principle; record-level relation to a specific balance update/snapshot remains unlinked without a documented shared identity | Do not link on asset/amount/time/subscriptionId; do not count the same units as both free executable balance and an additional collateral asset; lock event alone does not establish a debt or its creditor |
| Fill | Position/inventory | A fill may contribute to a later position or inventory state | A position is state, not another execution; do not sum positions and their constituent fills as independent exposures. The current Binance Spot candidate has no position source operation mapped |
| Balance | Borrow/liability | A loan disbursement could affect an asset balance while also establishing a liability | Require explicit loan/borrow identity and product-specific source semantics; never infer a loan from a balance increase. Margin remains outside the current Spot candidate |
| Liability | Settlement | Settlement may discharge an established right/obligation | Require the same obligation identity, authorized settlement reference, asset/amount, lifecycle state and applicable finality evidence; discharge once |
| Transfer | Source/destination balances | A transfer may affect two scopes | Require explicit transfer identity and source/destination scope; a balance delta alone does not prove a transfer, counterparty, destination ownership or novation |
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

The tariff APIs do not expose a historical effective-from/version binding to an executed trade. Standard, tax and special rates, role/side and discount conditions are contextual tariff components, not a trade receipt. The actual trade records expose the total commission amount and charged asset; keep them as the source-of-record for that trade and do not infer the charged asset from current discount settings. These identities and families are not interchangeable. `account.status` supplies a current account-state response with `updateTime` and `balances[]`; `outboundAccountPosition` supplies the assets possibly changed by one account update; `balanceUpdate` is limited in the docs to deposits, withdrawals and transfers between accounts. The last two have no documented record-level join key or account sequence/cursor. Their timestamps are not a proven replay watermark. A post-gap account snapshot can restore a current point-state baseline but cannot reconstruct missing event history. The current candidate does not map positions, borrow/liabilities, transfer lifecycle or settlement-finality families. Margin borrow/repay is a different product perimeter and remains deferred.

Official provider references:
- [Spot User Data Stream](https://developers.binance.com/en/docs/products/spot/user-data-stream)
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
- balance delta-to-position/snapshot reconstruction or replay-watermark algorithm (the current Binance contract exposes no adequate cursor/atomic boundary);
- typed ProviderProfile mappings for all balance, collateral, position, liability, transfer and settlement fields;
- provider parser/client or selected provider profile;
- source-population exhaustiveness and cross-family atomic snapshot proof;
- valuation, EEV, ProtectedCapital classification, RiskBudget, netting, novation, settlement-finality decision or IMMORTAL admission.

The next safe implementation gate is provider-specific evidence for an exact family pair and its documented relationship. Do not build a generic join engine before a concrete official API contract and a demonstrated consumer need exist.

## 9. Non-regression

This contract is a design boundary only. It adds no financial ledger, global account snapshot, cross-family aggregation, netting, valuation, EvidenceQualification, verifier registry, RiskBudget, authority, actuator or execution capability.

S1 remains synthetic/read-only. Provider selection/conformance, D0/D1 and independent external review remain OPEN. S2/S3 remain unauthorized.

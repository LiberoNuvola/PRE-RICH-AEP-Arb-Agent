# External Account & Trading Lifecycle — IMMORTAL Mapping Matrix v0.1

**Status:** S1 design / mapping assessment only  
**Branch:** `Immortal-Protocol`  
**Date:** 2026-11-04  
**Scope:** provider-neutral mapping of broker/exchange account and trading-lifecycle observations into existing IMMORTAL contracts. No provider is selected and no live account is connected.

## 1. Decision

Arb owns provider-specific collection, source identity, raw observation preservation, stream lineage, correction/replay handling and faithful mapping of provider fields.

Arb does not own economic meaning, valuation policy, liability priority, netting, risk budgets, solvency, economic admission, Principal authority or execution permission.

The target is not a new universal financial ledger. It is a provider-specific observation/mapping boundary that supplies source-scoped facts to existing IMMORTAL application/profile and universal contracts.

## 2. Existing IMMORTAL destination

The inspected `UniversalEconomicState` exposes these existing aggregates:

- `uesCrystallizedLiabilities`
- `uesUnresolvedReserve`
- `uesUnresolvedTicketCount`
- `uesWorstCaseExposure`
- `uesSafetyCapital`
- `uesReserveProtection`
- `uesMandatoryFutureCosts`
- `uesAdditionalProtectedCapital`

The `UniversalEconomicKernel` derives ProtectedCapital from crystallized liabilities, worst-case exposure, safety capital, reserve protection, mandatory future costs and additional protected capital; RawSurplus is `max(0, EEV - ProtectedCapital)`.

These are destination aggregates, not provider payload fields. An adapter must not write directly into them or invent conversion rules. A profile/application projection must first establish the exact economic meaning, units, eligibility, valuation, obligation status and non-duplication of the source facts.

PRE-RICH-specific class decomposition, activation policy and Jackpot lifecycle remain outside universal state. A broker/exchange profile must likewise keep its provider-specific state outside IMMORTAL's universal state until a justified projection is defined.

## 3. Account/trading lifecycle matrix

| Family | Minimum source facts to preserve | Existing IMMORTAL destination / EXP | Required semantic boundary |
|---|---|---|---|
| Balances | Asset/instrument identity; total, available, locked, borrowed and accrued components where exposed; unit/precision; account/subaccount scope; source time | EEV / executable-liquidity inputs only through the applicable qualified valuation and liquidity contracts; EXP-03, EXP-10 | Total balance is not available balance; available balance is not automatically executable liquidity; a provider account-equity number is not EEV. No asset conversion or valuation in the generic reducer. |
| Orders | Provider and client order IDs; instrument; side; order type; requested, filled and remaining quantities; status; time-in-force; create/update times; cancel/replace/reject identity; stream/cursor | Potential unresolved exposure or obligation input only where the applicable profile defines it; EXP-01, EXP-02, EXP-08, EXP-09, EXP-12 | Order intent is not execution. Cancel request is not cancel confirmation. Partial fill must not be collapsed into either a fully open or fully settled order. No permission to submit/cancel is implied. |
| Fills / executions | Provider execution/trade/fill ID; linked order IDs; instrument and base/quote assets; side; gross quantity and unit; price and unit; execution type/liquidity role; source and receipt times; correction/reversal links | Gross exposure and candidate transition inputs; profile projection to the relevant IMMORTAL state; EXP-03, EXP-06, EXP-08, EXP-09 | Preserve each execution gross and individually identifiable. A fill is not proof of settlement, final position, ownership or net exposure. |
| Fees / rebates | Amount; fee asset; fee type; maker/taker or other provider classification; linked order/fill/period; accrual vs charged vs reversed state; time | Cost/obligation inputs and settlement reconciliation; EXP-01, EXP-03, EXP-06 | Provider fee, funding charge, rebate and IMMORTAL Protocol Usage Fee are distinct. Do not net rebates against fees unless the applicable economic contract explicitly permits it. |
| Positions / inventory | Instrument identity; long/short or signed quantity semantics; contract multiplier; unit; isolated/cross margin context; entry/mark/liquidation reference as distinct source fields; unrealized/realized values if exposed | Exposure and valuation inputs only under qualified instrument/asset semantics; EXP-03, EXP-07, EXP-08, EXP-10 | Do not infer PnL, convert contracts to underlying units, combine venues or offset opposing positions without explicit instrument and composition contracts. Mark price is not executable price. |
| Liabilities / financing | Borrow principal; accrued interest; funding payable/receivable; margin deficit; accrued fees; locked resources; maturity/due time; status and dispute/correction references | `uesCrystallizedLiabilities`, `uesUnresolvedReserve`, `uesMandatoryFutureCosts` or other existing aggregates only after profile/application classification; EXP-01, EXP-02, EXP-06, EXP-10 | Certain, accrued, contingent, disputed and future obligations remain distinguishable. Do not double-count a liability represented in another family or infer that omitted liabilities are zero. |
| Transfers / deposits / withdrawals | Transfer ID; source/destination resource references; asset and amount; direction; initiated/accepted/settled/failed/reversed states; timestamps; linked settlement evidence | Obligation continuity and composition evidence; EXP-03, EXP-06, EXP-09, EXP-12 | A transfer event is not proof of destination ownership or finality. Account-scope changes do not prove novation. Cross-resource movement may require IMMORTAL Composition Contract X1–X7. |
| Settlement / delivery | Settlement ID; linked order/fill/obligation IDs; amount and asset; due/actual time; status; counterparty/resource; finality/reversal evidence | Discharge or crystallization of the applicable obligation through the existing profile and transition contracts; EXP-01, EXP-02, EXP-06, EXP-09 | Provider status text alone is not finality. Preserve partial, failed, disputed and reversed settlement. Never discharge an obligation solely because a fill or transfer was observed. |
| Collateral / margin state | Collateral asset and amount; haircut or valuation reference as provider-reported data; eligible/locked/encumbered amount; margin mode; maintenance requirement; liquidation state | Protected capital / exposure / liquidity inputs only after EXP-03 qualification and applicable risk/viability mapping; EXP-03, EXP-10 | Provider haircut or margin equity is not IMMORTAL valuation policy. Collateral cannot be treated as free liquidity while encumbered. |
| Funding / interest / borrow | Rate or charge; period; asset; accrued/paid/unpaid state; source calculation basis; linked position/loan where available | Liability and future-cost inputs under explicit classification; EXP-01, EXP-02, EXP-03, EXP-10 | Preserve rate, amount and accrued obligation separately. Do not synthesize missing accruals or assume provider-reported estimates are settled amounts. |

## 4. Cross-family invariants

1. **Gross-first:** retain source records gross. No implicit netting, offset, aggregation across instruments, accounts, venues or legal entities.
2. **Identity-first:** preserve provider IDs and their documented uniqueness scope. A local Arb envelope ID is never a provider event ID.
3. **Lifecycle separation:** order → fill/execution → position/obligation → settlement are distinct facts and transitions. Do not infer one from another.
4. **Asset/unit preservation:** every amount remains bound to asset, unit, precision and instrument specification. Unknown units remain unknown.
5. **Correction lineage:** cancel, replace, bust, reversal and late correction events retain target identity and history; do not overwrite history silently.
6. **Temporal scope:** source-observed time, received time, effective time, cursor and snapshot boundary remain distinct. Cross-family reads are not atomic unless the provider contract proves a shared snapshot.
7. **Coverage is scoped:** coverage is per family, query and resource scope. No global `accountComplete` claim; missing/unrequested/filtered/expired data is not zero.
8. **Evidence is not authority:** authentication, API key possession, response signature or verifier success does not establish Principal ownership, D0/D1, mandate or trading permission.
9. **No double counting:** a source fact appearing in balance, position, liability and settlement endpoints must be reconciled by documented identity and semantics before any projection.
10. **Composition:** shared resources, cross-account transfers or cross-venue offsets require the applicable IMMORTAL X1–X7 composition evidence; two individually valid observations do not establish a valid composition.

## 5. Current Arb schema coverage

The current ProviderProfile and CollectionCoverage schemas already enumerate the main families: BALANCES, COLLATERAL, POSITIONS, OPEN_ORDERS, ORDER_HISTORY, FILLS, FEES, FUNDING, BORROW, TRANSFERS, SETTLEMENT, MARGIN and LIABILITIES. Coverage already records per-family status, request scope, query completion, pagination status, truncation, record count, completion evidence, boundary, retention, omissions and reason codes.

ObservationRecord v0.2 already preserves source identity, optional provider event ID, stream and sequence, profile/version scope, source/receipt/effective timestamps, correction/supersession relations, raw evidence references/digests, evidenceVersion, canonicalization version and verification status/reference.

## 6. Concrete contract gaps — do not silently fill

The current schemas are sufficient as a provider-neutral envelope and family-coverage starting point, but they do not yet define complete typed account/trading semantics:

- ProviderProfile `executionModel.fieldMappings` covers a subset of order/fill/execution fields; it does not provide equivalent field-level mapping structures for balances, positions, collateral, liabilities, financing and settlement.
- ObservationRecord `payload` is intentionally a generic object. It does not validate family-specific field types, units, statuses or lifecycle transitions.
- The family vocabulary has `FILLS` rather than a distinct `EXECUTIONS` family; provider-specific equivalence must be documented rather than assumed.
- `FUNDING` and `BORROW` exist, but interest is not a distinct family. A profile must map interest explicitly and state whether it is represented as funding, borrow or a provider-specific liability.
- `TRANSFERS` groups deposits and withdrawals. Direction and lifecycle semantics must be explicit in the profile/payload.
- There is no canonical order-status, position-model, balance-component, fee-accrual or settlement-finality taxonomy in the generic schema. Do not invent a universal enum before comparing an actual provider's official contract and the relevant IMMORTAL consumer.

These are mapping/schema review items, not a reason to add a second ledger or qualification framework. A future schema revision should be driven by a concrete provider contract and a demonstrated consumer requirement.

## 7. EXP disposition

| EXP | Arb contribution in this matrix | Non-claim |
|---|---|---|
| EXP-01 | Preserve typed obligation facts, maturity and discharge evidence | No universal seniority or obligation classifier is introduced |
| EXP-02 | Preserve source/effective/receipt time and due/maturity fields | No universal term-structure or freshness policy is created |
| EXP-03 | Preserve instrument, asset, unit and provider valuation fields | No eligibility, oracle, haircut or valuation authority is created |
| EXP-06 | Bind each observation to source, envelope, raw evidence, evidence version and verification state | No new EvidenceQualification or verifier registry |
| EXP-07 | Preserve provider state observations relevant to a future regime consumer | No regime/hysteresis controller |
| EXP-08 | Preserve gross orders, fills, positions and obligations | No netting/offset engine |
| EXP-09 | Preserve transfer, correction, replacement and obligation lineage | No novation decision |
| EXP-10 | Preserve raw exposure/resource facts and encumbrances | No RiskBudget or economic admission |
| EXP-12 | Keep collector, verifier, attribution and authority distinct | No mandate, D0/D1 closure or execution permission |

EXP-03/07/08/10 receive no new normative semantic coverage from this document. EXP-06 remains a mapping/conformance target; its IMMORTAL source status is not changed by Arb.

## 8. Next review gate

Before selecting a provider:

1. Select one candidate provider only after its official API/message documentation is available for review; do not create a profile from assumptions.
2. Fill the family-by-family source operation, field, unit, identity, cursor, correction, pagination, retention and completion-rule mapping.
3. Mark each field as provider-guaranteed, documented-but-conditional, observed-only, unknown or not exposed.
4. Map each source fact to an existing IMMORTAL consumer or explicitly mark it as having no current consumer.
5. Run adversarial fixtures for partial fills, cancel/replace, execution bust, fee correction, funding accrual, collateral lock, transfer reversal, partial settlement, stale cursor, retention truncation and cross-family snapshot skew.
6. Prove no double counting and no implicit netting in the projection.
7. Keep S1 synthetic/read-only. D0/D1, independent review and provider conformance remain OPEN; S2/S3 remain unauthorized.

## 9. Sources inspected

- Arb `docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md`, revision 0.2.
- Arb `schemas/provider-profile.schema.json`, `schemas/collection-coverage.schema.json`, `schemas/observation-record.schema.json`.
- IMMORTAL `IMMORTAL/state/UniversalEconomicState.hs`.
- IMMORTAL `IMMORTAL/state/STATE-FIELD-OWNERSHIP.md`.
- IMMORTAL `IMMORTAL/kernel/UniversalEconomicKernel.hs`.
- IMMORTAL `IMMORTAL/docs/ECONOMIC-KERNEL.md`.
- IMMORTAL `docs/GLOSSARY.md` and `docs/IMMORTAL-SYSTEM-MAP.md`.
- Notion `IMMORTAL–Cormia EXP Generalization Crosswalk v1.0` and `AEP–IMMORTAL Economic Jurisdiction & EXP Conformance v0.1`.

**Non-regression:** this document adds no application code, provider connection, signature implementation, verifier registry, authority layer, RiskBudget, netting rule, valuation algorithm, economic gate or actuator. It does not amend IMMORTAL semantics.

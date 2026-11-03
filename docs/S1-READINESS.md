# S1 Read-only Readiness Contract

**Revision:** 0.2.0 candidate  
**Scope:** PRE-RICH AEP Arb Agent, consumer-side S1 only  
**Authority status:** non-normative implementation reference; no financial mandate or live execution authority

## 1. Staged autonomy boundary

| Stage | Permitted scope | Current status |
| --- | --- | --- |
| S0 | Research, contracts, synthetic fixtures | Materialized in this repository |
| S1 | Read-only observations, deterministic replay, projections, synthetic simulation | Candidate implementation; 28 Node tests and 6 schema validations passed on GitHub Actions run #1 |
| S2 | Paper/test profile with separately specified environment and account isolation | Not authorized / not implemented |
| S3 | Bounded autonomous live execution | Not authorized; D0–D8 and exact profile/recovery gates remain open |
| S4 | Multi-Principal/shared-resource operation | Not authorized; explicit composition/allocation contracts required |

## 2. S1 non-negotiable invariants

1. No market/account write credentials, exchange order endpoints, wallet signing, transfer, withdrawal, margin mutation or administrative capability.
2. Observation and replay output are evidence/projections only; neither can grant Principal authority, mandate validity or IMMORTAL economic admission.
3. Each source stream has its own identity, cursor and ordered event list. A stream gap/conflict blocks its dependent projection only.
4. No event order is inferred across independent streams from timestamps, receipt order, array position or lexicographic stream IDs.
5. Lexical stream ID sorting is permitted only for stable result presentation, not causality or economic ordering.
6. OpenExposure is represented as typed gross records. No implicit scalar aggregation, unit conversion, netting, novation or ownership rewrite.
7. Empty or incomplete observations do not imply empty orders, zero positions, zero liabilities or zero exposure.
8. A simulation result never creates a realized fill, profit, settled proceeds, budget increase, mandate change or external side effect.
9. A timeout or uncertain side effect cannot be treated as proof that a mutating action did not happen. The S1 package has no such mutating action path.

## 3. Multi-stream composition boundary

The implementation returns independent replayStream results and an overall PARTIAL_UNRESOLVED when one or more streams are unresolved. It does not merge event histories, choose a total order, compute a shared state or decide whether resources are shared/exclusive.

When more than one stream is present, compositionStatus remains COMPOSITION_UNRESOLVED. No X1–X7 composition witness is currently consumed. A future composition adapter must supply explicit source evidence, ownership/resource partition, causal/atomicity or mirrored-exposure semantics, and joint verification under the approved Composition Contract. The S1 reducer is not that adapter.

## 4. OpenExposure boundary

The current classifier preserves recordRef, category, assetRef, unitRef, scopeRef, horizonRef, status, evidenceRef, and optional grossQuantity separately for each entry. Quantities are opaque decimal strings and are never summed. Multiple entries remain COMPOSITION_UNRESOLVED. Missing input is INCOMPLETE, not zero. Duplicate references are CONFLICTED.

This projection does not decide valuation, liquidity, eligibility, ProtectedCapital, solvency, budget sufficiency, netting rights, novation, settlement finality or admission.

## 5. IMMORTAL EXP crosswalk

| EXP | S1 constraint |
| --- | --- |
| EXP-03 | Preserve exact asset references; eligibility, valuation, haircut, liquidity and ProtectedCapital remain distinct. |
| EXP-07 | Record regime-related evidence only; do not assign regime or add parameters/thresholds. |
| EXP-08 | Keep gross obligations; do not infer netting from opposing signs/symbols/amounts. |
| EXP-09 | Keep obligation identity/source/destination/history; no transfer or novation by owner-field change. |
| EXP-10 | Keep RiskBudget, RealizedExposure and ProtectedCapital distinct; no default/unlimited budget or unit coercion. |
| EXP-12 | Observer, verifier and authority are separate identities/records; observer cannot authorize itself. |

## 6. Repository readiness and exit criteria

S1 is suitable for review as an isolated, no-actuation reference package. It is not yet declared production-ready. Exit criteria for the first S1 repository gate:

- [x] Dedicated repository exists and is separate from IMMORTAL and Cormia.
- [x] Candidate schemas, fixtures, pure reducer and adversarial tests are materialized locally.
- [x] Independent multi-stream replay and typed gross exposure preservation are covered by tests.
- [x] Local no-actuation source guards pass.
- [x] GitHub Actions workflow is defined with read-only repository permission.
- [x] First GitHub Actions run #1 completed successfully: 28 Node tests, 6 schema validations; [run evidence](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41584700965).
- [ ] Review of schema/reducer contracts and evidence limitations is recorded.

Separate authority gates remain open and are not prerequisites for keeping S1 read-only: D0 Principal/financial authority root and D1 account/resource isolation. They are mandatory before any paper/live capability is even considered. S3 additionally requires the full D0–D8 profile, economic admission, actuator boundary, reconciler and recovery contract.

## 7. Ownership separation

- **Arb Agent:** financial Principal/mandate consumption, market/account observation, orders, fills, positions, typed OpenExposure, RiskBudget and settlement orchestration when future stages are authorized.
- **IMMORTAL:** normative economic kernel, economic admission, protected-capital and composition rules.
- **Cormia:** operational project identity, workspace, Project Mandate, Task Manifest, task delegation, Runtime, PNC and execution of project tasks. Cormia operational authority does not grant financial authority.

This repository does not amend IMMORTAL rules or Cormia specifications, and does not duplicate their authority systems.

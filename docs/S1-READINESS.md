# S1 Read-only Readiness Contract

**Revision:** 0.2.x candidate  
**Scope:** PRE-RICH AEP Arb Agent, consumer-side S1 only  
**Authority status:** non-normative implementation reference; no financial mandate or live execution authority

## 1. Staged autonomy boundary

| Stage | Permitted scope | Current status |
| --- | --- | --- |
| S0 | Research, contracts, synthetic fixtures | Materialized in this repository |
| S1 | Read-only observations, deterministic replay, projections, synthetic simulation | Read-only reference candidate; W1 CIP-30, W2 Minswap V2 and W3 EXP-03/06/10 consumer-mapping tests run on GitHub Actions |
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
10. Within a stream replay, event-ID reuse across identities is quarantined; corrections must target the active event head; exact duplicate delivery requires matching source identity and digest reference.
11. A fill is countable only when its fill ID, quantity and raw digest reference are present. Duplicate fill IDs require matching quantity and digest reference; otherwise the order projection is conflicted.
12. Canonical instrument identity must come from an explicit instrument mapping. Provider source event IDs are passed through as supplied and are not invented. Missing sourceEventId remains null.
13. Source profile, normalizer version, source identifier and timezone-qualified source/receipt timestamps are required for a candidate-evaluable normalized observation.
14. A collection-completeness statement is per data family and exact query scope. COMPLETE_EMPTY requires query completion, exhausted pagination (or a documented non-paginated operation), no truncation, a completion-evidence reference, a boundary reference and documented retention applicability.
15. A per-family COMPLETE_EMPTY result does not imply a global account snapshot or zero liability. NOT_REQUESTED, PARTIAL, UNAVAILABLE, UNKNOWN or NOT_APPLICABLE_PROFILE are not empty/zero results.
16. ProviderProfile and collection coverage records are source-profile evidence only. They cannot set Principal authority or account ownership.

## 3. Multi-stream composition boundary

The implementation returns independent replayStream results and an overall PARTIAL_UNRESOLVED when one or more streams are unresolved. Each ReplayManifest declares an initialCheckpoints array: exactly one checkpoint for each stream. The validator cross-checks stream IDs and requires each checkpoint's coveredThroughSequence to match that stream's startSequenceExclusive.

The implementation does not merge event histories, choose a total order, compute a shared state or decide whether resources are shared/exclusive. When more than one stream is present, compositionStatus remains COMPOSITION_UNRESOLVED. No X1–X7 composition witness is currently consumed. A future composition adapter must supply explicit source evidence, ownership/resource partition, causal/atomicity or mirrored-exposure semantics, and joint verification under the approved Composition Contract. The S1 reducer is not that adapter.

## 4. OpenExposure boundary

The current classifier preserves recordRef, category, assetRef, unitRef, scopeRef, horizonRef, status, one or more observationRefs, and optional grossQuantity separately for each entry. Each observationRefs value is an exact ObservationRecord.eventId (the Arb envelope observationReference), not provider source.sourceEventId, rawDigestRef or verificationRef. Multi-source projections retain every contributing eventId. Quantities are opaque decimal strings and are never summed. Multiple entries remain COMPOSITION_UNRESOLVED. Missing input is INCOMPLETE, not zero; duplicate recordRef values are CONFLICTED. The classifier checks observationRefs shape and uniqueness only. The pure `resolveOpenExposureObservationBindings` consumer now resolves every eventId to exactly one ObservationRecord, checks profileRef/profileVersion equality and structurally binds the five EXP-06 members. It reports RESOLVED only for referential and structural binding: it does not resolve the provider's source-operation mapping or verificationRef, retrieve raw bytes, recompute rawDigestRef, assess verifier trust, or perform economic admission. The original observation quality status is carried through without being promoted to verification.

This projection does not decide valuation, liquidity, eligibility, ProtectedCapital, solvency, budget sufficiency, netting rights, novation, settlement finality or admission.

## 5. IMMORTAL EXP crosswalk

| EXP | S1 constraint |
| --- | --- |
| EXP-03 | Preserve exact asset/instrument references from explicit mappings; eligibility, valuation, haircut, liquidity and ProtectedCapital remain distinct. |
| EXP-07 | Record regime-related evidence only; do not assign regime or add parameters/thresholds. |
| EXP-08 | Keep gross obligations; do not infer netting from opposing signs/symbols/amounts. |
| EXP-09 | Keep obligation identity/source/destination/history; no transfer or novation by owner-field change. |
| EXP-10 | Keep RiskBudget, RealizedExposure and ProtectedCapital distinct; no default/unlimited budget or unit coercion. |
| EXP-12 | Observer, verifier and authority are separate identities/records; observer cannot authorize itself. |

## 6. Repository readiness and exit criteria

S1 is suitable for review as an isolated, no-actuation reference package. It is not yet declared production-ready.

- [x] Dedicated repository exists and is separate from IMMORTAL and Cormia.
- [x] Candidate schemas, fixtures, pure reducer and adversarial tests are materialized.
- [x] Independent multi-stream replay and typed gross exposure preservation are covered by tests.
- [x] Static no-actuation source checks scan all JavaScript under src/ and wallet-companion/.
- [x] GitHub Actions workflow uses read-only repository permission.
- [x] Focused internal adversarial review recorded in [S1-ADVERSARIAL-REVIEW.md](S1-ADVERSARIAL-REVIEW.md).
- [x] Provider-neutral evidence boundary documented in [PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md](PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md).
- [x] Prior-art adaptation map recorded in [PRIOR-ART-ADAPTATION.md](PRIOR-ART-ADAPTATION.md).
- [x] ProviderProfile and per-family CollectionCoverage JSON Schemas with synthetic examples are materialized.
- [x] Negative schema checks reject COMPLETE_EMPTY with non-exhausted pagination, non-zero count, or unknown boundary; reject NOT_REQUESTED marked as requested; reject REVIEWABLE profiles without provider identity/docs; and reject attempts to set Principal authority.
- [x] Preliminary contribution/novelty assessment records prior-art overlap, open novelty questions and falsifiable research properties.
- [ ] Independent external review of schema/reducer contracts and evidence limitations.
- [ ] Provider-specific evidence and event identity semantics reviewed against an actual provider profile.
- [ ] Formal decision-specific EvidenceQualification model and its property tests, after reviewing the exact IMMORTAL hand-off and composition contract.

Separate authority gates remain open and are not prerequisites for keeping S1 read-only: D0 Principal/financial authority root and D1 account/resource isolation. They are mandatory before any paper/live capability is even considered. S3 additionally requires the full D0–D8 profile, economic admission, actuator boundary, reconciler and recovery contract.

## 7. Residual limits

The internal review report records open limitations: rawDigestRef equality is not cryptographic digest verification; no provider-specific fill schema or account snapshot proof exists; event sequencing and correction identity remain source-profile-specific; no global cross-stream order or X1–X7 composition is implemented. The provider-neutral contract and machine-readable schemas define a review boundary only; they do not close these limitations or implement a provider.

## 8. Ownership separation

- **Arb Agent:** financial Principal/mandate consumption, market/account observation, orders, fills, positions, typed OpenExposure, RiskBudget and settlement orchestration when future stages are authorized.
- **IMMORTAL:** normative economic kernel, economic admission, protected-capital and composition rules.
- **Cormia:** operational project identity, workspace, Project Mandate, Task Manifest, task delegation, Runtime, PNC and execution of project tasks. Cormia operational authority does not grant financial authority.

This repository does not amend IMMORTAL rules or Cormia specifications, and does not duplicate their authority systems.

## 9. Provider evidence boundary

The [Provider-Neutral Evidence Adapter Contract](PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md) separates source assertions, collection coverage, independent verification, and Principal/account authority. The [Prior-Art Adaptation Map](PRIOR-ART-ADAPTATION.md) documents the reuse boundary for CloudEvents, PROV-O, JCS, DSSE and FIX.

The ProviderProfile schema is only a template for declaring provider semantics; the current example is TEMPLATE_ONLY with no provider selected or documentation mapped. CollectionCoverageReport records are per data family, not an account-wide complete flag. COMPLETE_EMPTY is valid only when exact query scope, completion evidence, pagination completion, no truncation, a boundary reference and retention applicability are documented. A query-completion boundary with NON_ATOMIC state proves only that query's completion, not an atomic account snapshot.

The external broker/exchange ProviderProfile remains TEMPLATE_ONLY and no trading venue/client is selected. Separately, W1 supplies a CIP-30 read-only wallet port, W2 consumes a pinned IMMORTAL Minswap V2 Mainnet exact-USDM observer output, and W3 maps only consumer-readiness states for EXP-03/06/10. The W3 result is non-normative and does not call the universal kernel/gate or perform an economic evaluation; Arb makes no direct network request and does not prove a complete account/DeFi snapshot. D0, D1 and independent external review remain OPEN. S2 and S3 remain unauthorized.

## 10. Contribution and novelty assessment

The [Contribution and Novelty Assessment](CONTRIBUTION-AND-NOVELTY-ASSESSMENT.md), [IMMORTAL Hand-off Crosswalk](IMMORTAL-HANDOFF-CROSSWALK.md) and [full branch prior-art audit](BRANCH-PRIOR-ART-AUDIT-2026-11-03.md) cover all 27 IMMORTAL branches, all 3 Cormia branches and Arb's only branch, with targeted reading of relevant files.

The branch review found that IMMORTAL work/immortal-green-closure already contains a multi-oracle registry/currentness prototype, multi-venue source matrices and a PRE-RICH ticket item-ledger prototype; IMMORTAL work/b3-materios-provenance-evidence already contains EXP-06/EXP-12 and generalized derivation boundaries; and Cormia's branches already contain prior-art composition and PNC/runtime-authority work. These prototypes have explicit open limitations and are not all production-wired.

The current Arb project must not implement a parallel universal EvidenceQualification, price-feed registry, signature/currentness system, authority layer or economic gate. Its remaining candidate is provider-specific external broker/exchange account and trading-lifecycle observation/mapping (balances, orders, fills, corrections, fees, positions, liabilities/collateral and settlement) into existing IMMORTAL contracts. This is not yet implemented end-to-end or shown novel. A concrete provider profile, external comparison and independent review remain necessary.


## 11. Synthetic trade-observation reconciliation

The provider-neutral comparison core in `src/trade-observation-reconciler.js` implements the synthetic MATCHED/INCOMPLETE/CONFLICTED/UNMAPPED/NOT_A_TRADE outcomes for normalized trade candidates. It preserves raw observation refs/digests and exact source value strings, compares decimal amounts without binary floats, rejects unresolved correction lineage and does not emit a trade projection from a single source. This is not a provider parser or ProviderProfile conformance check. Source-operation mapping, raw-digest integrity, verifier trust and the downstream `projectOrderLifecycle` evidence binding remain OPEN. The reconciliation contract records the unresolved digest-interface issue explicitly.


## 12. Reconciled trade lifecycle binding

The synthetic trade adapter now converts only a MATCHED REST/STREAM trade reconciliation into one `FILL` lifecycle event. It does not select or fabricate a single raw digest: the event binds the scoped trade key and all original ObservationRecord references, source IDs, stream IDs, source-operation refs and per-observation raw digests. `projectOrderLifecycle` retains the legacy single-`rawDigestRef` mode unchanged and accepts the explicit `ReconciledTradeEvidenceBinding` mode as a separate form. Replay is a no-op only when the complete binding set and quantity match; changed evidence is CONFLICTED. This is structural binding only; provider mapping, raw digest integrity, verifier trust and IMMORTAL EXP-06 qualification remain external and OPEN.

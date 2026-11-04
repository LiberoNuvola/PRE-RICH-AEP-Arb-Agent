# IMMORTAL ↔ Arb Evidence and Economic Admission Crosswalk

**Revision:** 0.1 — 2026-11-03  
**Status:** read-only architecture reconciliation; no IMMORTAL code or normative rule changed  
**IMMORTAL source baseline inspected:** LiberoNuvola/Immortal-Protocol main @ 97b09a38742098f17a61eb07734c401aeedccc06  
**Purpose:** prevent Arb from introducing a duplicate evidence-qualification or economic-admission layer.

## 1. Decision

The proposed universal EvidenceQualification layer must not be implemented as a second authority or economic gate.

The IMMORTAL/PRE-RICH workspace already contains:
- a provider-qualification workflow for the PRE oracle (Notion Gate 23);
- a candidate discovery and evidence-collection matrix (Notion Gate 24);
- a PRE PriceReference canonical-source qualification/deployment contract (Notion Gate 30);
- the normative EEV Oracle and Valuation Contract R9, with V1–V9 and EV1–EV7;
- an IMMORTAL Economic Gate and PRE-RICH admission composition;
- an EconomicAdmissionWitness bound to decision, observation, pre-state, action, post-state, EEV and executable liquidity;
- Cardano-side input binding and canonical transition evidence;
- the normative Composition Contract X1–X7;
- GOV-27's separation of canonical integrity, authorization, evidence and ruleset validity.

These are substantial internal prior art. The candidate contribution must therefore be narrowed to an Arb-side, provider-neutral adapter and evidence-mapping implementation that supplies correctly scoped source observations to existing IMMORTAL contracts. It must not recreate provider qualification, valuation rules, Principal authority, ProtectedCapital, Economic Gate, viability, Ω or composition semantics.

This is an architecture crosswalk, not proof that all the listed contracts are fully implemented or closed in deployment. Their own OPEN conformance/producer gates remain in force.

## 2. Existing IMMORTAL/PRE-RICH contracts

### 2.1 Gate 23 — PRE Oracle Evidence Acquisition & Provider Qualification Matrix

Notion: [23 — PRE Oracle Evidence Acquisition & Provider Qualification Matrix v0.1](https://app.notion.com/p/3e0c4454d6d581718785f29e4ab51dc3)

The gate already defines a source qualification progression:

CANDIDATE → EVIDENCE ACQUISITION → VALIDATION → ADVERSARIAL TEST → QUALIFIED → DEPLOYMENT-APPROVED

Its evidence classes E1–E14 cover:
- exact asset identity and quote direction;
- source/publisher/upstream provenance;
- availability and timestamp semantics;
- freshness and source independence/correlation;
- deterministic aggregation and equivalence;
- liquidity/depth and executable settlement support;
- reproducibility and failure behavior;
- historical robustness and on-chain representation.

It also defines a versioned/scope-bounded qualification packet, explicit failure behavior, adversarial qualification tests and a rule against promoting an unproven provider to canonical source.

**Implication:** Arb must not claim to invent provider qualification, freshness, provenance, independence, reproducibility, depth or fail-closed source promotion. Gate 23 is PRE-oracle-specific; it is a reusable qualification pattern, not automatically a universal account-data contract.

### 2.2 Gate 24 — PRE Oracle Candidate Discovery & Evidence Collection

Notion: [24 — PRE Oracle Candidate Discovery & Evidence Collection Matrix v0.1](https://app.notion.com/p/3e0c4454d6d5814eb368fc67fd74e8ab)

Gate 24 fixes the discovery order:

exact asset identity → exact quote pair → source provenance → evidence → qualification

It distinguishes observed market sources (Snek.fun and Splash) from the B1 Authorized Publisher and from future multi-source architecture. It explicitly states that these are not automatically independent sources and that no concrete candidate is qualified as the canonical PRE→USDM oracle.

Its candidate evidence packet includes identity, quote unit/direction, source/publisher, correlation class, upstream, observation mechanism, timestamp semantics, freshness, depth, aggregation, failure, recovery, evidence location/hash and qualification status.

**Implication:** Arb's ProviderProfile should retain generic provider/source semantics, while any PRE oracle integration must follow the exact asset/profile decision in Gate 24. Do not infer source independence by counting endpoint names or providers.

### 2.3 Gate 30 — PRE PriceReference Canonical Source Qualification & Deployment Contract

Notion: [30 — PRE PriceReference Canonical Source Qualification & Deployment Contract v0.1](https://app.notion.com/p/3e0c4454d6d581bd8987ca079abef1ea)

Gate 30 is a domain-specific source contract. It pins PRE phase, exact Cardano asset identity, pool/validator/NFT/UTxO/datum/version context, the distinction between displayed/spot/executable/reference price, and the admissibility predicate:

Identity AND Freshness AND Provenance AND StateIntegrity AND Depth AND Replayability AND VersionConsistency AND ManipulationChecks

It defines a qualification state machine, source-failure rules and the exact evidence packet required for a concrete pool. Its status explicitly distinguishes a closed qualification contract from an as-yet-unverified concrete pool/canonical oracle.

**Implication:** reuse its exact PRE-specific requirements when relevant; do not generalize its pool-specific fields into a universal exchange-account protocol.

### 2.4 IMMORTAL R9 — EEV Oracle and Valuation Contract

Repository: [docs/02-certification/EEV_ORACLE_AND_VALUATION_CONTRACT.md](https://github.com/LiberoNuvola/Immortal-Protocol/blob/main/docs/02-certification/EEV_ORACLE_AND_VALUATION_CONTRACT.md)

R9 is normative and already defines V1–V9:

| R9 | Existing requirement |
|---|---|
| V1 | Authoritative source fixed by the verification predicate, not caller/operator/frontend/order |
| V2 | Each reported value carries checkable evidence; unverified values are unusable |
| V3 | Declared freshness window; stale value unusable, no grace path |
| V4 | Identical authoritative inputs produce identical, versioned, reproducible derivation |
| V5 | Conversion/haircut/slippage included in derivation, conservative direction |
| V6 | Explicit valuation boundary: what EEV does and does not value |
| V7 | Unavailability, staleness, equivocation and out-of-range fail closed |
| V8 | Equivocation represented in the environment/perimeter |
| V9 | Adverse valuation shocks represented in Ω at worst case, not as expectation |

The same contract defines evidence artifacts EV1–EV7: source specification/verification predicate, deterministic derivation, freshness justification and test, conservatism argument, failure-path evidence, Ω shock/oracle-failure entries, and valuation-boundary statement.

R9 also explicitly states that the mathematical kernel cannot prove the empirical correctness of a particular valuation source or that a freshness bound is short enough for a real environment.

**Implication:** Arb can supply raw/provider observations and reproducible derivation evidence, but it cannot certify EEV correctness by itself or replace EV1–EV7, R9, the perimeter or the economic kernel.

### 2.5 Economic admission and Cardano evidence binding

Inspected implementation paths on IMMORTAL main include:

- PRE-RICH/onchain/PreRichEconomicAdmission.hs
- Adapter/CARDANO/runtime/EconomicAdmission.ts
- Adapter/CARDANO/observation/ExecutableLiquidityObservation.ts
- Adapter/CARDANO/observation/AuthoritativeIssueAdmissionDecision.ts
- Adapter/CARDANO/observation/EconomicAdmissionTransitionBinding.ts
- Adapter/CARDANO/observation/CanonicalTransitionEvidence.ts
- Adapter/CARDANO/observation/EconomicObservation.ts
- Adapter/CARDANO/observation/HaskellIssueAdmissionProvider.ts
- docs/audits/PRE-RICH-ISSUE-ADMISSION-PROVENANCE.md

The on-chain PRE-RICH admission path composes structural transition validity, candidate state projection, verified EEV/execution inputs, IMMORTAL Economic Gate and a certified-Ω/viability result. The adapter witness carries a gate version, decision and observation references, canonical pre-state/action/post-state hashes, EEV, executable-liquidity observation, authenticated B1 Pool reference/value and required immediate liquidity.

The Cardano liquidity observation validator checks exact UTxO references, spendability, ring-fencing, duplicate references and value reconciliation. The execution boundary binds declared liquidity inputs to the completed transaction body before signing. CanonicalTransitionEvidence binds an action, pre/post fingerprints and settlement transaction reference.

The admission/transition evidence types are not themselves an external provider qualification algorithm. They are the downstream decision and execution binding to which upstream evidence must be supplied.

**Important open gap:** the inspected provenance audit says that a concrete authoritative EEV/protected-capital/refinement producer and complete end-to-end Issue evidence were still OPEN. Arb cannot claim that the full producer path is already complete merely because the witness types and consumer binding exist.

### 2.6 Composition Contract X1–X7

Repository: [docs/01-contracts/15_COMPOSITION_CONTRACT.md](https://github.com/LiberoNuvola/Immortal-Protocol/blob/main/docs/01-contracts/15_COMPOSITION_CONTRACT.md)

The normative contract already governs interaction between deployments and external economic systems:
- X1 environment compatibility;
- X2 exhaustive resource accounting/owner or exclusive partition;
- X3 non-interference on protected content;
- X4 cross-system atomicity or unresolved exposure represented in both;
- X5 joint certification on the composed system;
- X5b a jointly certified gate, not merely an inductive state set;
- X6 stutter admissibility for interleaving;
- X7 perimeter union and renewed residual-risk statement.

The contract explicitly refutes the assumption that two individually conforming systems compose automatically. It identifies shared resources, correlated environments and joint gates as failure surfaces.

**Implication:** Arb must consume the existing X1–X7 witness requirements. No substitute global ordering, aggregation or composition contract should be invented.

### 2.7 GOV-27 — Authorization, Evidence & Ruleset Binding

Repository: [docs/GOV-27-AUTHORIZATION-EVIDENCE-RULESET.md](https://github.com/LiberoNuvola/Immortal-Protocol/blob/main/docs/GOV-27-AUTHORIZATION-EVIDENCE-RULESET.md)

GOV-27 separates four checks:

CanonicalValid AND AuthorizationValid AND EvidenceValid AND RulesetAuthorizationValid

It explicitly states that a valid digest does not establish authority, an authorized actor does not establish evidence, and a structural EvidenceRef does not prove that the referenced evidence exists, is authentic or satisfies a substantive gate.

**Implication:** Arb's digest references, provider authentication, profile declaration and evidence presence must not be collapsed into one verified/authorized boolean.

### 2.8 Internal cross-domain precedent: CAROB G1.6 and E9

Notion:
- [G1.6 Evidence Conflict, Supersession & Source Authority](https://app.notion.com/p/3efc4454d6d5814699dad7ac074f146c)
- [E9 Evidence Weighting Without Truth Inflation](https://app.notion.com/p/3efc4454d6d5814ebd67d18bc179d5e5)

These are Carob-specific, not IMMORTAL normative financial rules. They nevertheless predate this Arb assessment and already articulate:
- authenticity is distinct from consistency, authority for a particular decision and truth;
- authority typed to a predicate and scope;
- explicit conflict records and no silent conflict erasure;
- no universal source ranking or majority shortcut;
- no automatic truth/authority inflation from recency, model confidence, source count or fusion score;
- provenance, uncertainty and scope preservation.

**Implication:** the conceptual separation of evidence from truth and authority is also existing internal project work. Arb should reuse the principle and map it to financial semantics rather than claim to originate the pattern.

## 3. Arb artefacts: what they do and do not establish

| Arb artifact | Valid contribution | Does not establish |
|---|---|---|
| ObservationRecord / reducer | Source-scoped observation envelope, identity lineage, per-stream replay and conflict handling | Provider truth, account completeness, economic admission or authority |
| ProviderProfile schema | Declarative provider/product/protocol/scope and source semantics | That declarations match a real provider or its official documentation |
| CollectionCoverageReport | Per-family query/coverage/pagination/boundary/omission status | Complete legal/financial liability population, atomic account snapshot, or verified ownership |
| rawDigestRef equality | Matching of a digest reference across replayed records | Retrieval, digest recomputation, cryptographic authenticity or signer trust |
| OpenExposure projection | Typed gross entries without implicit aggregation/netting | A position/PnL/solvency/risk-budget calculation |
| S1 CI and synthetic fixtures | Deterministic checks over declared synthetic cases | Provider conformance, D0/D1, external review, production security or trading permission |

## 4. Correct integration path — no duplicate kernel

The intended flow should be:

1. **Provider adapter (Arb):** collect source-scoped raw observations, preserve provider IDs/cursors/timestamps and record profile-version/coverage limitations.
2. **Source qualification (existing IMMORTAL/PRE profile):** apply the exact domain-specific qualification contract. For PRE oracle prices, use Gates 23/24/30; for EEV, discharge R9 V1–V9 and EV1–EV7. Other account/venue evidence needs its own explicit mapping and cannot inherit price-source qualification.
3. **Economic observation/refinement:** project only semantically justified inputs. Unknown or partial data remains unresolved; no local synthesis of truthVerified, eevFresh, obligationsComplete or allOmegaSuccessorsInCertifiedKernel.
4. **IMMORTAL admission:** the authoritative producer evaluates the candidate transition with the existing Economic Gate, ProtectedCapital/viability and Ω rules.
5. **Evidence binding:** bind the returned decision to the exact observation, pre-state, action, candidate post-state, consumed resource/UTxO inputs and transaction evidence using the existing witness/transition contracts.
6. **Composition:** where resources, obligations or environments are shared, require X1–X7; no implicit cross-stream total order or netting.

Arb's role is step 1 and evidence support for steps 2–5. It does not own the normative semantics or the admission decision.

## 5. Gap matrix for Arb

| Requirement | Existing IMMORTAL contract | Current Arb coverage | Next work |
|---|---|---|---|
| Source identity and profile | Gates 23/24/30; R9 V1 | ProviderProfile fields and explicit source/instrument mappings | Map fields to the exact domain profile; test official source mapping |
| Per-source provenance | Gate 23 E3; R9 EV1/EV2 | ObservationRecord and raw evidence references | Bind provider event/payload refs to qualification packet |
| Freshness | Gate 23 E5/E6; Gate 30 §11; R9 V3/EV3 | timestamps/profile semantics in S1; no universal account-data freshness result | Provider-specific clock, age and failure semantics |
| Independence/correlation | Gate 23 E7; Gate 24 correlation class | Not materially implemented in Arb ProviderProfile | Add only when a multi-source decision requires it; preserve common upstream |
| Deterministic derivation | Gate 23 E8/E11; R9 V4/EV2 | deterministic replay; no canonical valuation derivation | Bind transformations/ruleset versions; keep price conversion out of generic reducer |
| Liquidity/depth/executability | Gate 23 E10; Gate 30 §10; ExecutableLiquidityObservation | Typed exposures only; no live executable liquidity | Use existing domain observation and exact input binding; do not infer from quote/volume |
| Coverage and completeness | Gate 23 E4/E12; R9 V2/V7 and EV5; GOV-27 | New per-family CollectionCoverage schema | Define provider-specific completion conditions and connect to obligations-complete evidence; no account-wide boolean |
| Integrity verification | R9 V2/V4, EV1/EV2; GOV-27 | rawDigestRef equality only | Preserve raw bytes; independent recomputation/verifier contract remains OPEN |
| Financial meaning | R9 V5/V6; IMMORTAL accounting partition; EXP crosswalk | asset/unit/gross record typing | Keep balances, positions, fills, fees, liabilities and settlement as distinct semantic families |
| Principal / authority | GOV-27; D0/D1; source-specific governance | Not implemented in S1 | Keep OPEN; provider credentials/auth cannot close these gates |
| Economic admission | Existing Economic Gate / EconomicAdmissionWitness | Not implemented in Arb and must not be | Consume an authoritative IMMORTAL decision; bind exact witness |
| Composition | X1–X7 | independent stream replay only | No multi-resource composition until X1–X7 evidence exists |

## 6. Revised contribution statement

The current defensible contribution is not a new universal evidence-qualification layer or a new economic admission algorithm.

It is a candidate provider-neutral adapter and mapping layer for autonomous financial agents, designed to:
- preserve each provider's true identity, event, cursor, timestamp, coverage and known limitations;
- produce reproducible, scope-bounded evidence records;
- map source observations to the existing IMMORTAL domain contracts without promoting an observation into truth or authority;
- bind any later economic decision to the exact source evidence and consumed state/resource inputs;
- preserve provider differences rather than flattening them into invented universal semantics.

This remains a candidate engineering contribution until a concrete provider profile is mapped, its evidence is tested, and the output is demonstrably accepted by the existing IMMORTAL contracts without duplicating or bypassing them.

The novelty claim is therefore narrowed to interoperability and faithful evidence mapping from heterogeneous financial providers into an existing normative economic admission system, not invention of the underlying qualification, truth/authority separation, reconciliation, or economic gate.

## 7. Do not implement a parallel EvidenceQualification type yet

Before introducing any new Arb qualification certificate:
- compare every proposed field against Gates 23/24/30, R9 EV1–EV7, V1–V9, GOV-27 and the existing EconomicAdmissionWitness;
- establish which fields are source observations, which are verified claims, which are decision results and which are authority decisions;
- use existing IMMORTAL semantics wherever they already fit;
- document the exact gap where a generic account/venue profile adds requirements not covered by the PRE oracle or EEV-specific contracts;
- obtain independent review before claiming generalization beyond the current PRE-RICH use case.

No new economic kernel, authority system, generic truth score, source-ranking algorithm, or automatic admission decision is proposed.

## 8. Current status and non-regression

- This crosswalk is a read-only assessment of IMMORTAL main; no IMMORTAL file or branch was changed.
- Arb remains S1 synthetic/read-only. No provider, credential or account has been selected or connected.
- D0, D1, independent external review and provider-specific conformance remain OPEN.
- No S2/S3 capability is authorized.
- No Cormia code or specification was changed.


## 9. Cross-branch prior-art findings — 2026-11-03

The full inventory and targeted source review of all 31 visible branches across IMMORTAL (27), Cormia (3) and Arb (1) are recorded in [BRANCH-PRIOR-ART-AUDIT-2026-11-03.md](BRANCH-PRIOR-ART-AUDIT-2026-11-03.md).

This adds three material sources beyond the earlier main-only crosswalk:

1. **IMMORTAL work/immortal-green-closure** already has a multi-oracle source registry and observation prototype: canonical payload/SHA-256, Ed25519 signed snapshot, exact source/feed/policy binding, currentness provider, revocation overlay and rollback/equivocation checks. Its historical Actions run #20 (40823847938) passed 53 focused tests. It is **not production-wired**: source/feed/key identities are fixtures, authority/currentness provider is unselected, process-local anti-rollback is not durable across restart, and no source/quorum/aggregation/USD-USDM policy is approved. Do not build a parallel price-feed registry or currentness mechanism in Arb.
2. The same branch has multi-venue USDM observation/source matrices and a PRE-RICH ticket ProtectedCapital item-ledger/source-census prototype. These establish important lineage, independence, scope and completeness patterns, but the former is an indicative market-source discovery, not canonical EEV; the latter is PRE ticket-specific, accepts a caller-supplied snapshot, and explicitly does not prove source authority, complete ticket population or full ProtectedCapital.
3. **IMMORTAL work/b3-materios-provenance-evidence** already has the generalized derivation contract, EXP-06 Evidence-as-Input, EXP-12 Observer/Authority Split and EXP-03/04/07/08/09/10 boundaries, plus structural harnesses. Those are prior internal research/conformance boundaries, not complete production economic functions. **Cormia work/exp-generalization-crosswalk** has a 2026-11-03 prior-art composition review and reuse matrix; **Cormia work/project-normative-contract** has PNC-bound mandate/runtime authority. Cormia operational mandate is not financial Principal authority.

### Revised account/venue gap

The residual candidate for Arb is now narrower still: **provider-specific observation and mapping of external broker/exchange account and trading-lifecycle data** (balances, orders, executions/fills, corrections, fees, positions, liabilities and settlement), where those semantics are not already covered by the exact source/provider contract. Price-only feeds should map to the existing IMMORTAL multi-oracle work rather than create an Arb oracle subsystem. PRE-RICH ticket item census should reuse/benchmark the existing IMMORTAL item-ledger boundaries rather than be copied as a generic brokerage ledger.

This remains a candidate integration gap, not proven novelty. The 31-branch audit is a complete branch-tree inventory with targeted reading of relevant files, not a line-by-line audit or independent security certification of every file in all repositories.


## 10. Security and tool-receipt prior art — 2026-11-04

The [Security and Verification Prior-Art Addendum](SECURITY-VERIFICATION-PRIOR-ART-ADDENDUM-2026-11-04.md) records two new external references:

- **Substrate 1.10.3/1.10.4 (Flux Point plugins):** narrows the read-only command exemption, then adds bounded fail-closed judgment and symlink-safe hook execution. It is an opt-in, static command tripwire, not an egress sandbox, account mandate or economic authority.
- **Orynq tool-receipts (#227):** binds a registered scheme's signed content to the recorded response and uses own-property-only verifier/commitment lookup; null registries fail closed. The verifier distinguishes response binding from call/request binding.

### EXP disposition

- **EXP-06:** Orynq is implementation prior art for binding a receipt to the raw response it claims to attest. Arb's current `rawDigestRef` equality still does not retrieve/recompute raw bytes or prove signer trust. Reuse the contract pattern; do not create another evidence registry.
- **EXP-12:** both systems reinforce separation of command permission, observation, verification, call attribution and authority. Neither verifier success nor hook success supplies Principal/mandate or economic admission.
- **EXP-03 / EXP-07 / EXP-08 / EXP-10:** no new semantic coverage. These changes do not establish asset eligibility/valuation, regime/hysteresis, netting/offset or RiskBudget/exposure.

**Non-regression:** no new Arb EvidenceQualification type, source registry, signature/currentness service, execution permission authority, risk budget, economic kernel or trading actuator is introduced. S1 remains synthetic/read-only; D0/D1 and S2/S3 gates remain OPEN.



## 11. Account and trading lifecycle mapping — 2026-11-04

The [Account & Trading Lifecycle — IMMORTAL Mapping Matrix v0.1](ACCOUNT-TRADING-LIFECYCLE-IMMORTAL-MAPPING-MATRIX-v0.1.md) maps balances, orders, fills/executions, fees, positions, liabilities/financing, transfers, collateral and settlement to the existing IMMORTAL state aggregates and EXP boundaries.

The review confirms that Arb's ProviderProfile, CollectionCoverageReport and ObservationRecord v0.2 already provide a provider-neutral evidence envelope and per-family coverage. The remaining contract gap is typed, provider-specific field mapping for balances, positions, collateral, liabilities, financing and settlement; the generic ObservationRecord payload intentionally does not validate those semantics.

The matrix does not add a generic financial ledger, netting engine, valuation policy, RiskBudget, EvidenceQualification, verifier registry or economic gate. It preserves gross facts and lifecycle distinctions, and requires a concrete provider's official contract before any schema extension or provider selection.

**Non-regression:** S1 remains synthetic/read-only; no provider is selected or connected; D0/D1 and independent review remain OPEN; S2/S3 remain unauthorized.


## 12. Account/trading overlap and IMMORTAL reuse audit — 2026-11-04

The [Account/Trading Overlap & IMMORTAL Reuse Audit v0.1](ACCOUNT-TRADING-OVERLAP-IMMORTAL-REUSE-AUDIT-v0.1.md) performs the field-level comparison requested in the prior section.

Findings:
- IMMORTAL multi-venue/oracle work already supplies exact asset identity, source lineage, venue-vs-indexer independence, raw observation and coverage patterns; it is not an external broker account lifecycle adapter.
- The PRE-RICH ProtectedCapital item ledger supplies reusable item identity, snapshot binding, explicit classification, blocker and aggregate-reconciliation patterns; it is PRE-RICH-specific and explicitly does not prove source completeness or full ProtectedCapital.
- R9/EV1–EV7 and EconomicAdmissionWitness remain IMMORTAL-owned valuation/admission boundaries. Provider balances, account equity, positions or marks do not become EEV by naming.
- Arb OpenExposure is already a gross-only projection. It must not become a universal account ledger; a concrete unresolved binding remains between each exposure item's `evidenceRef` and its exact ObservationRecord / EXP-06 tuple.
- The remaining candidate contribution is provider-specific read-only account/trading lifecycle collection, correction handling, per-family coverage and cross-family reconciliation, with no netting, valuation, economic admission or actuation.

**Non-regression:** no schema, application code, IMMORTAL economic rule, EEV policy, ProtectedCapital partition, RiskBudget, verifier registry or authority was changed. S1 remains synthetic/read-only; D0/D1 and independent review remain OPEN; S2/S3 remain unauthorized.

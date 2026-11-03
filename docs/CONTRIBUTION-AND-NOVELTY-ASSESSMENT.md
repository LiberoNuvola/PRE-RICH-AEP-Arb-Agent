# Contribution and Novelty Assessment — Evidence-to-Economic Decision Boundary

**Revision:** 0.1 — 2026-11-03  
**Status:** preliminary prior-art assessment and research hypothesis; no novelty, patentability, freedom-to-operate, or independent-review claim  
**Scope:** Arb S1 evidence ingestion and its proposed hand-off to the IMMORTAL economic kernel  
**Research basis:** targeted searches across trading reconciliation, exchange account APIs, stream processing, proof of reserves/solvency, provenance/attestation, data quality, identity/authorization, and financial netting/reconciliation.

## Executive conclusion

Most individual technical mechanisms in the current Arb S1 design are established prior art. Event envelopes, deterministic replay, per-stream cursors, snapshot recovery, reconciliation, missing-versus-flat distinctions, provenance, cryptographic attestations, proof of reserves/liabilities, portfolio reconciliation, and legal netting requirements all have mature precedents.

The project must not claim to have invented those mechanisms.

The defensible research hypothesis is narrower:

> **A portable, decision-specific evidence-to-economic-admission boundary that makes the scope, completeness, freshness, lineage, verification, composition and authority limits of external financial evidence explicit before that evidence is consumed by a normative economic kernel.**

The potential contribution is the formal composition and enforcement of these boundaries across otherwise separate domains—not the individual primitives. The current repository does not yet implement or prove this end-to-end model. This document records a research hypothesis and a falsifiable development programme, not a demonstrated scientific novelty claim.

## 1. Prior-art landscape

### 1.1 Trading systems already implement reconciliation and missing-data safety

**NautilusTrader — Execution Reconciliation**

NautilusTrader is the closest directly relevant implementation found in this review. Its live reconciliation aligns venue order/position reports with internal event-sourced state. It distinguishes an explicit open or flat position report from a missing report or null quantity; absence is not treated as flat. Unresolved in-scope reports can prevent startup. Its documentation also covers bounded-history safety, duplicate reports, correction handling, out-of-order fill reports, and races between REST snapshots and streaming fills. It explicitly warns that a snapshot arriving later may still describe an earlier state.

Implication for Arb:
- Do not claim missing-versus-zero/flat safety as a new invention.
- Do not claim snapshot/stream race handling as new.
- Treat NautilusTrader as a mandatory implementation comparator for any future order/fill/position projection.
- Arb may still differ in being a provider-neutral evidence contract and a consumer-side evidence boundary rather than a trading execution engine.

Reference: https://nautilustrader.io/docs/latest/concepts/execution/reconciliation/

**OANDA v20 — Account Snapshot and Incremental Updates**

OANDA documents an initial Account Details request that returns a complete, self-consistent account snapshot, followed by Poll Account Updates calls using a TransactionID cursor. It distinguishes transaction-driven account changes from price-dependent account state.

Implication for Arb:
- Snapshot plus cursor-based delta is established API design.
- The future ProviderProfile must declare whether a provider really guarantees a complete snapshot, a consistent cursor hand-off, and which categories are included. Arb must not assume OANDA-like semantics for other providers.

Reference: https://developer.oanda.com/rest-live-v20/best-practices/

### 1.2 Stream-processing and replay guarantees are established prior art

**Apache Flink**

Flink checkpoints combine the position/offset of each input stream with the state of operators, enabling consistent recovery and replay. Its model shows that per-stream checkpoint positions and operator state are known techniques; it also illustrates how a true consistent multi-input snapshot must be constructed, rather than inferred from timestamps or list ordering.

Reference: https://github.com/apache/flink/blob/master/docs/content/docs/concepts/stateful-stream-processing.md

**Debezium / Kafka Connect**

Debezium documents at-least-once source delivery with possible duplicate records. It can use Kafka Connect's exactly-once support under specific deployment/configuration conditions, while also documenting open questions and possible edge cases in the underlying Kafka transaction protocol.

Implication for Arb:
- Idempotent replay, duplicate handling, cursor persistence and checkpointing are not novel.
- Exactly-once must always be scoped to a specific system, connector, storage and transaction boundary; it must not be asserted as a generic end-to-end financial guarantee.

Reference: https://debezium.io/documentation/reference/3.5/configuration/eos.html

### 1.3 Financial solvency and proof-of-reserves research already crosses multiple evidence sources

**Saggese et al. / Oesterreichische Nationalbank, Working Paper 248**

The study cross-references cryptoasset wallets, balance sheets and supervisory entity data. In its sample, on-chain holdings and balance-sheet entries were consistent for only two of four VASPs. The authors identify data gaps around wallet attribution, asset-type breakdowns, evidence that a VASP controls the funds associated with its wallets, and reasonable reporting frequency.

The related journal article was published in Applied Economics in 2025: https://doi.org/10.1080/00036846.2024.2396640

Implication for Arb:
- Cross-source financial evidence and the need to identify gaps are established research topics.
- A multi-source evidence graph or a “proof before decision” slogan alone is not a new contribution.
- A possible difference is to formalize these gaps as machine-readable, decision-scoped gate conditions that can be consumed by an economic kernel.

References:
- https://www.oenb.at/dam/jcr:91ee2032-1751-487b-850d-81138a68f3cd/WP-248_03112023.pdf
- https://doi.org/10.1080/00036846.2024.2396640

**Chainlink Proof of Reserve / Proof of Solvency**

Chainlink describes Proof of Reserves and Proof of Liabilities as separate components of solvency evidence. Its own technical discussion identifies freshness and completeness challenges in liability trees, including partial participation that can permit omission of users. It also explicitly states that cryptographic PoR/PoL techniques alone do not establish legal or regulatory solvency, do not prove the absence or priority of other liabilities, and do not prove that reserve assets are free from double use as collateral.

Implication for Arb:
- Reserve/liability evidence, oracle attestations, Merkle proofs and freshness controls are established.
- The project must not claim that it invented the distinction between reserves and liabilities or that cryptographic evidence proves legal solvency.
- The ProviderProfile and CollectionCoverage models must preserve off-chain, omitted, encumbered and out-of-scope liabilities as unresolved when evidence does not cover them.

References:
- https://docs.chain.link/data-feeds/proof-of-reserve
- https://chain.link/blog/proof-of-solvency

**Broken proof-of-solvency constructions**

Chalkias, Chatzigiannis and Ji, Broken Proofs of Solvency in Blockchain Custodial Wallets and Exchanges (IACR ePrint 2022/043; later published in the Financial Cryptography and Data Security workshop proceedings), documents real-world flaws in liability-proof implementations, including weak cryptographic choices, truncation, incorrect data binding, misuse of bulletin boards and missing user-ID uniqueness guarantees.

Implication for Arb:
- A digest reference or Merkle root is not sufficient by itself.
- Exact bytes, canonicalization, cryptographic recomputation, binding to scope/identity, unique identifiers and a reproducible verifier must be specified before any integrity claim is made.
- Current Arb S1 only compares rawDigestRef references; it does not recompute a cryptographic digest.

Reference: https://eprint.iacr.org/2022/043

### 1.4 Provenance, signatures and verification are established in software supply-chain security

**SLSA / in-toto**

SLSA provenance describes where, when and how software artifacts were produced. Its verification model requires consumers to check trusted builder identities, signatures and declared expectations. Its Verification Summary Attestation explicitly identifies a verifier and the policy/verification result.

Implication for Arb:
- Provenance and separate verification are not new concepts.
- SLSA is designed for software artifacts, not financial facts. It is a source of design patterns, not proof that a provider's account data is true, complete, owned by a Principal or economically admissible.
- A future financial evidence attestation must define its own trust roots, scope, claims and policy.

References:
- https://slsa.dev/spec/v1.2/provenance
- https://slsa.dev/spec/v1.2/verifying-artifacts
- https://slsa.dev/spec/v1.2/verification_summary

**CloudEvents and RFC 8785 JCS**

CloudEvents already defines an event envelope and producer-scoped source+id uniqueness. RFC 8785 defines deterministic JSON canonicalization for hashing/signing and recommends JSON strings for values requiring precision beyond IEEE-754 double precision.

Implication for Arb:
- The ObservationRecord envelope and its source/stream/event lineage must be understood as an application-specific profile, not a new event standard.
- JCS can be evaluated for canonicalizing manifests, but canonicalization is not hashing, authentication or source verification.
- Monetary values, large sequence values and high-precision quantities should remain strings.

References:
- https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- https://www.rfc-editor.org/rfc/rfc8785.html

### 1.5 Identity, authority and netting have mature precedents

**NIST SP 800-207 — Zero Trust Architecture**

NIST explicitly separates authentication and authorization and rejects implicit trust based only on network location or asset ownership. This supports the design rule that successful authentication is not the same as permission to use a resource.

Implication for Arb:
- The distinction between identity, authentication and authorization is established security practice.
- Financial Principal authority, account ownership/control and isolation still need their own domain-specific evidence and decisions; NIST ZTA does not establish those financial facts.

Reference: https://csrc.nist.gov/pubs/sp/800/207/final

**IOSCO / CPMI-IOSCO / ISDA / Basel**

Portfolio reconciliation, trade identifiers, lifecycle events, dispute management and legally enforceable netting are established financial practice. Basel's SA-CCR framework conditions recognized netting on a contractual single legal obligation, written reasoned legal reviews across relevant jurisdictions, and supervisory satisfaction with enforceability. Netting is therefore not a numeric operation that can be inferred from opposite signs or matching currencies.

Implication for Arb/IMMORTAL:
- Gross exposure preservation is a conservative data representation, not a new financial-law principle.
- The distinctive engineering question is how evidence for identity, contractual scope, legal enforceability, settlement and composition is represented and carried to the normative economic rule without silently granting a netting right.

References:
- https://www.iosco.org/library/pubdocs/pdf/IOSCOPD469.pdf
- https://www.isda.org/a/X21gE/Portfolio-Reconciliation-Dispute-Management-and-Reporting-SOP-Version-2-091523.pdf
- https://www.bis.org/committees/bcbs/basel-framework/standard/cre/52/inforce/2019-12-15/published/2019-12-15

## 2. Requirement-by-requirement novelty classification

| Requirement or mechanism | Prior-art coverage found | Current Arb position | Classification |
| --- | --- | --- | --- |
| Event envelope and event identity | CloudEvents | ObservationRecord with stricter stream/profile/evidence fields | Reuse/adapt |
| Per-stream ordering, replay and checkpoints | Flink, Kafka, Debezium and event-sourcing systems | Independent replay and per-stream checkpoints | Established technique |
| Snapshot plus incremental account updates | OANDA v20 and many provider APIs | Generic ProviderProfile declares snapshot/cursor semantics; no live provider mapped | Established pattern; profile-specific guarantees |
| Missing report is not flat/zero | NautilusTrader; Chainlink PoL completeness caveats | Explicit incomplete/unknown states and no zero inference | Existing safety principle; formalize per scope |
| Order/fill correction and snapshot races | NautilusTrader and venue-specific execution engines | S1 has local correction/fill lineage tests; no live provider conformance | Existing problem and known solutions |
| Financial cross-source reconciliation | OeNB VASP study; ISDA portfolio reconciliation; Chainlink PoR/PoL | Typed evidence model and source-profile design only | Established domain; integration opportunity |
| Artifact provenance and independent verification | W3C PROV-O, SLSA, in-toto, DSSE | References and role separation; no cryptographic verification implementation | Reuse/adapt |
| Cryptographic completeness/integrity | JCS, DSSE, Merkle proofs and PoL literature | rawDigestRef string equality only | Not implemented; material gap |
| Principal/account authority separation | NIST ZTA and authorization frameworks | D0/D1 remain OPEN; adapter cannot set either | Established principle; financial binding remains unproven |
| Gross obligations and legal netting | ISDA/IOSCO/Basel | Typed gross OpenExposure; no netting/novation | Established principle; explicit evidence binding remains a design requirement |
| Cross-stream/resource composition | Flink consistent snapshots; financial portfolio and netting frameworks | Composition X1–X7 remains unresolved absent its explicit witness | Partial overlap; exact financial composition semantics need evidence |
| Evidence-to-economic admission hand-off | Related elements in the systems above, but no end-to-end equivalence established in this review | Arb is a consumer; IMMORTAL owns normative economic admission | Candidate integration contribution; not yet demonstrated novel |

### What is clearly not a novelty claim

The following should be described as implementation choices, safety invariants or reuse of established practice—not inventions:
- event sourcing, deterministic replay, idempotency, per-stream cursors and checkpoints;
- source/event IDs, snapshots, pagination and incremental updates;
- missing-data-not-zero, stale-data flags and reconciliation barriers;
- provenance graphs, hashing, canonicalization, signatures and attestations;
- order/fill lifecycle tracking and gross exposure representation;
- legal prerequisites for netting and novation.

## 3. Candidate contribution: a decision-specific evidence boundary

The candidate contribution is a **decision-specific evidence qualification contract** between external sources and the normative economic kernel.

It does not decide economic admission itself. It states which evidence is available, which claims that evidence supports, what scope/time/resource boundary it covers, what remains unknown, and which verification/authority requirements have or have not been met. IMMORTAL remains the only normative economic kernel and decides economic admission under its own rules.

A future evidence-qualification record could combine these dimensions:

1. **Decision purpose:** the exact economic claim or downstream evaluation being supported. Requirements must be specific to the decision; an observation requiring only a public quote must not require a complete account snapshot.
2. **Source/profile scope:** provider, product, environment, resource scope, profile version, official documentation basis and known exclusions.
3. **Collection coverage:** per-data-family status, exact query scope, completion evidence, pagination exhaustion, snapshot/cursor boundary, retention status, truncation and omissions.
4. **Temporal consistency:** source time meaning, receipt time, sequence/cursor semantics, freshness, gaps and atomicity. Data from different time boundaries cannot silently become one coherent account state.
5. **Lineage and integrity:** provider identifiers as supplied, raw evidence reference, preserved bytes, canonicalization version, computed digest, transformation lineage and independent verification result.
6. **Economic semantics:** explicit instrument/asset/unit mapping; order-versus-fill-versus-settlement distinction; gross obligations; correction/novation evidence; no inferred conversion, netting or settlement.
7. **Authority and composition:** separate Principal and resource-control evidence, mandate scope, isolation evidence, and any required Composition Contract X1–X7 witness. The evidence adapter cannot close D0/D1 or grant authority.

The qualification output should be an evidence status with reasons and references, not an economic permission. Candidate statuses include QUALIFIED_FOR_DECLARED_PURPOSE, INCOMPLETE, STALE, CONFLICTED, UNVERIFIED, OUT_OF_SCOPE and UNAUTHORIZED. Exact status semantics and the consuming IMMORTAL interface remain to be specified and reviewed.

This model should be **claim- and purpose-scoped**, not a universal accountComplete boolean. An account-level or global completeness claim is valid only if the declared profile establishes the relevant scopes and boundaries.

## 4. Falsifiable properties to test

The contribution only becomes substantive if these properties are formally defined and tested against adversarial fixtures and established implementations.

| ID | Proposed property | Falsification condition |
| --- | --- | --- |
| EEA-P1 | **No zero by omission:** removing, filtering, truncating or failing to retrieve a required data family cannot turn an unknown/incomplete state into zero, none or complete-empty. | A missing page or unrequested family reduces reported exposure/liability or upgrades coverage. |
| EEA-P2 | **Scope-preserving evidence:** a verification or completeness result supports only the exact profile version, resource scope, query, time and snapshot/cursor boundary that were checked. | Evidence for one account, period, family or snapshot is accepted for another without an explicit mapping/witness. |
| EEA-P3 | **Monotonic degradation:** weakening or removing evidence cannot make the qualification result more permissive for the same decision purpose. | Deleting a source, losing a page, introducing a gap or invalidating a digest improves readiness. |
| EEA-P4 | **No authority escalation:** source authentication, signature validity, successful verification or operator identity cannot by themselves grant Principal authority, account ownership or permission to act. | An adapter/verifier assertion closes D0/D1 or grants an execution mandate. |
| EEA-P5 | **Stream-local causality:** no total order across independent streams is inferred without an explicit composition witness. | Timestamps, arrival order or lexical ordering silently resolve cross-stream conflicts. |
| EEA-P6 | **Gross obligation conservation:** amounts and obligations remain gross and typed unless legally and technically valid netting/novation evidence is supplied to the appropriate authority. | Opposing signs, equal quantities, same currency or owner-label changes silently net or transfer obligations. |
| EEA-P7 | **Evidence/verifier separation:** verification is traceable to the exact artifact and policy/method; a collector cannot self-upgrade its own claims into verified status. | A source response, digest reference or collector-generated flag is accepted as independent verification. |
| EEA-P8 | **Reproducible lineage:** given the same raw artifacts, profile version, normalization version and canonicalization rules, the evidence qualification is reproducible and its decisions are explainable. | A later replay cannot reproduce the same claim status or identify the exact input/transform that produced it. |

These are candidate invariants. No formal proof is claimed. They need executable property-based/adversarial tests, comparison with reference systems, and independent review.

## 5. Required comparative experiments

Before claiming an original contribution, Arb should be compared against actual reference systems rather than only against written standards.

### Experiment A — Trading reconciliation baseline

Use NautilusTrader's documented scenarios as a comparator:
- explicit flat versus missing position report;
- bounded history without a position report;
- fill arrives while a REST snapshot is in flight;
- stale snapshot arrives after a newer fill;
- duplicate and corrected fill identities;
- missing commission, instrument mapping or source report.

Measure whether the Arb evidence contract preserves uncertainty without accidentally projecting a trading state it cannot justify. Do not reproduce NautilusTrader's trade execution engine in Arb.

### Experiment B — Account snapshot/cursor baseline

Use a documented provider such as OANDA as a reference profile:
- initial snapshot and cursor hand-off;
- incremental changes versus price-dependent state;
- repeated/overlapping deltas;
- recovery after a lost cursor or incomplete page;
- scope changes and missing account categories.

This is a design comparison only. No account or credential is needed to build synthetic fixtures.

### Experiment C — Solvency and proof-of-reserves attacks

Model:
- liabilities omitted from the declared population;
- wallet address present but ownership/control unproven;
- reserve assets borrowed or encumbered for the snapshot;
- off-chain liabilities and bank/fiat accounts omitted;
- stale roots or proof services;
- missing high-balance users;
- weak digest/data binding and duplicate IDs.

Measure whether the qualification status becomes INCOMPLETE, UNVERIFIED or CONFLICTED rather than QUALIFIED_FOR_DECLARED_PURPOSE.

### Experiment D — Evidence degradation tests

Apply mutation/property tests:
- delete one page;
- change the provider profile version;
- mark one data family NOT_REQUESTED;
- turn pagination from EXHAUSTED to NOT_EXHAUSTED;
- change snapshot boundary or atomicity;
- remove a provider event ID;
- reuse an ID across a cursor;
- substitute a digest reference while changing raw bytes;
- make the verifier untrusted;
- remove a Principal/resource authority witness;
- add an independent stream without a composition witness.

The qualification must not improve when evidence degrades.

### Experiment E — Decision-specificity and false rejection

Compare a narrow decision (for example, classifying a public market observation) with a decision requiring account solvency or settlement evidence. Ensure the model demands all and only the evidence required by the declared purpose. Otherwise, a blanket completeness policy would be safe but unusable.

Measure false acceptance, false rejection, reason-code quality, reproducibility and time/effort to onboard a new provider profile.

## 6. IMMORTAL and Cormia boundaries

| Boundary | Consequence for this research |
| --- | --- |
| EXP-03 | Instrument/asset identity and eligibility remain distinct from valuation, haircut, liquidity and ProtectedCapital. |
| EXP-07 | Regime observations do not become controller authority or new thresholds. |
| EXP-08 | Gross obligations remain separate; no implicit netting. |
| EXP-09 | Ownership/source changes do not prove novation or transfer. |
| EXP-10 | RiskBudget, RealizedExposure and ProtectedCapital remain distinct. |
| EXP-12 | Observer, verifier and authority remain separate. |
| Composition X1–X7 | No multi-stream/global resource composition without the approved explicit witness. |
| IMMORTAL | Owns normative economic rules and admission. Arb only supplies source-scoped evidence/projections under the approved interface. |
| Cormia | Owns operational identity, workspace, mandate/task orchestration and runtime boundaries; Cormia operational authority cannot grant financial authority. |

No IMMORTAL normative rules, shared branches or Cormia specifications are amended by this assessment.

## 7. Research gaps and limits

This is a targeted web-based prior-art sweep, not an exhaustive systematic literature review, patent search, legal opinion, freedom-to-operate analysis or peer-reviewed novelty evaluation. It has not examined every proprietary broker/exchange system, all account-aggregation products, all data-contract frameworks, or every academic database.

Specific unresolved questions:
- Does an existing system already offer a generic, machine-readable, decision-purpose-scoped evidence contract that couples per-family collection coverage, provenance verification, Principal authority and economic-kernel admission?
- Can the contract be expressed as a small set of formal safety properties without duplicating the normative kernel?
- Can it remain provider-neutral without flattening important provider-specific differences in finality, snapshots, corrections and account scope?
- How should legal/account ownership evidence be represented across jurisdictions and custody arrangements?
- Can the proposed properties be proven, model-checked or systematically tested, beyond example-based conformance?

Until these questions are answered, the correct description is **candidate integration contribution**, not “new algorithm”, “first of its kind”, “novel proof system” or “proven superior model”.

## 8. Current decision

1. Keep the prior-art primitives as reuse/adaptation, not claimed invention.
2. Treat the decision-specific evidence boundary as the central research hypothesis.
3. Do not add cryptographic implementation, live provider integration, S2 or S3 on the strength of this document.
4. Next technical deliverable should be a formal EvidenceQualification model and its adversarial property tests, only after checking the exact IMMORTAL evidence/admission interface and composition contract.
5. Independent external review and a broader literature/patent search remain necessary before any strong originality or IP claim.

# Contribution and Novelty Assessment — Evidence-to-Economic Decision Boundary

**Revision:** 0.1 — 2026-11-03  
**Status:** preliminary prior-art assessment and research hypothesis; no novelty, patentability, freedom-to-operate, or independent-review claim  
**Scope:** Arb S1 evidence ingestion and its proposed hand-off to the IMMORTAL economic kernel  
**Research basis:** targeted searches across trading reconciliation, exchange account APIs, stream processing, proof of reserves/solvency, provenance/attestation, data quality, identity/authorization, and financial netting/reconciliation.

## Executive conclusion

Most individual technical mechanisms in Arb S1 are established prior art. The targeted external review confirms substantial overlap with trading reconciliation, stream processing, proof-of-reserves/liabilities, provenance/attestation, source qualification and financial netting practice.

A second, decisive check against our own canonical IMMORTAL repository found that the broader evidence-to-economic-admission concept is also already substantially specified internally:
- Notion Gate 23 defines PRE oracle source qualification and evidence classes E1–E14.
- Notion Gates 24 and 30 define candidate discovery, exact source identity, canonical PriceReference qualification, state/phase binding and admissibility.
- IMMORTAL R9 normatively defines EEV source, verification, freshness, deterministic derivation, conservative conversion, failure/equivocation and shock requirements (V1–V9), plus evidence artifacts EV1–EV7.
- The IMMORTAL Economic Gate, PRE-RICH admission path, EconomicAdmissionWitness, Cardano input-binding checks and CanonicalTransitionEvidence already define the downstream economic decision and transaction-evidence boundary.
- Composition Contract X1–X7 and GOV-27 already separate joint composition, canonical integrity, authorization, evidence and ruleset validity.
- CAROB G1.6/E9 independently record the internal principles that authenticity is not consistency, authority or truth, and that source authority is typed and scoped.

Therefore we must **not** claim to have invented a universal evidence qualification layer, a separation of evidence from authority, or a new economic admission algorithm.

The remaining Arb-specific candidate is narrower: a provider-neutral adapter and mapping layer for heterogeneous financial account/venue observations that preserves provider-specific identity, event/cursor/time semantics, per-family collection coverage and known exclusions, then maps those records into the existing IMMORTAL source-qualification and admission contracts without creating a parallel kernel.

This is a possible interoperability/engineering contribution, not an established scientific novelty claim. The current Arb repository does not yet implement this end-to-end mapping or demonstrate acceptance by a concrete provider profile and the existing IMMORTAL contracts.
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
| Gross obligations and legal netting | ISDA/IOSCO/Basel | Typed gross OpenExposure; no netting/novation; v0.3 binds items to ObservationRecord eventIds | Established principle; eventId resolution and EXP-06 reliance remain open |
| Cross-stream/resource composition | Flink consistent snapshots; financial portfolio and netting frameworks | Composition X1–X7 remains unresolved absent its explicit witness | Partial overlap; exact financial composition semantics need evidence |
| Evidence-to-economic admission hand-off | IMMORTAL R9, Gates 23/24/30, EXP-06/12, multi-oracle registry/observation prototype, ProtectedCapital item ledger, EconomicAdmissionWitness, GOV-27 and X1–X7 already define substantial boundaries | Arb is currently an S1 synthetic observer; no live provider/account integration or complete hand-off exists | Provider-specific account/venue lifecycle mapping only; not a new evidence framework, oracle registry or economic gate |

### What is clearly not a novelty claim

The following should be described as implementation choices, safety invariants or reuse of established practice—not inventions:
- event sourcing, deterministic replay, idempotency, per-stream cursors and checkpoints;
- source/event IDs, snapshots, pagination and incremental updates;
- missing-data-not-zero, stale-data flags and reconciliation barriers;
- provenance graphs, hashing, canonicalization, signatures and attestations;
- order/fill lifecycle tracking and gross exposure representation;
- legal prerequisites for netting and novation.

## 3. Revised candidate contribution: provider-neutral evidence mapping

The general idea of a decision-specific evidence qualification contract is already substantially covered by IMMORTAL R9, Gates 23/24/30, GOV-27 and the existing economic-admission interfaces. A parallel Arb EvidenceQualification object would risk duplicating those contracts.

The cross-branch audit of all 31 visible IMMORTAL, Cormia and Arb branches narrows this further. IMMORTAL work/immortal-green-closure already contains a multi-oracle source/registry and currentness adapter prototype, multi-venue price-source observation and a PRE-RICH ticket item-ledger/source-census prototype. IMMORTAL work/b3-materios-provenance-evidence already contains EXP-06/EXP-12 and generalized evidence/derivation boundaries. Cormia's work branches already define project mandate, task/runtime authority and prior-art composition.

Therefore the remaining candidate is **provider-specific observation and mapping of external broker/exchange account and trading-lifecycle data**, not a general price-feed/oracle registry or a generic evidence framework. It should preserve source-specific semantics and limitations, then supply correctly scoped evidence to existing IMMORTAL contracts.

The Arb layer may own only what is not already supplied by those existing components:
1. **Provider/account profile:** exact provider/product/environment, official API/message documentation, account/resource scope, data-family map and known exclusions.
2. **Trading-event lineage:** original provider event IDs when present, order/fill/correction identities, stream/cursor semantics, source and receipt timestamps, raw evidence references and normalizer/profile versions.
3. **Account-data collection coverage:** query scope, pagination/continuation, per-family completion, snapshot/cursor boundary, atomicity, retention, truncation, omissions and unresolved states. This is not a proof of global liability completeness.
4. **Financial field mapping:** exact instrument/asset/unit identity and provider-specific balances, orders, executions/fills, fees, positions, liabilities, collateral and settlement semantics; never infer missing provider meaning.
5. **Reproducible evidence packet:** references to raw inputs, normalization/derivation versions and tests. Do not claim cryptographic verification until raw-byte retrieval and recomputation exist.
6. **Contract mapping:** explicit field-by-field mapping to the applicable existing IMMORTAL contract. Price-only source observations should use/reconcile with the existing multi-oracle work. EEV inputs must discharge R9 EV1–EV7. PRE-RICH ticket liabilities should be compared with the existing item-ledger prototype, not copied into a generic broker ledger.

Arb must not own or recreate:
- provider qualification policy where an applicable canonical qualification gate already exists;
- authoritative EEV selection or its normative derivation;
- ProtectedCapital, RiskBudget, viability, Ω or Economic Gate;
- Principal/account authority or D0/D1 closure;
- joint resource accounting or X1–X7 composition;
- the final admission decision.

An account-data CollectionCoverageReport is only a statement about what the adapter requested and collected under a declared provider profile. It is not proof that the provider's universe is complete, that liabilities outside the queried scope do not exist, or that the data is authoritative for an economic decision. Before extending the current schema, compare its fields against IMMORTAL multiOracleObservation/registry, the PRE-RICH ProtectedCapital item census and the applicable EEV/admission interface. Keep the schema only for genuinely unmapped account/venue collection requirements.

The resulting hand-off must use the existing IMMORTAL observation/admission interfaces. Do not define a second universal status vocabulary, source registry, signature/currentness mechanism or permission token unless a concrete unmapped requirement is demonstrated and the canonical owner approves it.
## 4. Candidate Arb conformance properties — not novelty claims

The following properties are useful regression criteria for the Arb-to-IMMORTAL mapping. They overlap with existing IMMORTAL contracts, established prior art and the existing EXP boundaries; they are not claimed as newly invented invariants. Their value is to test that a provider adapter preserves those obligations and does not bypass or weaken them.

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

Before claiming an original contribution, Arb should be compared both with the existing canonical IMMORTAL contracts and with external reference systems. The first baseline is the controlling one: reuse normative contracts and test only the uncovered provider/account-data mapping.

### Experiment 0 — Existing IMMORTAL contract baseline

Use the canonical internal contracts before designing any new Arb gate:
- Gates 23/24/30 for PRE oracle source qualification and exact asset/source semantics;
- R9 V1–V9 and EV1–EV7 for EEV source, verification, freshness, determinism, conservative derivation and failure behavior;
- the current EconomicAdmissionWitness, ExecutableLiquidityObservation, CanonicalTransitionEvidence and admission-provenance audit;
- GOV-27 for separate integrity, authorization, evidence and ruleset checks;
- Composition X1–X7 for shared resources, atomicity, joint gate and perimeter.

For each Arb ProviderProfile/CollectionCoverage field, record one of: exact reuse, domain-specific adaptation, not applicable, or genuinely unmapped. A genuinely unmapped requirement must be described and evidenced before any new type is proposed. The producer-side EEV/protected-capital gap already recorded by IMMORTAL must remain OPEN; a consumer-side observer cannot close it.

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
- Which requirements in Arb ProviderProfile/CollectionCoverage are genuinely not represented by IMMORTAL Gates 23/24/30, R9 EV1–EV7, GOV-27 and the existing admission witness?
- Can a financial account/venue provider profile remain generic without flattening material provider-specific differences in finality, snapshots, corrections, scope and liabilities?
- How should provider-supplied completeness and account-wide claims be independently challenged where hidden/off-platform liabilities may exist?
- How should legal/account ownership evidence be represented across jurisdictions and custody arrangements without treating API authentication as ownership?
- Can the provider-to-IMMORTAL mapping be tested against an actual provider profile and the canonical admission interface without new normative rules?
- Can the proposed safety properties be proven, model-checked or systematically tested, beyond example-based conformance?

Until these questions are answered, the correct description is **candidate integration contribution**, not “new algorithm”, “first of its kind”, “novel proof system” or “proven superior model”.

## 8. Current decision

1. Keep the prior-art primitives as reuse/adaptation, not claimed invention.
2. Treat the decision-specific evidence boundary as the central research hypothesis.
3. Do not add cryptographic implementation, live provider integration, S2 or S3 on the strength of this document.
4. Next technical deliverable should be a formal EvidenceQualification model and its adversarial property tests, only after checking the exact IMMORTAL evidence/admission interface and composition contract.
5. Independent external review and a broader literature/patent search remain necessary before any strong originality or IP claim.


## 9. Internal prior-art reconciliation — decisive correction

The following internal documents and implementation paths were inspected read-only on IMMORTAL main at 97b09a38742098f17a61eb07734c401aeedccc06:

| Existing source | Established boundary | What Arb should reuse |
|---|---|---|
| Notion Gate 23, PRE Oracle Evidence Acquisition & Provider Qualification Matrix | E1–E14 source qualification, provenance, timestamp/freshness, independence, aggregation, depth, reproducibility, failure, historical robustness, on-chain representation | The qualification lifecycle and evidence-packet discipline where source semantics match; do not copy PRE-specific price criteria into account-data profiles |
| Notion Gate 24, PRE Oracle Candidate Discovery & Evidence Collection | Exact identity → quote pair → provenance → evidence → qualification; candidate registry and correlation classification | Discovery/evidence ordering and explicit source-independence analysis |
| Notion Gate 30, PRE PriceReference Canonical Source Qualification & Deployment Contract | PRE-specific phase/pool/UTxO/datum identity, price hierarchy, admissibility predicate, state machine and safe failure behavior | Exact PriceReference semantics only for PRE price-source integrations |
| IMMORTAL R9, EEV Oracle and Valuation Contract | Normative V1–V9 and EV1–EV7 for authoritative source, verification, freshness, reproducibility, conservative conversion, valuation scope, fail-closed behavior, equivocation and Ω shocks | EEV evidence hand-off; no substitute EEV qualification or economic policy |
| PRE-RICH EconomicAdmission and Adapter EconomicAdmissionWitness | Existing Gate/viability composition and binding of decision, observation, pre-state/action/post-state, EEV and executable liquidity | Exact downstream witness and input-binding contract |
| CanonicalTransitionEvidence and EconomicAdmissionTransitionBinding | Action/state fingerprints and transaction-reference binding | Reproducible transition-evidence packet |
| Composition Contract X1–X7 | Shared resource accounting, non-interference, atomicity/unresolved exposure, joint certification/gate and perimeter union | Existing joint composition gate; Arb stream-local replay is not a substitute |
| GOV-27 | Canonical integrity AND authorization AND evidence AND ruleset authorization; EvidenceRef is only structural until resolved | Keep integrity, authority, evidence and ruleset checks independent |
| CAROB G1.6 / E9 | Typed/scoped evidence authority, explicit conflict, no truth or authority inflation from recency, majority or model confidence | Internal conceptual precedent only; Carob policy is not an IMMORTAL financial rule |

The repository also contains an explicit Issue Admission Provenance audit. It states that the admission algorithm, observation surface and refinement boundary exist, while a concrete authoritative EEV/protected-capital/refinement producer and complete end-to-end Issue evidence were still OPEN. Therefore the existence of a witness type must not be represented as proof that the producer or its evidence is complete.

### Revised decision

The candidate contribution is not a new generic evidence-to-economic-admission framework. It is the faithful, provider-neutral implementation of the upstream financial observation/mapping gap, with exact integration into existing IMMORTAL contracts. Its value must be demonstrated by a concrete provider profile, replayable evidence and a successful contract mapping—not by introducing another generic gate.

No new EvidenceQualification schema or status machine should be added until a field-by-field gap analysis shows a requirement not already represented by the existing canonical interfaces.

## 10. Full branch audit — 2026-11-03

The initial version of this assessment relied on IMMORTAL main and selected Notion contracts. The subsequent full branch inventory is recorded in [BRANCH-PRIOR-ART-AUDIT-2026-11-03.md](BRANCH-PRIOR-ART-AUDIT-2026-11-03.md). It covers all 27 IMMORTAL branches, all 3 Cormia branches and Arb's only branch. Relevant files were inspected by targeted source review; this is not a line-by-line certification of every repository file.

### New internal prior art that changes the contribution boundary

- **IMMORTAL work/immortal-green-closure:** multi-oracle observation normalization, signed Ed25519 source registry snapshots, canonical digest verification, exact source/feed/policy binding, currentness-provider interface, revocation overlays, rollback/equivocation checks, multi-venue source matrices, and PRE-RICH ProtectedCapital item-ledger/source census. The multi-oracle prototype's historical Actions run #40823847938 passed 53 focused tests on its exact source SHA, but its trust-root/currentness authority is unselected, anti-rollback memory is process-local, and no production consumer is wired. The item ledger is PRE-RICH ticket-specific, caller-snapshot-driven, and explicitly does not prove source completeness or full ProtectedCapital.
- **IMMORTAL work/b3-materios-provenance-evidence:** generalized derivation contract, EXP-06 evidence-as-input, EXP-12 observer/authority split, EXP-03 asset eligibility, EXP-04 profile composition, EXP-07 regime stress, EXP-08 netting, EXP-09 novation and EXP-10 explicit risk budget. Its generic harnesses test structural boundary properties; they do not implement or certify the underlying economic functions from authoritative inputs.
- **IMMORTAL b1-hardening:** synthetic multi-invariant admission and Aegis comparison. It does not execute Aegis's actual Aiken predicate, prove live Cardano behavior or approve policy thresholds.
- **IMMORTAL release/public-main-curated:** Workflow C/B3 evidence integration and source-to-transition audit material. It reinforces the separation of transport, structural, cryptographic and model evidence; Workflow C remains explicitly uncertified.
- **Cormia work/exp-generalization-crosswalk:** 2026-11-03 prior-art composition review recommends reusing A2A/MCP, existing workflow, sandbox, provenance and resource components rather than building parallel generic subsystems. Cormia work/project-normative-contract adds PNC-bound operational mandate/runtime authority, not financial Principal authority.

### Final novelty classification

The following are explicitly **not** Arb inventions: event replay, source/feed registry patterns, signed snapshot envelopes, digest verification, currentness/revocation checks, evidence-as-input, observer/authority separation, generalized fail-closed derivation boundaries, source/venue independence analysis, PRE-RICH ticket item classification, ProtectedCapital/Economic Gate/viability, and composition semantics X1–X7.

The remaining candidate is a provider-specific financial account/trading-lifecycle adapter that preserves external provider semantics for balances, orders, fills/executions, corrections, fees, positions, liabilities/collateral and settlement, then maps those records into the existing IMMORTAL contracts. The branch audit did not identify a general broker/exchange account-event adapter with this scope in the reviewed repository paths. This bounded absence is not proof of external novelty; it requires a concrete provider profile and the separate external prior-art comparison.

No new EvidenceQualification schema, source registry, signature/currentness mechanism, economic kernel, authority system or production provider integration should be created by default.
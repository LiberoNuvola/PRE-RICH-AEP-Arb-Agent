# Cross-Branch Prior-Art Audit — IMMORTAL / Arb / Cormia

**Date:** 2026-11-03  
**Classification:** read-only branch inventory and targeted source audit; not a code audit, formal verification, legal novelty opinion or patent search  
**Purpose:** test whether the Arb Agent contribution assessment missed existing work outside IMMORTAL main, and identify what must be reused rather than duplicated.

## 1. Executive result

The previous Arb assessment was incomplete in one material respect: it inspected IMMORTAL main and selected Notion contracts, but did not systematically inventory and compare every repository branch.

This audit now inventories all visible branches in the three relevant repositories and recursively inspects their Git trees:

| Repository | Visible branches | Branch coverage |
|---|---:|---|
| `LiberoNuvola/Immortal-Protocol` | 27 | All 27 branch trees inventoried |
| `LiberoNuvola/Cormia` | 3 | All 3 branch trees inventoried |
| `LiberoNuvola/PRE-RICH-AEP-Arb-Agent` | 1 | Its only branch inventoried |
| **Total** | **31** | **31/31 branch trees inspected** |

The inventory is followed by targeted inspection of all identified evidence/oracle/admission/composition/authority/provider/EXP/provenance and prior-art files. This is **not** a line-by-line audit of every file in every repository. The branch file trees were complete (no truncated tree response); selected large branch comparisons were capped by GitHub's compare response and are not treated as exhaustive blob diffs.

**Most important correction:** the work branches contain substantial internal prior art that was absent from the earlier main-only assessment:
- IMMORTAL `work/immortal-green-closure` already contains a signed multi-oracle registry and currentness/revocation adapter prototype, venue/source matrices, and a PRE-RICH ProtectedCapital item-ledger/source-census prototype.
- IMMORTAL `work/b3-materios-provenance-evidence` already contains EXP-06 evidence-as-input, EXP-12 observer/authority split, EXP-03/04/07/08/09/10 boundaries and a generalized derivation contract.
- IMMORTAL `b1-hardening` already contains a synthetic multi-invariant economic-admission experiment and an Aegis comparison.
- Cormia `work/exp-generalization-crosswalk` already contains a dedicated 2026-11-03 prior-art composition review, while `work/project-normative-contract` adds PNC-bound mandate/runtime-authority work.

These findings do not establish that all prototypes are production-ready or normative. They do establish that Arb must not claim to originate these general concepts or implement parallel versions of them.

## 2. Exact branch inventory

### 2.1 IMMORTAL — 27 branches

| Group | Branches |
|---|---|
| Audit snapshots (11) | `audit/adapter-sale-conformance`; `audit/claim-b1-conformance`; `audit/kernel-invalid-class-fail-closed`; `audit/p2-8-b1-baseline-size-2026-09-21`; `audit/p2-8-b1-cardano-ledger-runner`; `audit/p2-8-b1-inline-haskell-uplc-diagnostic-2026-09-21`; `audit/p2-8-b1-inline-runtime-diagnostic-2026-09-21`; `audit/p2-8-b1-lucid-evolution-2026-09-21`; `audit/p2-8-b1-reference-budget-diagnostic-2026-09-21`; `audit/p2-8-b1-reference-scripts-2026-09-21`; `audit/p2-8-reveal-size-2026-09-21` |
| Hardening / history | `b1-hardening`; `backup/main-before-curated-promotion-2026-09-24` |
| Feature/fix work | `copilot/fix-real-preprod-reveal-job`; `feat/pre-rich-game-ui`; `fix/cardano-lab-yaci-info`; `fix/preprod-eev-approval-pin` |
| Canonical/merge/operations | `main`; `merge/workflow-b-closed-main`; `ops/b2-preprod-new-workflow`; `ops/b2-preprod-zero-input-dispatch`; `ops/expose-b2-preprod-dispatch` |
| Release/review | `release/issue-admission-boundary-squash`; `release/public-main-curated-2026-09-24`; `review/treasury-readonly-observer` |
| Active research/work | `work/b3-materios-provenance-evidence`; `work/immortal-green-closure` |

Important inspected references:
- `main`: `97b09a38742098f17a61eb07734c401aeedccc06`
- `work/immortal-green-closure`: `c8af808a5709948f1ace3ab838a9a010ac716037`
- `work/b3-materios-provenance-evidence`: `cf5b41f86bb69c5e277d52cfbb91d933e4148cdd`
- `b1-hardening`: `c561393e7eb842529aeaa272377e5afe0138d085`
- `release/public-main-curated-2026-09-24`: `04f2684244ddbf26946980ab764e4336fd2ab0a7`

### 2.2 Cormia — 3 branches

| Branch | HEAD | Comparison to `main` |
|---|---|---|
| `main` | `b699b20de01c4c81fc7636a555e2ce382ce52987` | Baseline |
| `work/exp-generalization-crosswalk` | `2186a0370456146b346b77564534405bb7d8d26f` | 148 commits ahead, 0 behind |
| `work/project-normative-contract` | `882629e447ed7a4c7d7f8116bf0b20201f48f231` | 20 commits ahead, 0 behind |

### 2.3 Arb — 1 branch

| Branch | HEAD | Finding |
|---|---|---|
| `Immortal-Protocol` | `0d8ad7de6f67bc73b45b3753dffa57eabb0a8d81` | Only branch in the dedicated Arb repository. S1 remains synthetic/read-only; no live provider/account adapter exists. |

## 3. Material already present on IMMORTAL work branches

### 3.1 Multi-oracle source/registry boundary — `work/immortal-green-closure`

Key files:
- `audit/pre-genesis-genesis/MULTI-ORACLE-SOURCE-REGISTRY-SPEC-v0.1-20261028.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-IMPLEMENTATION-GAP-20261028.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-EXTERNAL-CANDIDATE-BOUNDARY-AUDIT-20261029.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-REGISTRY-BOUNDARY-IMPLEMENTATION-20261029.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-REGISTRY-CURRENTNESS-CONTRACT-v0.1-20261029.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-REGISTRY-UPDATE-AUTHORITY-EVALUATION-20261029.md`
- `relayer/multiOracleObservation.js`
- `relayer/multiOracleRegistrySnapshot.js`
- `relayer/multiOracleRegistryBoundary.js`
- three corresponding focused test files.

What is implemented in the prototype:
- exact sourceId/feedId/baseAsset/quoteAsset/timestamp-unit/policy-version matching;
- raw integer price plus exponent/scale preservation;
- source timestamp kept distinct from receive/transport time;
- canonical payload hashing and digest verification;
- signed registry snapshot canonicalization, SHA-256 digest and Ed25519 signature verification against a caller-supplied key;
- monotonic registry sequence;
- exact active tuple lookup;
- injected currentness provider and exact binding of policy version, registry sequence/version/digest and revocation overlay;
- fail-closed handling of inactive/revoked/mismatched tuples, rollback and same-sequence equivocation.

Recorded CI evidence: [Multi-Oracle Registry Boundary Conformance run #40823847938](https://github.com/LiberoNuvola/Immortal-Protocol/actions/runs/40823847938), completed successfully on `51f372d12e8eaf671e6042bc9c70d3b8faa2e327`, with 3 test files and 53 tests passed. This is historical run evidence verified against the GitHub run record, not a fresh test run in this audit.

Critical limitations explicitly recorded by the branch:
- no real source/feed/key activated; test identities are fixtures;
- no production relayer/Plutus consumer is wired to the prototype;
- no source allowlist, quorum, aggregation, freshness threshold, fallback, or USD/USDM conversion policy has been approved;
- the trusted public key's authority has not been selected;
- the currentness provider's authority/current-state proof has not been selected or authenticated;
- process-local high-water marks reset on restart and are not durable anti-rollback protection;
- an Ed25519 signature proves a particular key signed a payload; it does not prove the payload is current or that the key is authorized.

The branch explicitly distinguishes source-data authenticity, feed metadata, IMMORTAL admission authority, registry currentness, and economic policy. A price feed catalog or HTTPS response is not an IMMORTAL source-admission registry.

**Arb implication:** do not write a second generic price-feed registry, signature envelope, or currentness/revocation state machine. Reuse or explicitly map to this existing prototype if a future Arb provider profile needs a market-price oracle. This branch is price/feed-specific; it does not implement general account/order/fill/position/fee/settlement streams.

### 3.2 Multi-venue observation — `work/immortal-green-closure`

Key documents:
- `docs/COORDINATION/USDM_MULTI_VENUE_SOURCE_MATRIX.md`
- `docs/COORDINATION/USDM_USD_MULTI_SOURCE_CROSS_REFERENCE.md`

These records already distinguish:
- on-chain venue observations from venue APIs and secondary indexers;
- DEX market data from centralized-exchange ADA/USD references;
- same-venue independent data channels from truly distinct venues;
- reserve-ratio spot prices from executable finite-size prices;
- discovery/candidate status from source qualification;
- source timestamps and pool age from freshness policy;
- observed price from canonical EEV/deployment authority.

The source matrix explicitly refuses to count Koios + Minswap API as two independent venues, or indexers as new markets. The USDM/USD cross-reference says its historical 4 DEX × 3 CEX product yields 12 derived combinations but only 4 DEX venues and 3 centralized exchange references, not 12 independent oracles. It labels the rates indicative only, not a peg/price-oracle/EEV/deployment qualification.

**Arb implication:** this is prior work for the exact problem of deduplicating venue/data-source lineages and keeping spot, executable price, independent venue and reference-source semantics distinct. Arb should not reinvent a multi-venue price collector. Its potential residual is broader account and trading-lifecycle observation, not another oracle quote aggregator.

### 3.3 ProtectedCapital item-ledger/source census — `work/immortal-green-closure`

Key files:
- `PRE-RICH/src/PreRichProtectedCapitalItemLedger.ts`
- `PRE-RICH/tests/conformance/PC-item-ledger-source-census.conformance.test.ts`
- `docs/audits/PRE-RICH-PROTECTED-CAPITAL-SOURCE-CENSUS-2026-11-02.md`
- `docs/audits/PRE-RICH-PROTECTED-CAPITAL-COMPONENT-PROVENANCE-2026-11-02.md`
- `docs/audits/PRE-RICH-C1-CAPACITY-EEV-PROTECTED-CAPITAL-RECONCILIATION-2026-11-02.md`

The pure item ledger:
- takes a caller-supplied PrizeValidator snapshot;
- retains ticket policy/name identity, exact UTxO reference, datum digest, status and economic values;
- maps ticket items to L1/L3/L4/L5 categories and reconciles item sums/counts to B1 aggregates;
- checks declared pagination/counts and unclassified items;
- explicitly marks source-completeness authority false, full ProtectedCapital qualification false and R7 L6 emptiness unproven.

The source-census audit says current Issue observation does not enumerate the full PrizeValidator UTxO population; it reconciles the caller-supplied array to B1 totals but cannot prove the array is complete. The component-provenance audit says SafetyCapital, ReserveProtection and MandatoryFutureCosts are represented and arithmetically included but lack field-specific authority, disjointness and exhaustive source proofs.

**Arb implication:** IMMORTAL already has an item-level ledger prototype for protocol-native ticket obligations. It is not a generic provider account/position ledger and does not verify external broker/exchange account completeness. Do not copy its ticket lifecycle into Arb; study its explicit source-completeness limitations and map only the transferable source-scope principles.

### 3.4 EXP-06 / EXP-12 / generalization boundaries — `work/b3-materios-provenance-evidence`

Key files:
- `docs/research/GENERALIZED-DERIVATION-CONTRACT-v1.md`
- `docs/research/GENERALIZATION-EVIDENCE-MATRIX-B3-v1.md`
- `docs/research/EXP-06-EVIDENCE-AS-INPUT-BOUNDARY-v1.md`
- `docs/research/EXP-12-OBSERVER-AUTHORITY-SPLIT-BOUNDARY-v1.md`
- `docs/research/EXP-03-ASSET-ELIGIBILITY-BOUNDARY-v1.md`
- `docs/research/EXP-04-COMPOSITION-OF-PROFILES-BOUNDARY-v1.md`
- `docs/research/EXP-07-REGIME-STRESS-CONFORMANCE-v1.md`
- `docs/research/EXP-08-NETTING-OFFSET-BOUNDARY-v1.md`
- `docs/research/EXP-09-OBLIGATION-TRANSFER-NOVATION-BOUNDARY-v1.md`
- `docs/research/EXP-10-EXPLICIT-RISK-BUDGET-BOUNDARY-v1.md`
- executable EXP-06 and EXP-12 structural harnesses under `audit/algorithmic-governability/`.

The generalized derivation contract defines a reusable non-normative boundary `B=(D,R,I,L,E,V,C,X)` and Explore → CandidateSet → Certify → ADMISSIBLE/REJECTED/UNVERIFIABLE → Adopt, with adoption only through an existing authorized path. It warns that reusing machinery does not imply reusing authority or semantics. The Generalization Evidence Matrix explicitly says the executable harnesses validate structural boundaries but do not compute real fee/reward/governance functions from authoritative inputs or certify them end-to-end.

EXP-06 already states Evidence-as-Input: source/observation/digest/evidence-version/verification-status, missing or invalid → UNVERIFIABLE, no self-certification and no evidence-to-rule-authority jump.
EXP-12 already states observation/evidence/authorization remain distinct, observer cannot redefine rules or grant itself authority, and authority is separately supplied.
EXP-03 separates asset eligibility from valuation/liquidity/ProtectedCapital.
EXP-08 preserves gross obligations; netting requires explicit authorization and underlying positions remain auditable.
EXP-09 keeps obligation identity and history across transfer/novation.
EXP-10 separates RiskBudget, RealizedExposure and ProtectedCapital.

**Arb implication:** none of these generic concepts may be claimed as new. Arb may test whether its provider-specific fields preserve them. The harnesses are structural conformance checks, not a new source of normative financial semantics.

### 3.5 b1-hardening — multi-invariant experiment, not production economics

Key files:
- `docs/research/AEGIS-IMMORTAL-ADAPTIVE-ADMISSION-EXPERIMENT-v1.md`
- `docs/research/AEGIS-V82M-INVARIANT-COVERAGE-INVENTORY.md`
- `docs/research/IMMORTAL-MULTI-INVARIANT-ADMISSION-PROTOTYPE-v1.md`
- `scripts/immortal-multi-invariant-admission.py`

These are offline synthetic comparison harnesses. They test the shape of multi-invariant admission (evidence qualification, reserve floor, ProtectedCapital/headroom, stress/cap constraints) and no-double-counting conventions. They do not execute Aegis's actual Aiken predicate, Cardano transactions, or a production IMMORTAL policy. Thresholds are illustrative/unapproved.

**Arb implication:** do not present a general multi-invariant decision interface as a novel Arb invention.

### 3.6 release/public-main-curated — Workflow C and B3 composition

Key files:
- `docs/workflow-c/B3-EVIDENCE-INTEGRATION.md`
- `docs/workflow-c/C0-C5-SOURCE-MAP.md`
- `docs/workflow-c/C6-RECONCILIATION.md`
- `docs/workflow-c/PA2-PA7-SOURCE-TRANSITION-ADVERSARIAL-AUDIT-2026-10-18.md`

These documents already describe B3 as an evidence-pattern source, with transport capture distinct from cryptographic verification, structural integrity distinct from claim truth, and a source hierarchy. They also record that Workflow C remains NOT CERTIFIED and that evidence completeness, independent verifier execution and non-vacuous Kc must not be inferred from structural checklists or synthetic fixtures.

**Arb implication:** reuse the provenance/transport/verifier separation. Do not treat a digest or a collected response as source truth.

### 3.7 Other IMMORTAL branches

- `b1-hardening`: synthetic Aegis/admission experiments; not production policy.
- `fix/preprod-eev-approval-pin`, `copilot/fix-real-preprod-reveal-job`, `feat/pre-rich-game-ui`, `fix/cardano-lab-yaci-info`, `review/treasury-readonly-observer`, `release/issue-admission-boundary-squash` and `merge/workflow-b-closed-main`: contain evolving PRE-RICH/EEV/Issue admission, observer and evidence-binding implementation; they are implementation-specific and do not introduce a general external financial account adapter.
- `ops/*`: primarily B2 Preprod workflow/dispatch variants.
- `audit/*` branches and `backup/main-before-curated-promotion-2026-09-24`: historical/specialized evidence or debugging snapshots. They contain prior EEV, Composition, oracle and adapter work; no new generic account/venue data layer was identified in the targeted path inventory.
- `release/public-main-curated-2026-09-24`: curated baseline with Workflow C/B3 integration documents; it is not a replacement for the current active work branch.

The branch-specific document authority matrix on `work/immortal-green-closure` is itself **non-normative**. It says the universal normative corpus remains `docs/00-normative/`, contracts/proof registers have their declared roles, audit and deployment evidence do not become normative authority merely because tests pass, and historical material is not current authority. Do not promote a work-branch research note to normative status by copying it into Arb.

## 4. Cormia prior art and role boundary

### 4.1 Cormia `work/exp-generalization-crosswalk`

Key documents:
- `docs/research/CORMIA_PRIOR_ART_COMPOSITION_REVIEW_2026-11-03.md`
- `docs/research/REUSE_AND_COMPOSITION_MATRIX.md`
- `docs/adr/0002-prior-art-composition.md`
- `docs/adr/0003-offchain-execution-onchain-authority.md`
- `docs/adr/0009-proposed-local-authority-bootstrap-consent-and-revocation-anchor.md`
- `docs/adr/0010-autonomous-project-delegation-and-runtime-authority.md`
- `docs/architecture/LOCAL_NUCLEUS_SOURCE_REVIEW_2026-11-02.md`

Cormia's prior-art review says not to build duplicate generic workflow engines, agent messaging, tool protocols, workspace/sandbox, provenance/receipt envelopes, transparency logs, compute marketplaces or payment custody if existing upstream systems can be composed. Its candidate residual is local-first autonomous project execution with a standing project mandate, resource lease, worker/verifier/evidence binding and accepted outcome.

ADR-0009/0010 are proposed security architecture, not activated host trust roots or production runtime authority. The source review also explicitly says the Local Agent/Workspace/Resource Manager/Evolution Manager/Mitsuro components are not yet a complete AEP Runtime and do not provide financial authority.

### 4.2 Cormia `work/project-normative-contract`

Adds PNC-bound project mandate v0.2, consent identity, schemas and authority runtime/tests. This strengthens operational project mandate and task authority. It does not create a financial Principal, establish ownership of exchange accounts or grant IMMORTAL Economic Gate authority.

**Arb implication:** Cormia's project/runtime authority and Arb/IMMORTAL financial authority must remain separate. Do not duplicate Cormia's mandate, task delegation or Runtime capability contracts inside Arb.

## 5. Branch-wide conclusion: what Arb may still own

The combined branch evidence narrows Arb more than the previous main-only review did.

| Candidate Arb responsibility | Existing internal coverage | Correct disposition |
|---|---|---|
| Generic evidence-as-input / provenance / observer-authority split | IMMORTAL EXP-06/EXP-12; B3 generalized derivation and Workflow C/B3 integration; Cormia prior-art composition | Reuse the contracts/principles; no new generic evidence authority system |
| Source/feed identity, signed source registry, currentness/revocation for price feeds | IMMORTAL work-green `multiOracleObservation`, `multiOracleRegistrySnapshot`, `multiOracleRegistryBoundary` | Do not duplicate; map/adapt only where an exact provider-specific gap is demonstrated |
| Multi-venue quote observation and source independence | IMMORTAL USDM multi-venue/source matrices | Do not rebuild as an Arb price aggregator |
| PRE-RICH item-level liability ledger | IMMORTAL ProtectedCapital item ledger and source census | PRE-specific, caller-supplied snapshot; not an arbitrary broker/account ledger. Reuse the explicit completeness and provenance limitations |
| Economic admission, EEV/ProtectedCapital/Ω/viability and composition | IMMORTAL R9, EconomicAdmissionWitness, GOV-27, Composition X1–X7 and canonical normative corpus | Consume existing interfaces; no parallel kernel/admission logic |
| Project mandate, task/worker authority and execution runtime | Cormia work branches | Consume Cormia operational mandate/runtime boundary; do not copy it or equate it with financial authority |
| Account/venue order, fill, fee, position, balance and settlement lifecycle observation | No equivalent general external broker/exchange account-event adapter identified in the targeted branch tree/file review | **Remaining candidate gap**, but provider-specific mapping and comparative validation are still required |

The remaining candidate is therefore **not** a generic evidence or oracle framework. It is a provider-neutral adapter for external broker/exchange account and trading-lifecycle data, with exact field mappings to existing IMMORTAL contracts. It must preserve the differences among balance, order, fill, fee, position, liability, settlement, asset eligibility and executable liquidity. It must not turn authentication into account ownership, collection completion into global liability completeness, or observations into economic admission.

The absence of an equivalent general account-lifecycle adapter is a result of the targeted repository branch/path review, not proof that no such system exists in external prior art. The separate external prior-art assessment remains required.

## 6. What is not established

This audit does **not** establish:
- that all code in all 31 branches was independently tested or line-by-line audited;
- that a work branch is normative merely because it is more advanced or contains more files;
- that the multi-oracle registry prototype has a production-authorized trust root or durable anti-rollback currentness provider;
- that the multi-venue spot observations are canonical oracle/EEV values;
- that the ProtectedCapital item ledger proves source completeness or full ProtectedCapital qualification;
- that EXP prototypes compute their candidate economic functions from authoritative inputs;
- that Cormia's proposed mandate/runtime architecture is fully deployed;
- that Arb's remaining account/venue adapter gap is novel or patentable;
- that S1 authorizes S2/S3.

## 7. Recommended next engineering gate for Arb

Before adding any new schema or provider adapter:

1. **Field-by-field overlap matrix:** compare every Arb ProviderProfile and CollectionCoverage field against IMMORTAL multiOracleObservation/registry, R9 EV1–EV7/V1–V9, EXP-06/12, the ProtectedCapital item-ledger constraints, and the existing EconomicAdmissionWitness.
2. **Keep price observations distinct:** if a provider is merely a market/price feed, route it through the existing multi-oracle/price-source work rather than an Arb-specific registry.
3. **Model account lifecycle separately:** only for actual broker/exchange account feeds, specify provider-specific orders, executions, corrections, fees, positions, balances, liabilities and settlement semantics. No universal status or event-ordering assumptions without provider evidence.
4. **Coverage claim boundary:** collection coverage must state the exact provider query, resource/account, families, pagination/cursor boundary, snapshot atomicity and exclusions. It does not prove that off-platform liabilities or undisclosed resources do not exist.
5. **Authority mapping:** provider authentication, account API-key possession, operational mandate and financial Principal ownership remain separate claims. Keep D0/D1 OPEN until their own evidence rules are met.
6. **Consumer mapping:** demonstrate how a complete source-specific evidence packet is passed to existing IMMORTAL admission without local synthesis of truthVerified, eevFresh, obligationsComplete, viability or Ω booleans.
7. **Reference baseline:** replay the same adversarial scenarios against the chosen provider's official contract and a suitable mature trading system (NautilusTrader/OANDA or a closer exact implementation) before claiming additional value.

No new universal EvidenceQualification type, source registry, economic kernel, authority system, oracle aggregator, or production adapter is authorized by this audit.

## 8. Non-regression

- No IMMORTAL or Cormia branch/file was modified in this audit.
- Arb remains S1 synthetic/read-only; no provider, API credential, account, wallet or live market-data connection was selected.
- No code, economic constants, on-chain semantics, source allowlist, quorum, aggregation rule or deployment was changed.
- D0, D1, provider-specific conformance, independent external review and all S2/S3 gates remain OPEN.

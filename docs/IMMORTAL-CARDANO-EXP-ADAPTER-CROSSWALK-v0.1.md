# IMMORTAL EXP ↔ Cardano Adapter Coverage Crosswalk v0.1

**Date:** 2026-11-03  
**Status:** read-only source audit and adapter-extension proposal; non-normative  
**Arb baseline before this document:** `7305f8027eb765d051403c5ac31a90dd2170fc6c`  
**IMMORTAL branch inspected:** `work/immortal-green-closure` at `2746652cb0fe327720fc66fe981eb355811bff9c`  
**Purpose:** define how the existing shared IMMORTAL Cardano Adapter should support applications consuming generalized EXP-01…EXP-12 without moving EXP semantics into the Adapter or duplicating the kernel in Arb.

## 1. Decision

The Cardano Adapter must expand its **capability and evidence-translation coverage** to serve the generalized IMMORTAL contracts. It must not become the implementation owner of EXP semantics.

The governing split is:

- **IMMORTAL:** generic economic meaning, typed obligations, exposure, ProtectedCapital, RawSurplus, Ω, viability, admission, composition, and the normative boundaries for evidence and authority.
- **Application/profile:** domain intent, application records, strategy and profile-specific mappings into IMMORTAL's generic contracts.
- **Cardano Adapter:** Cardano ledger representation, observation, source-specific transport, concrete feasibility, transaction construction/submission, and chain execution evidence.
- **Arb:** wallet companion, candidate/strategy, provider and protocol observation mapping, application order/fill/position lifecycle, and consumer-side replay/projection.
- **Cormia:** operational task/workspace delegation, agent Runtime and operational resource management; not financial Principal or trading authority.

A Cardano Adapter that only realizes PRE-RICH Issue/Reveal/Claim/Expire is not yet a general adapter for all EXP-consuming applications. Conversely, adding twelve EXP modules to the Adapter would be the wrong design: most EXP rules are semantic or authority rules and must remain in IMMORTAL or a declared profile.

## 2. Source-grounded current baseline

The inspected IMMORTAL branch already declares the Cardano Adapter as a shared translation, observation and realization layer between chain-neutral IMMORTAL semantics and Cardano. Its specification explicitly says another Cardano application should reuse the same Adapter rather than create a second application-specific Cardano Adapter.

Existing reusable source includes:

- `IMMORTAL/state/UniversalEconomicState.hs`;
- `IMMORTAL/kernel/UniversalEconomicKernel.hs`;
- `IMMORTAL/kernel/EconomicGate.hs`;
- `Adapter/CARDANO/observation/EconomicObservation.ts`;
- `Adapter/CARDANO/observation/ExecutableLiquidityObservation.ts`;
- `Adapter/CARDANO/observation/CardanoObservedTransitionEvidence.ts`;
- `Adapter/CARDANO/observation/CanonicalTransitionEvidence.ts`;
- `Adapter/CARDANO/observation/EconomicAdmissionTransitionBinding.ts`;
- `Adapter/CARDANO/runtime/EconomicAdmission.ts`;
- `Adapter/CARDANO/runtime/CardanoExecutionAdapter.ts`;
- `Adapter/CARDANO/serialization/CanonicalEconomicState.ts`.

The UniversalEconomicState aggregate has application-neutral liability, reserve, exposure and protected-capital fields. The UniversalEconomicKernel and EconomicGate are already separated from the PRE-RICH V3 state. C-COMP X1–X7 and the Ω completeness contract already provide the basis for shared-resource composition.

### Important implementation limit — the current economic witness is still PRE-RICH-shaped

At the inspected branch head, `Adapter/CARDANO/runtime/EconomicAdmission.ts` defines:

```ts
type EconomicActionClass = 'Issue' | 'Reveal' | 'Claim' | 'Expire'
```

Its `EconomicAdmissionWitness` also requires B1 PrizePool-specific inputs, including `authenticatedPoolInputReference`, `authenticatedPoolUsdmValue` and `requiredImmediateLiquidity`.

This is a concrete PRE-RICH integration contract, not a generic Arb trading contract. The current execution adapter's checks are valuable implementation precedent, but they cannot be reused by simply relabelling `Issue` as `Swap` or by passing exchange orders into a B1 PrizePool witness.

**Required disposition:** preserve the current PRE-RICH action/witness path and V3/Reveal/Issue semantics. IMMORTAL must define or expose the appropriately generalized consumer contract before a Cardano action family for Arb is implemented. This document does not choose its field names, schema, economic formulas or admission algorithm.

## 3. EXP-by-EXP Cardano coverage matrix

Status meanings:
- **Existing / reusable:** a relevant Cardano observation or realization mechanism is already present.
- **Partial:** some chain facts or transport are available, but the EXP's full cross-application semantics or evidence contract is not closed.
- **IMMORTAL-owned:** the governing rule is not an Adapter responsibility; the Adapter only supplies its required inputs or realizes its result.
- **Not established:** the inspected code must not be represented as implementing the capability end to end.

| EXP | What Cardano can provide / what the Adapter should map | Canonical semantic owner | Current assessment and genuine gap |
|---|---|---|---|
| **EXP-01 — typed obligations / seniority** | Preserve exact consumed/created UTxO refs, values, datum/redeemer, transaction provenance, payment/stake credentials, and the gross asset movements from which an application may derive economic effects. | IMMORTAL owns obligation identity, type, beneficiary, maturity, discharge and any seniority relation; application profile supplies its domain mapping. | **Partial.** UniversalEconomicState and kernel fields exist, and Cardano transaction facts are observable. The Adapter does not provide a complete generic obligation taxonomy or authoritative obligation classifier. Do not turn every UTxO movement into a liability or infer priority from transaction order. |
| **EXP-02 — term structure / horizon** | Preserve slot/block references, transaction validity interval, observation time, datum expiry fields where defined, and source-specific timestamps. Keep chain slot/time conversion context explicit. | IMMORTAL defines generic time/horizon semantics; profile defines order, funding, borrow, maturity and settlement horizons. | **Partial.** Cardano exposes temporal facts and validity windows, but these are not interchangeable with quote freshness, order lifetime, funding interval or economic-risk horizon. Generic term buckets/maturity semantics remain an IMMORTAL contract gap. |
| **EXP-03 — asset identity / eligibility / valuation / haircut** | Preserve exact native asset identity (policy ID + asset name), integer quantity, ADA/lovelace, address, datum, pool/script identity, reference-input/oracle facts, and observed depth/liquidity evidence. | IMMORTAL owns the typed stages and admissibility rules; a versioned asset/profile supplies eligibility, valuation sources and any authorized haircut policy. | **Partial.** Existing direct-USDM observation, exact asset identity checks, executable-liquidity binding and DEX-specific observers are reusable. Current USDM/Minswap/Muesli/Sundae/Saturn collectors are not a universal multi-asset valuation system. Ticker, metadata or displayed price cannot substitute for exact identity or qualified valuation. |
| **EXP-04 — composition of profiles** | Carry profile identity/version into transaction/evidence records; observe all declared Cardano resource sets and preserve exact UTxO/resource partitions and transaction dependencies. | IMMORTAL owns profile-composition rules, authoritative Ω, C-COMP X1–X7, joint gate, joint certificate and perimeter union. | **Partial.** C-COMP and Ω contracts exist. Cardano can supply ledger-specific resource/evidence facts, but adapter-level profile conflict handling and complete joint composition evidence are not established as a general consumer path. Separate local gates cannot simply be multiplied. |
| **EXP-05 — abstract contingent claims** | Preserve the concrete transaction/datum/redeemer and state transitions that are relevant to a profile-defined trigger; retain order/contract outputs and finality evidence where the profile uses Cardano contracts. | IMMORTAL owns generic contingent-claim establishment, crystallization and settlement semantics; PRE-RICH owns its ticket/Jackpot Claim semantics; Arb owns its candidate/order/position projection. | **Partial.** PRE-RICH Issue/Reveal/Claim/Expire and concrete datum transitions are implemented as an application example. This is not a universal Claim model. Do not import PRE-RICH claim predicates into Arb or infer an established claim from an order intent or DEX quote. |
| **EXP-06 — Evidence-as-Input** | Preserve raw transaction CBOR, UTxO refs, datum/redeemer, block/slot context, source response bytes, source and receipt timestamps, hashes, observer/profile versions, transaction status and the relation between pre-state, action, actual transaction and post-state. | IMMORTAL owns the evidence contracts, qualification and canonical admission; source/provider-specific verification remains separately qualified. | **Existing foundations, cross-application mapping partial.** EconomicObservation, ExecutableLiquidityObservation, CardanoObservedTransitionEvidence, CanonicalTransitionEvidence and transition binding already exist. Map them; do not create a second EvidenceQualification layer or source registry. A syntactically valid digest reference is not itself an independently recomputed integrity proof. |
| **EXP-07 — regime / hysteresis** | Supply chain/venue observations that a declared profile uses as regime inputs: congestion, liquidity, pool state, slot conditions, source health and other explicitly scoped raw facts. | IMMORTAL owns any generalized regime interface/invariants; numerical thresholds and application controller semantics belong to the relevant authorized profile. | **Observer support partial; generic controller not established.** The Adapter can transport facts; it must not derive a PRE-RICH controller for Arb. PRE-RICH KA/KC/KD and 8/4/4 behavior remain profile-specific and are not universal defaults. |
| **EXP-08 — netting / offset** | Preserve the gross UTxO, transaction, asset and obligation-related movements and their source identities; support replay of each leg without collapsing unlike units. | IMMORTAL owns whether an offset/netting relation is admissible and its party, scope, protected-claim, consent and atomicity conditions. | **Not established as Adapter semantics.** Cardano transaction batching or consuming multiple UTxOs is not economic netting. Preserve gross history; never discharge obligations by summing token balances or netting strategy legs in the Adapter. |
| **EXP-09 — transfer / novation** | Provide exact source/destination addresses, credentials, UTxOs, transaction inputs/outputs, datum changes and chain confirmation/finality evidence. | IMMORTAL/profile owns transferor/transferee/remaining-party authority, consent, effective time, obligation identity and continuity. | **Not established as Adapter semantics.** An on-chain transfer or wallet/account change is not automatically novation. Chain evidence can prove a ledger movement, not by itself the economic discharge or assumption of a contractual obligation. |
| **EXP-10 — explicit risk budget** | Supply wallet-controlled UTxOs, exact candidate transaction inputs, spendability/ring-fencing facts, collateral and profile-defined executable-liquidity observations. Report transaction fees and constraints separately. | IMMORTAL and an independently authorized profile/issuer own RiskBudget, metric/unit/horizon, reservation, consumption/release, realized exposure and ProtectedCapital. | **Partial.** ExecutableLiquidityObservation already checks exact input binding and spendable/ring-fenced UTxOs. This is not a RiskBudget issuer, concurrency-safe RiskReservation, or complete exposure engine. RiskBudget ≠ RealizedExposure ≠ ProtectedCapital ≠ wallet balance. |
| **EXP-11 — deterministic allocation / auction** | Supply deterministic transaction-build constraints, exact UTxO availability and transaction outcome evidence; preserve any source ordering or selection evidence relevant to reproducibility. | IMMORTAL/profile owns economically meaningful allocation policy, candidate set, admissibility, objective, tie-break and any risk/capital reservation; Arb owns strategy-side candidate generation. | **Not established as economic allocation.** UTxO coin selection and transaction input selection are chain realization details, not allocation of capital among competing economic candidates. Never let iteration order, mempool arrival or wallet coin selection silently become an economic priority rule. |
| **EXP-12 — observer / authority split** | Expose the wallet API, ledger observer and protocol observer as separate evidence sources; bind source, action, actual transaction and post-state. Keep signing inside wallet/CIP-30; report refusals and account/network changes as explicit outcomes. | Principal/authority issuer owns financial mandate; IMMORTAL owns economic admissibility; wallet owns key custody/signing; verifier and observer remain distinct. | **Architectural boundary present; generalized actuator authority incomplete.** CIP-30 and existing Adapter evidence provide useful separation. They do not create a standing Arb Mandate, financial Principal, execution credential or revocation lifecycle. |

## 4. Capability groups for a generalized Cardano consumer

The EXP crosswalk points to composable capabilities, not twelve new EXP modules in the Adapter. One ownership correction is important: **CIP-30 wallet connection is an Arb-side application integration port, not part of IMMORTAL's chain-neutral economic kernel or the core Cardano Adapter.** The shared Cardano Adapter may consume a typed wallet/signing port, but it should not depend directly on browser globals, wallet-vendor discovery, companion UI or local browser storage.

### C-A — Arb Wallet Companion port (application edge; not Adapter core)
- CIP-30 provider discovery and connection state;
- capability/extension negotiation;
- address, network and wallet-controlled UTxO reads;
- account/network change and disconnect invalidation;
- user-consented signature request and result handling when the interactive stage is authorized.

Arb owns this browser/session boundary. It supplies typed, session-bound wallet facts and, only at the authorized interactive stage, a wallet signing capability to the transaction path. The wallet connector does not own generic account/DeFi completeness.

### C-B — Cardano ledger observation and transaction evidence (shared Adapter boundary)
- address/credential and exact asset identity;
- UTxO, transaction, datum, redeemer and reference-input observations;
- slot/block and validity-interval context;
- raw CBOR and reproducible transaction/body references;
- StateBefore/StateAfter and exact consumed/created resource mapping;
- explicit source coverage, continuation, freshness and unknown-state evidence.

Reuse existing IMMORTAL observation/evidence types wherever their semantics fit.

### C-C — Protocol/venue observation profiles
- read-only pool/order/position observers for the declared Cardano protocol;
- exact protocol version, script/address/NFT identity and datum decoder version;
- per-family coverage and exclusions;
- wallet-to-position linkage evidence;
- source/API/indexer correlation and freshness evidence.

Existing Minswap V2, MuesliSwap, SundaeSwap V3 and SaturnSwap collectors are research/observer inputs with specific scope. They are not four universal trading adapters, and a secondary indexer of a venue is not an independent venue.

### C-D — Transaction realization
- build a transaction that implements an already admitted application/profile intent;
- bind actual spending inputs to observations/witnesses;
- preserve validity interval, datum/redeemer, output values, fees, reference inputs and script execution context;
- pass signing to the selected wallet for interactive operation;
- submit through the declared submission path and return exact transaction identity;
- observe and revalidate the resulting chain state.

The currently inspected CardanoExecutionAdapter is the starting point, but its current EconomicActionClass and witness are PRE-RICH-specific. Generalized action mapping needs an IMMORTAL-owned contract and a separate compatibility-safe implementation plan.

### C-E — Evidence export / consumer mapping
- map raw Cardano facts to existing IMMORTAL Evidence-as-Input and transition-evidence contracts;
- preserve source, observation, profile, adapter and version references;
- keep observed transition facts distinct from canonical transition evidence;
- make missing/contradictory/incomplete data explicit;
- never derive or sign an economic decision in the Adapter.

The Adapter should consume the C-A port through a narrow injected interface. CIP-30 provider names, browser events, UI consent prompts, browser storage and wallet preference handling stay outside the shared Adapter implementation. Where a backend observer is used, it is a distinct source from the wallet port and must retain its own provenance, scope and coverage.

## 5. Recommended dependency order

The IMMORTAL EXP completion audit records a dependency-aware order: EXP-06/12 shared evidence/authority surface; EXP-01/02/05 obligation, horizon and contingent-claim semantics; EXP-03 asset treatment; EXP-04 profile composition against C-COMP/Ω; EXP-08/09 cross-obligation operations; EXP-10/11 risk/allocation; then EXP-07 regime generalization and cross-application conformance.

The Cardano adapter work should follow those dependencies rather than creating a parallel priority order:

1. **Trace existing contracts:** map Gate 23/24/30, R9/EV1–EV7, GOV-27, C-COMP, Ω, UniversalEconomicState, UniversalEconomicKernel, EconomicGate and current Cardano observation/evidence types.
2. **Close the generic consumer contract in IMMORTAL:** identify the smallest real semantic/interface gaps; keep PRE-RICH V3/Reveal/Issue compatibility untouched.
3. **Add Cardano realization/observation coverage:** implement only the chain-specific evidence and transport obligations demanded by the accepted generic contracts.
4. **Prove a materially different profile:** PRE-RICH plus Arb must consume the same generic IMMORTAL state/kernel/gate without importing ticket classes, Jackpot, payout multiplier or 8/4/4 policy into the universal layer.
5. **Conformance and replay:** demonstrate exact source/evidence binding and both positive and fail-closed negative paths on a selected Cardano profile.

This work belongs primarily in IMMORTAL's Cardano Adapter workstream. This Arb document states consumer requirements; it does not authorize edits to IMMORTAL source or create a fork.

## 6. First Cardano profile candidate

The least duplicative first experiment is:

- connect an existing CIP-30 wallet in read-only mode;
- bind the exact wallet session/account and chain environment;
- obtain the wallet's controlled UTxOs through CIP-30;
- reuse one existing IMMORTAL Cardano DEX observer for the corresponding protocol/asset scope;
- distinguish wallet-held assets, contract-held pool/order UTxOs, LP/receipt assets and any derived positions;
- map all observed records through the existing EXP-03/06/10/12 constraints;
- output a coverage-aware portfolio/evidence report without an economic scalar, netting, order or transaction.

Minswap V2 is a candidate for the first protocol-observation spike because an exact-USDM, read-only pool observer and datum decoder already exist on the inspected IMMORTAL branch. This is a **candidate, not a selected provider/profile**. The current observer is mainnet-specific and pool-focused; it does not prove complete wallet/LP/order coverage or provide a trading API. Preprod wallet state and Mainnet DEX observations must never be combined into one evidence snapshot.

## 7. Required conformance cases

### Wallet/session
- wallet permission refused or disconnected;
- account changes between paginated reads;
- network changes between observation and signing request;
- network ID says testnet but exact environment binding is absent;
- wallet provider does not support a requested optional extension;
- selected wallet/provider disappears or its API version/capability set changes.

### Ledger and protocol observation
- identical ticker but different policy ID/asset name;
- incomplete UTxO/pagination or unobserved address/resource family;
- wallet UTxO and protocol pool UTxO confused as one holding;
- pool datum decoder/version mismatch;
- observer API and secondary indexer treated as independent sources despite same underlying venue;
- stale, conflicting, out-of-order or corrected source evidence;
- empty result incorrectly promoted to zero position or no exposure.

### EXP and authority
- valuation or liquidity missing while asset identity is present;
- incompatible asset units/horizons combined;
- candidate order exposure treated as established claim;
- gross obligations silently netted;
- owner/address change treated as novation;
- wallet balance treated as RiskBudget or ProtectedCapital;
- market/regime observation treated as authorization;
- observer, Arb Agent or adapter self-issues authority.

### Transaction boundary
- user declines a signature;
- actual transaction inputs differ from the declared executable-liquidity inputs;
- transaction is submitted but not observed/finalized;
- lost submission response becomes UNKNOWN/reconciliation-required, not success or blind retry;
- post-state does not match the intended canonical transition;
- bulk signing extension is treated as autonomous authority.

## 8. Non-regression and current decision

- Do not change IMMORTAL universal economic semantics or duplicate the Economic Gate.
- Do not modify PRE-RICH V3, Reveal, Issue, Claim/Expire semantics or the existing B1 PrizePool witness as part of Arb.
- Do not create a second Cardano Adapter, oracle registry, evidence qualification layer, signature/currentness mechanism or provenance system.
- Do not treat CIP-30 connection as Principal proof or a financial mandate.
- Do not add wallet seed/private-key/API secret material to Arb, CI, evidence records or repository.
- Do not activate order endpoints, signing, submission or autonomous execution in the S1 Arb repository.
- Do not mix Preprod wallet evidence with Mainnet protocol observations.

**Result:** the Cardano Adapter needs a generalized EXP consumer/realization surface, while Arb needs a wallet-companion and application projection. The shared economic semantics remain in IMMORTAL. The first engineering increment is a contract traceability and read-only wallet/ledger observation slice, not a trading actuator.

## Sources

### IMMORTAL source inspected
- [Cardano Adapter Specification](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/docs/ADAPTER-SPECIFICATION.md)
- [Cardano Adapter complete system specification](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/docs/CARDANO-ADAPTER-COMPLETE-SYSTEM-SPECIFICATION.md)
- [Economic Admission witness (current PRE-RICH action classes)](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/runtime/EconomicAdmission.ts)
- [Cardano Execution Adapter](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/runtime/CardanoExecutionAdapter.ts)
- [Executable Liquidity Observation](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/observation/ExecutableLiquidityObservation.ts)
- [Canonical Transition Evidence](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/observation/CanonicalTransitionEvidence.ts)
- [Universal Economic State](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/IMMORTAL/state/UniversalEconomicState.hs)
- [Universal Economic Kernel](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/IMMORTAL/kernel/UniversalEconomicKernel.hs)
- [Economic Gate](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/IMMORTAL/kernel/EconomicGate.hs)

### Coordination
- [IMMORTAL–Cormia EXP Generalization Crosswalk v1.0](https://app.notion.com/p/40cc4454d6d581b1b4cac0eb7468d1c2)
- [AEP–IMMORTAL Economic Jurisdiction & EXP Conformance](https://app.notion.com/p/40cc4454d6d5813491bcc68d88bef279)
- [IMMORTAL EXP register, Arb consumer boundary and generalization audit](https://app.notion.com/p/3e3c4454d6d58136a85cfcdbc0e287f3)

### Cardano standards
- [CIP-30](https://cips.cardano.org/cip/CIP-30)
- [CIP-103 — Bulk transaction signing](https://cips.cardano.org/cip/CIP-103)
- [CIP-104 — Account public key (Proposed)](https://cips.cardano.org/cip/CIP-104)
- [CIP-106 — Multisig wallet bridge (Proposed)](https://cips.cardano.org/cip/CIP-106)

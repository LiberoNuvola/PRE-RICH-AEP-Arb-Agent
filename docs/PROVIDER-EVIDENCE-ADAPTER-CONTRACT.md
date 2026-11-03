# Provider-Neutral Evidence Adapter Contract — S1 Design Candidate

**Status:** design contract only; not an implemented provider adapter, provider profile, or conformance result  
**Scope:** future read-only S1 evidence ingestion boundary  
**Revision:** 0.1 — 2026-11-03

## 1. Purpose and non-authority

This document defines the minimum evidence boundary a future provider adapter must expose before any provider-specific integration can be evaluated. It deliberately does not select a venue, define provider semantics, introduce credentials, or authorize an account connection.

The adapter is an evidence collector and normalizer. Its output may support replay and reconciliation, but it is not:
- proof that the observed account belongs to a financial Principal;
- proof that the provider returned every relevant account category;
- proof of event finality, settlement, or cryptographic integrity unless separately established;
- an order, position, PnL, liability, solvency, RiskBudget, ProtectedCapital, netting, or economic-admission engine;
- an authority, mandate, permission, or actuation grant.

A provider's API response, API credential, account label, or successful authentication is not by itself evidence of Principal ownership or financial authority.

## 2. Four independent evidence dimensions

Every future adapter result must keep these dimensions separate. A positive result in one dimension must not silently upgrade another.

| Dimension | Question | Permitted output |
| --- | --- | --- |
| Source assertion | What did the provider endpoint or stream actually return? | Raw evidence reference, unmodified provider identifiers where present, and an explicit source/profile mapping |
| Collection coverage | What exact scope was requested and demonstrably collected? | Per-data-family coverage status, request scope, pagination/continuation outcome, snapshot/cursor boundary, omissions |
| Verification | Which claims were independently checked, against which exact evidence? | Verifier identity/reference, method/version, checked artifact reference, result and time; otherwise NOT_VERIFIED |
| Authority and ownership | Who controls the account/resource, and under what mandate? | Separate D0/D1 evidence and decision; adapter output cannot set either gate to closed |

VALID on an observation means only that the record passed the relevant structural and stream-local checks. It must not be interpreted as complete account coverage, independent verification, settlement finality, or authority.

## 3. ProviderProfile — explicit and version-pinned

A provider-specific adapter must be governed by an explicit profile. The profile is data/configuration with a reviewable version, not behavior inferred from endpoint names or symbol conventions.

Minimum profile declarations:

1. **Identity:** profileRef, immutable profileVersion, provider/product identity, API or transport surface, and environment (for example, sandbox or production). Do not place secrets or private credentials in the profile.
2. **Documentation basis:** official documentation/specification references, retrieval or revision dates where available, and the exact endpoint/message versions relied upon. Unknown or undocumented behavior stays UNKNOWN.
3. **Scope model:** how an account/resource scope is selected and represented without exposing unnecessary secrets; which subaccounts, portfolios, wallets, margin modes or resource partitions are in or out of scope.
4. **Data-family map:** which source operation supplies each category and what the provider claims it represents.
5. **Identity model:** provider event/trade/order identifiers, their uniqueness scope, retention/reuse behavior, and the distinction between absent identifiers and locally assigned envelope IDs.
6. **Ordering model:** cursor/sequence kind, scope, monotonicity guarantee (if any), reset behavior, gap detection, duplicate delivery and replay rules. A timestamp is not a sequence unless the source contract says so.
7. **Correction model:** cancel/correct/replace semantics, target identity, active-head rules and whether historical corrections can arrive after later events.
8. **Snapshot/recovery model:** snapshot boundaries, cursor handoff, pagination completion, retention limits, backfill behavior, and what recovery cannot reconstruct.
9. **Time model:** source timestamp meaning, precision, timezone, clock provenance and any known skew/latency limitations. Receipt time remains separately recorded.
10. **Execution model:** field-level semantics for order, trade/fill, quantity, price, fee, fee asset, liquidity role, execution identity and settlement state. A field not guaranteed by the profile remains unknown/null, not guessed.
11. **Known exclusions:** missing endpoints, inaccessible categories, provider-side filters, retention gaps, unsupported account modes and any fields whose semantics remain unverified.

The profile must not define global causal ordering across unrelated streams. Each stream keeps its own cursor unless a separately approved Composition Contract X1–X7 witness supplies the missing semantics.

## 4. EvidenceBundle and collection records

The adapter should emit a bundle of source-scoped records. It must preserve the existing S1 ObservationRecord distinction between envelope metadata and provider payload.

### 4.1 Bundle identity and scope

The bundle must identify:
- the exact profileRef and profileVersion;
- provider and environment;
- collection start/end times, plus receipt times;
- a non-secret scope reference and the declared subscopes included;
- the requested data families and the operations used to obtain them;
- a stable reference to the collection run and its raw evidence set.

A local bundle or envelope ID is only a local record identity. It must never be presented as a provider-issued event ID.

### 4.2 Per-data-family coverage

Coverage must be recorded independently for each relevant family, not collapsed into one accountComplete boolean. The profile should enumerate, where applicable:

- balances and collateral;
- positions and inventory;
- open orders and order history;
- fills/trades/executions;
- fees, fee assets and rebates;
- funding, interest, borrow and other financing obligations;
- transfers, deposits and withdrawals;
- settlement and delivery obligations;
- margin mode, leverage and liquidation-related state;
- provider-specific liabilities or locked resources.

Use the following coverage vocabulary:

| Status | Meaning |
| --- | --- |
| COMPLETE_NONEMPTY | The defined query scope completed and returned one or more records |
| COMPLETE_EMPTY | The defined query scope completed and returned no records; this is not a statement about scopes outside the query |
| PARTIAL | Some evidence arrived, but the profile's completion conditions were not met |
| UNAVAILABLE | The source operation could not be obtained or interpreted |
| NOT_REQUESTED | The family was not queried |
| NOT_APPLICABLE_PROFILE | The profile explicitly documents why the family cannot apply to this provider/resource type |
| UNKNOWN | The source or collection evidence does not support a conclusion |
| CONFLICTED | Evidence sources or repeated observations disagree under the profile's identity rules |

COMPLETE_* is permitted only when the profile's own requirements are met: all required requests completed, pagination/continuation is exhausted, the declared scope is known, and no unresolved gap, truncation, retention limit or conflicting response invalidates the conclusion. An HTTP success or empty response alone is insufficient.

COMPLETE_EMPTY means empty only within the exact, profile-defined query scope and snapshot boundary. Missing, unrequested, filtered, inaccessible, expired or unpaginated data must never be converted into zero, none, or a complete-empty claim.

### 4.3 Snapshot and pagination boundaries

The adapter must record the provider's snapshot token/revision or cursor when supplied, page/continuation state, termination condition, and any server-side limit or truncation indicator.

Different data families collected at different times are not an atomic account snapshot unless the provider explicitly guarantees a shared snapshot boundary and the adapter preserves evidence of that guarantee. Do not combine balances from one instant with positions or orders from another and label the result a coherent account state.

If the provider has no atomic snapshot or recoverable cursor contract, say so. Do not manufacture a snapshot ID or claim gap-free recovery.

### 4.4 Stream and event lineage

For each stream, preserve:
- exact provider/source identity and stream scope;
- provider sourceEventId only when actually supplied;
- source sequence/cursor exactly as represented, plus the profile-declared sequence kind;
- source-observed time and local receipt time separately;
- raw evidence reference and raw digest reference;
- correction/cancellation/replacement links only when source semantics support them.

Do not infer monotonicity from numeric-looking strings, global order from timestamps, or event identity from a symbol and timestamp. Missing provider event IDs remain null. A local ID may be added for storage, but must be labelled as local and cannot stand in for source identity.

A gap, reset, sequence ambiguity, unknown correction target, or retention boundary must be surfaced as a stream-local limitation and must not be silently repaired by sorting or interpolation.

### 4.5 Orders, fills and obligations

Preserve gross source facts and their units separately. At minimum, where the provider exposes them, keep distinct:
- provider order ID and client order ID;
- provider execution/trade/fill ID;
- instrument identity and explicit base/quote asset identity;
- gross quantity and its unit;
- price and price unit;
- fee amount and fee asset;
- liquidity role and execution type;
- source execution time and receipt time;
- correction/cancel/reversal identity;
- settlement/delivery status and its evidence.

A fill event is not automatically a settled position change. A cancel request is not a cancel confirmation. A transfer record is not proof of settled ownership at the destination. The adapter must not net opposing records, infer novation, rewrite obligation ownership, convert assets, or compute a position/PnL from incomplete semantics.

If a provider does not expose a field or its meaning is uncertain, retain the omission/unknown state. Do not synthesize price, fee, fee asset, finality, or settlement semantics.

## 5. Evidence integrity and independent verification

The current S1 reducer compares rawDigestRef values but does not retrieve raw bytes or recompute a cryptographic digest. This contract does not upgrade that behavior.

For every artifact, keep separate:
- rawEvidenceRef: where the original evidence can be retrieved;
- rawDigestRef: the digest claim/reference supplied or recorded;
- normalizedDigestRef: a reference for the normalized representation;
- canonicalizationVersion: the exact normalization/canonicalization rule;
- verificationStatus: NOT_VERIFIED, VERIFIED_BY_SEPARATE_VERIFIER, UNVERIFIABLE, or REJECTED;
- verificationRef: a link to the independent verification record, if one exists.

A future cryptographic verification implementation must separately define byte retrieval, serialization/canonicalization, algorithm, digest recomputation, signature/trust-root validation where relevant, failure handling and reproducibility. Equality of two digest-reference strings is not cryptographic verification.

The collector and verifier must be represented as separate roles. The verifier must identify the exact artifact/evidence set checked and the method/version used. A verifier result is scoped evidence, not account ownership or transaction authority.

## 6. Principal binding and account isolation — separate gates

The adapter may record a provider-declared account/resource reference and a separate evidence reference offered for ownership/control review. It cannot set D0 or D1 to CLOSED.

- **D0 — Principal / financial authority root:** established through a separate authority process and evidence, not by API authentication, a wallet connection, an account nickname or an adapter assertion.
- **D1 — Solo account/resource isolation:** established through evidence that the exact resource scope is isolated as required; a single API key or a user-selected account label is not sufficient by itself.

No credentials, keys, signing material, secrets, account tokens or private account identifiers belong in S1 fixtures, schemas, logs or this contract. S1 remains synthetic-only and disconnected from providers.

## 7. IMMORTAL EXP crosswalk

| Boundary | Adapter requirement |
| --- | --- |
| EXP-03 — asset identity | Use explicit instrument/asset mappings; keep eligibility, valuation, haircut, liquidity and ProtectedCapital separate |
| EXP-07 — regime / hysteresis | Preserve source observations only; do not infer controller regime, create thresholds or gain controller authority |
| EXP-08 — netting | Preserve gross orders, fills and obligations; no implicit netting or scalar aggregation |
| EXP-09 — novation / transfer | Preserve obligation identity and history; ownership-field changes do not prove transfer or novation |
| EXP-10 — risk budget | Keep RiskBudget, RealizedExposure and ProtectedCapital distinct; no default budget, unit coercion or economic admission |
| EXP-12 — observer / authority | Collector and verifier are distinct; their evidence grants no mandate, Principal authority or permission to act |

The adapter consumes no IMMORTAL economic rule and does not alter the normative kernel. Any later economic interpretation remains downstream and must use the approved IMMORTAL interfaces and evidence requirements.

## 8. Fail-closed acceptance criteria for a future provider profile

A provider profile is not ready for implementation review until all applicable items below have evidence:

- [ ] Official source documentation and endpoint/message versions pinned.
- [ ] Provider/environment and exact resource scope explicitly identified.
- [ ] Data-family coverage matrix complete, including unsupported and unrequested families.
- [ ] Pagination, rate-limit, retention, snapshot and recovery semantics documented.
- [ ] Per-stream event identity, cursor, ordering, duplicate and correction semantics documented.
- [ ] Order/fill/fee/asset/settlement fields mapped with units and source guarantees.
- [ ] Raw evidence retention, canonicalization and independent verification method specified.
- [ ] Partial, stale, unavailable, gapped and conflicted outcomes represented without zero/absence inference.
- [ ] Account-completeness claims bounded to the documented scope.
- [ ] D0 and D1 evidence reviewed separately by the appropriate authority.
- [ ] Independent technical review completed for the provider profile and adapter.
- [ ] Synthetic fixtures cover normal, empty, partial, gapped, duplicate, correction, replay, truncation and conflict cases.

Passing this checklist would establish only that a provider-specific, read-only evidence adapter is ready for its own review. It would not authorize S2 or S3. Any S2/S3 proposal still requires its separate environment, isolation, authority, economic admission, risk, recovery and safety gates.

## 9. Current decision

This is a provider-neutral design candidate. No provider has been selected, no provider documentation has been mapped, no account has been connected, no adapter has been implemented, and no provider conformance is claimed. S1 remains synthetic-only. D0, D1 and independent external review remain OPEN. S2 paper/test and S3 live execution remain unauthorized.

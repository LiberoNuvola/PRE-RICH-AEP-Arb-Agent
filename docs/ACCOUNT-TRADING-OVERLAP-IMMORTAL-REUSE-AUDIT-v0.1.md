# Arb Account/Trading Overlap & IMMORTAL Reuse Audit v0.1

**Status:** repository-level design audit; non-normative  
**Date:** 2026-11-04  
**Arb branch:** `Immortal-Protocol`  
**IMMORTAL prior-art branch reviewed:** `work/immortal-green-closure`  
**Scope:** field-by-field overlap between Arb ProviderProfile / CollectionCoverage / ObservationRecord / OpenExposure and existing IMMORTAL multi-venue, ProtectedCapital item-ledger and EconomicAdmission boundaries.

## 1. Executive finding

Arb must not build a second evidence framework, price-source registry, economic item ledger or admission witness.

The repository comparison establishes three different existing assets:

1. **IMMORTAL multi-venue / multi-oracle work** already handles source lineage, exact asset identity, venue-vs-indexer independence, source freshness and raw on-chain observation for price/reference evidence. It is not an external broker account lifecycle collector.
2. **IMMORTAL PRE-RICH ProtectedCapital item ledger** already demonstrates item identity, source/snapshot binding, lifecycle classification, explicit unclassified blockers and reconciliation of item totals to protocol aggregates. It is PRE-RICH ticket-specific and does not certify source completeness or full ProtectedCapital.
3. **IMMORTAL EconomicAdmissionWitness** is a downstream, action-specific Cardano admission boundary. It binds a decision to an observation, V3 pre/post state, action fingerprint, EEV and authenticated Pool/liquidity inputs. It is not a generic provider observation or broker account contract.

Arb's current distinct candidate remains narrower: a provider-specific, read-only external account/trading lifecycle adapter that faithfully collects and reconciles balances, orders, fills/corrections, fees, positions, liabilities, collateral, transfers and settlement, preserving the source's own event and coverage semantics. This contribution is not yet implemented end-to-end, provider-conformant or proven novel.

## 2. Reuse and non-reuse matrix

| Existing artifact | Reusable pattern | Must not be copied into Arb |
|---|---|---|
| IMMORTAL USDM multi-venue source matrix | Exact asset identity; source/venue/indexer lineage; raw evidence and observation time; explicit coverage gaps; no false independence; absence of data is not zero | USDM price discovery, oracle selection, venue quote aggregation, peg assumptions, EEV policy, Cardano-specific pool datum decoders |
| IMMORTAL multi-oracle registry/currentness prototype | Versioned source/feed/policy binding; canonical digest; independently governed currentness/revocation boundary; rollback/equivocation tests | A parallel Arb source registry, signer/trust-root authority, price-feed currentness service or oracle quorum |
| PRE-RICH ProtectedCapital item ledger | Stable item identity; exact source reference; source snapshot and manifest digest; item-level classification; duplicate detection; explicit L6/unclassified blockers; item-to-aggregate reconciliation | PRE-RICH ticket states, R7 L1–L6, canonical ticket ladder, 500× payout multiplier, USDM subunit conversion, PrizeDatum/PrizePool rules or ProtectedCapital policy |
| IMMORTAL R7 / PA1–PA7 accounting partition | Completeness, single classification, disjointness, compatible asset/unit/time/horizon perimeter, lifecycle delta closure, fail-closed admission | Treating a generic provider collection report or OpenExposure list as an R7/PA1–PA7 certificate |
| IMMORTAL R9 / EV1–EV7 EEV contract | Source specification, verification predicate, deterministic/versioned derivation, freshness, conservative direction, failure-path and Ω/perimeter linkage | Treating account equity, balances, positions, marks or venue spot prices as EEV without a qualified profile/valuation adapter |
| IMMORTAL EconomicAdmissionWitness | Explicit downstream decision/observation references, state/action binding, EEV and authenticated liquidity/input binding | A generic Arb witness, an Arb economic gate, or any authority to manufacture IMMORTAL admission |

## 3. Arb field-by-field audit

### 3.1 ProviderProfile

| Arb field/group | What it establishes | IMMORTAL relationship | Gap / limitation |
|---|---|---|---|
| `provider.providerRef`, `productRef`, `environment` | Declared provider/product/environment identity | Source identity context for EXP-06 | Does not prove account ownership, Principal binding or D0/D1 |
| `protocol.family`, `protocol.version`, `documentationBasis` | Transport/protocol and pinned documentation basis | Supports source specification and verification predicate (EV1) | No proof that undocumented behavior is stable or that a source operation is complete |
| `resourceScope.scopeModel`, `dimensions`, `partitionSemantics` | Declared account/subaccount/portfolio/wallet/resource scope | Relevant to EXP-12 and composition perimeter | A provider account label or scope declaration is not legal ownership or exclusive-resource proof |
| `dataFamilies`, `sourceOperationRef`, `completenessRuleRef` | Which family is supported and which source operation/rule is claimed | Provider-level source/coverage declaration | Does not prove the operation returns every economically material record |
| `eventIdentity`, `streamModel`, `correctionModel` | Provider event identity, ordering, stream and correction semantics | Reusable lineage inputs for EXP-06/09 | Must be pinned to actual provider docs; no universal cross-stream causal order |
| `snapshotModel`, `timeModel` | Snapshot/cursor/time semantics | Supports freshness, horizon and snapshot-scope review | A per-family query boundary is not an atomic account-wide snapshot |
| `executionModel.fieldMappings` | A subset of order/fill/execution field mapping | Existing order/fill reducer path | No equivalent typed mappings yet for balances, positions, collateral, liabilities, financing, transfers and settlement |

### 3.2 CollectionCoverageReport

| Arb field/group | Reusable evidence claim | IMMORTAL boundary | Non-claim |
|---|---|---|---|
| Family + requested scope | Exactly which family/query/resource scope was requested | EXP-06 source perimeter | Not whole-account completeness |
| Status + query completion | COMPLETE_NONEMPTY / COMPLETE_EMPTY / PARTIAL / UNAVAILABLE / NOT_REQUESTED / UNKNOWN / CONFLICTED | Fail-closed source coverage | COMPLETE_EMPTY is scoped to the exact operation and its documented semantics |
| Pagination + truncation + record count | Whether a documented page/cursor boundary was exhausted | Similar in spirit to the PRE-RICH source census checks | Does not prove provider honesty, server-side enumeration completeness or legal liability completeness |
| Boundary kind/reference/atomicity | Provider snapshot, cursor end, query completion, none/unknown; atomicity scope | Snapshot and temporal perimeter | PER_FAMILY or NON_ATOMIC must not be promoted to a global coherent snapshot |
| Retention + omissions + reason codes | Known historical gaps and unsupported scope | EXP-02/06 and replay reconstruction | Missing/expired history is not zero and cannot be silently reconstructed |

### 3.3 ObservationRecord v0.2

| Arb field/group | Current meaning | IMMORTAL reuse | Limitation |
|---|---|---|---|
| source identity + profile/version | Source operation interpreted under a pinned profile | EXP-06 sourceReference binding | Provider/product label alone is not source authority |
| eventId / provider sourceEventId / stream / sequence | Arb envelope identity plus provider identity where supplied | observationReference and source lineage | These identities must not be collapsed; provider event ID can be absent |
| source/received/effective timestamps | Distinct temporal observations | EXP-02 and EV3-style freshness evidence | Timestamp does not establish finality or same-snapshot consistency |
| correction/supersession relations | Explicit correction lineage | EXP-09 history continuity | Provider-specific correction guarantees remain to be documented |
| rawEvidenceRef / rawDigestRef / evidenceVersion | Reference to raw evidence, digest reference and source evidence format version | EXP-06 tuple | A digest reference string is not raw-byte retrieval, digest recomputation, signature verification or signer trust |
| verificationStatus / verificationRef | Claimed verification outcome and reference | EXP-06 independent verifier boundary | No concrete verifier is wired; positive verification must not be inferred from structural quality |

### 3.4 OpenExposureSet v0.2

Current per-item fields are:

`recordRef, category, assetRef, unitRef, scopeRef, horizonRef, status, evidenceRef`, with optional `grossQuantity`, `obligationRef` and `principalRef`.

The classifier preserves gross entries, rejects malformed/duplicate record references, keeps multi-item composition unresolved, never sums quantities or values, never nets/novates/transfers ownership, and returns INCOMPLETE for an empty item list.

This is useful as a **gross exposure projection**, but it is not a complete account/trading record model.

Concrete gaps:

- `evidenceRef` is not yet normatively bound to the exact `ObservationRecord.eventId` and its EXP-06 tuple. Do not assume it means a raw digest, provider event ID or verifier reference.
- `category` and `status` are free strings; no canonical provider-independent taxonomy is defined.
- `grossQuantity` is an opaque decimal quantity. It has no typed amount/price pair, direction/side, contract multiplier, fee asset, counterparty, payer/beneficiary or settlement amount semantics.
- The item does not carry a dedicated source/provider event identity, order/fill/transfer/settlement lifecycle link, correction relation or effective timestamp; those facts must remain in ObservationRecord/event streams and be linked explicitly if/when a consumer requires it.
- It does not model balances as a full account snapshot. Balances are asset observations and possible EEV/liquidity inputs, not automatically open exposure items.
- It does not decide whether a position is an obligation, whether a liability is crystallized, whether collateral is encumbered, or whether settlement discharges a claim.

**Decision:** do not expand OpenExposure into a universal account ledger. Preserve source-family records separately. Use OpenExposure only where a profile has a justified gross exposure projection, with an explicit evidence-to-item binding contract still to be specified.

## 4. IMMORTAL multi-venue / oracle reuse boundary

The reviewed `USDM_MULTI_VENUE_SOURCE_MATRIX.md` already applies these controls:

- exact policy ID + asset-name identity rather than ticker/display-name matching;
- immutable venue/pool identity anchored to deployed script/config/NFT;
- raw UTxO, datum CBOR/hash, Value, tx/block/slot and observation-time preservation;
- separation of market venue, indexer, API channel, aggregator and oracle-reference roles;
- source-lineage deduplication so multiple APIs/indexers observing one venue are not counted as independent venues;
- explicit stale, partial, unavailable and unknown classifications; missing rows do not prove absent pools or zero liquidity.

These are reusable evidence/lineage principles for Arb. The matrix is specifically a Cardano USDM market-source and price-reference workstream. It does not enumerate broker account balances, open orders, fills, fees, borrow, positions, funding, transfers or settlement. Arb must not add another market-price or oracle collector to solve the account lifecycle problem.

## 5. IMMORTAL ProtectedCapital item-ledger reuse boundary

The reviewed `PreRichProtectedCapitalItemLedger.ts` demonstrates a more detailed item model:

- stable ticket identity from ticket policy/name, separate from the UTxO carrying its datum;
- exact UTxO reference and datum digest per item;
- network, provider, observed slot/time, snapshot reference, source reference and source manifest digest;
- per-item lifecycle classification into PRE-RICH R7 cells;
- duplicate item/UTxO rejection and unclassified-item blockers;
- item totals reconciled to B1 Pool aggregates;
- explicit distinction between current live records and historical settled/expired records requiring transaction replay.

However, the module explicitly consumes a caller-supplied PrizeValidator snapshot and states that its source-completeness assertions are not independently authenticated. Its output hard-codes `sourceCompletenessAuthorityVerified=false`, `fullProtectedCapitalQualified=false`, and `r7L6EmptinessProven=false`. The subsequent PA1–PA7 audit keeps PA2 and PA6 OPEN and other elements partial.

Reusable pattern: identity + source + snapshot + item classification + aggregate reconciliation + explicit blockers.

Not reusable: its PRE-RICH-specific lifecycle, R7 cells, payout ladder, 500× multiplier, unit conversion and economic classification.

The key lesson for Arb is not “copy this ledger”; it is “do not confuse internally reconciled items with an exhaustive, authoritative account or liability population.”

## 6. R9 / EV1–EV7 and EconomicAdmissionWitness boundary

The normative R9 contract closes the abstract EEV contract V1–V9, but concrete valuation correctness remains adapter conformance. EV1–EV7 require, at minimum:

- EV1 source specification and verification predicate;
- EV2 deterministic, versioned derivation from inputs to EEV;
- EV3 justified freshness window and staleness test;
- EV4 conservative-direction argument;
- EV5 failure-path evidence for unavailable, stale, equivocating or out-of-range inputs;
- EV6 Ω valuation-shock/oracle-failure entries linked to the perimeter;
- EV7 accounting-partition boundary linkage.

An account balance, exchange equity figure, position mark, venue spot price or API response is not EEV by naming. A concrete profile must establish asset identity/eligibility, units, valuation method, liquidity/executability, source trust, freshness, conservative failure behavior and the relevant perimeter before it can feed an IMMORTAL EEV consumer.

The current `EconomicAdmissionWitness` is a downstream Cardano transition witness. It carries gate/decision/authoritative observation references, V3 state hash, action class/fingerprint, candidate post-state hash, EEV, executable-liquidity observation, authenticated B1 Pool input reference/value and required immediate liquidity. It is action-specific and validates binding to transaction input references and authenticated Pool/liquidity evidence. Arb must not synthesize this witness or interpret its own provider profile as an economic gate.

## 7. Field-level residual contribution of Arb

The following work remains a credible integration candidate, not a novelty claim:

1. Map each provider's official operations and event semantics for balances, orders, order history, fills/executions, corrections/busts, fees/rebates, positions, collateral/margin, borrow/funding/interest, transfers and settlement.
2. Preserve source-native IDs, units, precision, account/resource scope, timestamps, cursor/sequence, correction lineage, raw evidence and per-family coverage.
3. Reconcile cross-family duplicates and dependencies without asserting atomicity where the provider does not provide it.
4. Derive the existing order/fill lifecycle projection and, where justified, typed gross OpenExposure items without netting, valuation or admission.
5. Bind every derived item to the exact underlying observation(s) and evidence tuple, retaining one-to-many/many-to-one provenance where applicable.
6. Export source-scoped facts to an existing IMMORTAL profile/consumer only after its consumer contract is identified. Otherwise retain them as observations with no economic projection.

This is a broker/exchange adapter and reconciliation problem, not a second economic kernel.

## 8. Decisions and blockers

**Accepted for this design review**

- No duplicate evidence qualification, oracle registry, currentness authority, ProtectedCapital ledger, netting engine, RiskBudget or economic gate in Arb.
- OpenExposure remains gross-only and optional; it is not the universal container for all account data.
- The PRE-RICH item ledger is a provenance/completeness design reference only, not a general broker ledger.
- Multi-venue source lineage is reusable; market price aggregation is not Arb's residual scope.
- EEV and admission remain IMMORTAL-owned.

**Still OPEN**

- Provider selection and official documentation mapping.
- Typed family-level field mapping for account/trading records.
- Exact binding from OpenExposure item `evidenceRef` to ObservationRecord observation/evidence identity.
- Cross-family duplicate/reconciliation rules for balance ↔ position ↔ liability ↔ fee ↔ settlement.
- Provider snapshot atomicity, cursor retention and correction guarantees.
- Independent verifier and raw-byte digest recomputation.
- D0/D1, independent review and any S2/S3 authorization.

## 9. Next evidence gate

Do not implement a provider client yet. Select one provider only after its official documentation is available, then create a source-operation matrix with one row per family and field:

`provider operation → source field → provider guarantee → Arb ObservationRecord → family projection → possible IMMORTAL consumer → exclusions / unknowns`.

Mark each field `DOCUMENTED_GUARANTEE`, `DOCUMENTED_CONDITIONAL`, `OBSERVED_ONLY`, `UNKNOWN` or `NOT_EXPOSED`. Test partial fills, cancel/replace, fill bust, fee correction, accrual, collateral lock, transfer reversal, partial settlement, cursor gaps, retention truncation and cross-family snapshot skew.

Keep S1 synthetic/read-only. D0/D1 and independent review remain OPEN; S2/S3 remain unauthorized.

## 10. Sources inspected

### Arb — `Immortal-Protocol`

- `schemas/provider-profile.schema.json`
- `schemas/collection-coverage.schema.json`
- `schemas/observation-record.schema.json`
- `schemas/open-exposure-set.schema.json`
- `src/reducer.js`
- `examples/open-exposure-set.synthetic.json`
- `docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md`
- `docs/S1-READINESS.md`

### IMMORTAL — `work/immortal-green-closure`

- `docs/COORDINATION/USDM_MULTI_VENUE_SOURCE_MATRIX.md`
- `docs/COORDINATION/USDM_USD_MULTI_SOURCE_CROSS_REFERENCE.md`
- `audit/pre-genesis-genesis/MULTI-ORACLE-REGISTRY-CURRENTNESS-CONTRACT-v0.1-20261029.md`
- `PRE-RICH/src/PreRichProtectedCapitalItemLedger.ts`
- `docs/audits/PRE-RICH-PROTECTED-CAPITAL-SOURCE-CENSUS-2026-11-02.md`
- `docs/audits/PRE-RICH-PROTECTED-CAPITAL-COMPONENT-PROVENANCE-2026-11-02.md`
- `docs/audits/PRE-RICH-C1-CAPACITY-EEV-PROTECTED-CAPITAL-RECONCILIATION-2026-11-02.md`
- `Adapter/CARDANO/runtime/EconomicAdmission.ts`
- `Adapter/CARDANO/observation/EconomicAdmissionTransitionBinding.ts`
- `docs/02-certification/EEV_ORACLE_AND_VALUATION_CONTRACT.md`

**Non-regression:** documentation only. No application code, schemas, provider profile, economic rule, EEV valuation, ProtectedCapital classification, RiskBudget, authority, signature, verifier, economic admission or actuator was changed.

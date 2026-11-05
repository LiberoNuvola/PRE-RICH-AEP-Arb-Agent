# Provider Observation Reconciliation Contract v0.1

**Status:** S1 design contract; synthetic-only  
**Scope:** reconcile multiple provider observations that describe one source fact before passing a single projection to a provider-neutral lifecycle reducer.

## 1. Ownership boundary

The collector preserves each response/event as an immutable ObservationRecord with its own source family, source identity, timestamps, raw evidence reference, digest and evidence version.

The reconciliation stage is a deterministic adapter-level projection. It does not replace, mutate, merge or discard source observations. It does not establish authenticity, account ownership, Principal attribution, economic classification, settlement, valuation, netting, authority or permission to act.

The generic IMMORTAL/Arb reducer receives one reconciled source-fact projection only after the adapter has resolved its provider-specific identity. It must never be taught that two different raw digests are equal merely because a provider-specific business identifier matches.

## 2. Identity model

A reconciliation key is provider-defined and must include the complete documented uniqueness scope. For the Binance Spot trade candidate, the proposed key is:

`(providerProfileRef, accountScopeRef, symbol, tradeId)`

- `providerProfileRef` pins the exact provider product/profile and mapping version.
- `accountScopeRef` prevents collisions between accounts or subaccounts.
- `symbol` scopes the trade identifier to the provider's documented symbol namespace.
- `tradeId` is the provider trade identifier, not the order ID or execution ID.

The key is not valid if any component is absent, ambiguous, inferred from a display label, or outside its documented uniqueness scope. A local envelope ID, WebSocket event ID, order ID or execution ID must not be substituted for `tradeId`.

## 3. Evidence preservation and matching

For each candidate key, retain every ObservationRecord independently. In particular, a User Data Stream `executionReport` and REST `myTrades` row remain two raw observations even when they refer to one trade.

A candidate pair may be classified as SAME_SOURCE_FACT only when:
1. Both records have the same complete reconciliation key.
2. Both source families are explicitly mapped to the same provider trade fact.
3. All mutually available identity-critical fields agree after lossless, field-specific normalization.
4. No correction, reversal, bust, or supersession relation contradicts the match.

For Binance Spot, compare at minimum:
- symbol;
- account scope;
- trade ID;
- order ID;
- executed base quantity (`l` versus `qty`);
- execution price (`L` versus `price`);
- commission amount;
- commission asset.

Where both sides expose quote quantity, compare it too, while preserving the source representation and precision. Do not compare a cumulative order quantity with a per-trade quantity. Do not use receipt time or event arrival order to select a preferred record.

Different raw digests are expected for separate REST and stream observations. Digest inequality alone is not a conflict and does not authorize deduplication. Each digest remains bound to its original ObservationRecord.

## 4. Reconciliation outcomes

| Outcome | Meaning | Downstream behavior |
|---|---|---|
| MATCHED | Complete key and all required comparable fields agree | Emit one derived trade projection referencing every matched ObservationRecord |
| INCOMPLETE | Key or required comparison fields are missing | Preserve all records; emit no trade projection |
| CONFLICTED | Same key but one or more identity-critical fields disagree, or correction lineage is unresolved | Preserve all records; quarantine the key; emit no trade projection |
| UNMAPPED | Source family/event type is not explicitly mapped to this trade fact | Preserve the record; do not infer a trade |
| NOT_A_TRADE | Provider event explicitly represents a non-trade execution/order event (for example, a non-trade execution type or sentinel trade ID) | Preserve the record; do not create a fill |

No outcome authorizes settlement, ownership transfer, position netting or economic admission.

## 5. Projection contract

A MATCHED result may emit exactly one immutable projection containing:
- reconciliation key and reconciliation-contract version;
- canonical source-fact type `TRADE_EXECUTION`;
- provider order ID and trade ID;
- symbol and mapped instrument reference (only if explicitly qualified);
- exact source quantity, price, commission and commission-asset strings;
- references to all contributing ObservationRecords;
- reconciliation status and deterministic comparison result.

The projection must not sum quantities, convert assets, infer missing commission, compute PnL, classify fees economically, infer settlement, or change any account/position state. The original raw payloads and digests remain independently addressable.

## 6. Correction and replay rules

- Exact repeat of the same ObservationRecord identity and digest is a replay duplicate/no-op.
- Same source identity with a changed digest is a source-identity conflict unless the provider contract explicitly identifies a correction/revision and links it to the prior record.
- A correction creates a new ObservationRecord and a new reconciliation result; history is never overwritten.
- A bust/reversal is a distinct lifecycle fact. It must not be represented as deletion of the original trade.
- A late REST row can enrich a prior stream observation only by the same complete provider trade key and matching fields. Arrival order is not precedence.
- If one source family is absent, the available observation remains a single-source observation; do not label it independently corroborated.

## 7. Boundary with the existing reducer

The legacy `projectOrderLifecycle` fill form remains unchanged: it requires one `rawDigestRef`, and a repeated fill is a no-op only when fill identity, quantity and that digest all match. A changed digest remains CONFLICTED.

A provider-specific reconciliation must not select one raw digest or synthesize a replacement digest. Instead, the adapter emits one FILL event carrying a `ReconciledTradeEvidenceBinding`:
- exact scoped reconciliation key and trade/order identity;
- profile/version and account scope;
- every contributing ObservationRecord event reference;
- for each observation, its source, stream, source operation and original raw digest reference.

The reducer recognizes this as a separate, explicit evidence mode. It validates the structure, requires at least two distinct observation references from distinct source identities/channels, and considers a replay duplicate only when fill ID, quantity and the complete normalized evidence-binding set match. Any changed reference, source, operation or raw digest for the same fill ID is CONFLICTED. A reconciled binding cannot be combined with a top-level `rawDigestRef`.

This is a structural evidence-binding contract, not raw-byte integrity verification or source-operation qualification. It does not prove that the caller's MATCHED status is trustworthy. The adapter preserves the exact source evidence so IMMORTAL's existing EXP-06 qualification can be applied separately.

## 8. Synthetic conformance cases

Minimum tests:
1. Same account/symbol/trade ID, matching order/quantity/price/commission fields, different raw digests -> MATCHED, two source refs, one projection.
2. Same key, quantity mismatch -> CONFLICTED, no projection.
3. Same key, commission asset mismatch -> CONFLICTED, no projection.
4. Same trade ID but different account scope -> distinct keys, no cross-account match.
5. Same trade ID but different symbol -> distinct keys.
6. Missing trade ID or provider sentinel -> NOT_A_TRADE or INCOMPLETE, never a fabricated key.
7. Duplicate delivery of one raw observation with same identity/digest -> replay no-op.
8. Same raw source identity with changed digest and no documented correction link -> CONFLICTED.
9. Explicit correction/bust -> preserve original and correction as separate lifecycle evidence.
10. One source family only -> single-source evidence, not independent corroboration.

## 9. Non-regression

This contract adds no provider client, API request, credentials, live account access, signature verifier, schema migration, economic rule, valuation, EEV, ProtectedCapital, RiskBudget, netting, mandate, authority, actuator or execution capability.

S1 remains synthetic/read-only. Provider selection and provider conformance remain OPEN. D0/D1 and independent review remain OPEN. S2/S3 remain unauthorized.


## 10. Synthetic implementation status — 2026-11-05

The pure `reconcileTradeObservationCandidates` implementation now covers the matching core over already-normalized candidate records. It requires:
- an explicit caller-supplied `TRADE_EXECUTION` mapping and operation reference;
- the complete scoped key `profileRef + profileVersion + accountScopeRef + symbol + tradeId`;
- one REST and one STREAM source identity;
- agreement on order ID, quantity, price, commission amount and commission asset;
- quote-quantity agreement when both sides expose it;
- no unresolved correction/supersession relation.

Raw digest inequality across the two channels is allowed. Within one channel, an exact repeated observation identity/digest is a no-op; changed content for that identity or multiple distinct identities for the same scoped trade key is CONFLICTED. Decimal comparison is exact (base-10 string normalization only); each original source string remains in `sourceValues`. A single source remains INCOMPLETE and emits no reconciled projection. Explicit non-trade sentinels are kept outside the trade projection.

**Implementation boundary:** this is a comparison core over synthetic normalized candidates, not a Binance parser, ProviderProfile verifier, account client or provider conformance result. `sourceOperationMappingStatus` remains NOT_VERIFIED; raw bytes/digests are not retrieved or recomputed; verifier trust is not assessed. The matched projection does not assert settlement, position state, netting, authority or economic admission.

**Downstream integration remains OPEN:** `projectOrderLifecycle` currently consumes a fill's `rawDigestRef` and treats changed digests for the same fill identity as a conflict. A cross-channel reconciled projection intentionally has two different raw digests. Do not select one source digest or substitute a locally invented digest. The adapter-to-lifecycle evidence interface must be specified so the generic reducer can bind a reconciliation artifact and all source ObservationRecord references without weakening the existing replay rule.


## 11. Lifecycle binding implementation — 2026-11-05

`src/trade-lifecycle-adapter.js` converts only a MATCHED reconciliation group into one lifecycle FILL. The resulting event carries the `ReconciledTradeEvidenceBinding` and every original ObservationRecord/source/digest binding; it has no singular or synthetic `rawDigestRef`.

`projectOrderLifecycle` now supports two explicit evidence modes:
1. Legacy `rawDigestRef`, preserving the existing exact-digest replay and conflict behavior.
2. `ReconciledTradeEvidenceBinding`, where replay equality covers the full normalized set of observation references, source identities, operation references and per-observation raw digests.

The modes cannot be mixed on one event. Incomplete, repeated or ambiguous source bindings fail closed. The adapter and reducer still do not verify raw bytes, digest integrity, provider mapping, verifier trust, settlement, ownership, position state, netting, authority or economic admission.


## 12. Cross-family scope exclusion

This trade-level contract resolves only observations that describe the same provider trade fact. It does not join trade facts to balance snapshots/deltas, external lock changes, positions, liabilities, transfer lifecycle, or settlement. Those are distinct source families and require explicit typed relation evidence. A shared asset, amount, timestamp, order ID, or account scope by itself is not enough to merge them. See [CROSS-FAMILY-RECONCILIATION-CONTRACT-v0.1.md](CROSS-FAMILY-RECONCILIATION-CONTRACT-v0.1.md).

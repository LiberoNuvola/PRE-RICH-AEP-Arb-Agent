# Prior-Art Adaptation Map — Arb S1 Evidence Boundary

**Revision:** 0.1 — 2026-11-03  
**Status:** research and architecture mapping; not an implementation certification  
**Scope:** provider-neutral, read-only evidence ingestion and normalization

## Decision summary

Do not design a new universal event protocol. Reuse mature standards at the layer where they fit, and retain Arb/IMMORTAL-specific rules only where those standards do not answer the financial evidence questions.

| Prior art | Reuse | Adaptation to Arb | Explicit non-claim |
| --- | --- | --- | --- |
| CloudEvents | Event envelope concepts: event ID, source, type, optional subject/time/schema reference | Map to ObservationRecord eventId, sourceId, eventKind, subjects, sourceObservedAt and profile/schema references. Preserve provider sourceEventId only if supplied. Keep local envelope identity distinct from provider identity. | CloudEvents does not prove source truth, stream completeness, settlement finality, account ownership or authority. Its source+id duplicate convention is not sufficient by itself for Arb's stricter stream/cursor/digest lineage rule. |
| W3C PROV-O | Entity, Activity, Agent; wasGeneratedBy, used, wasDerivedFrom, wasAssociatedWith | Model raw response as an evidence Entity; collection and normalization as separate Activities; normalized observation as a derived Entity; collector and verifier as separately identified Agents. Implement as linked references/records first; RDF is optional, not a runtime requirement. | PROV-O is a provenance model, not a truth oracle, ownership registry, financial mandate or completeness proof. |
| RFC 8785 JCS | Deterministic JSON canonical representation for hash/signature input | Candidate canonicalization for the normalized JSON statement or evidence manifest, pinned by canonicalizationVersion. Keep original raw bytes separately and preserve their exact digest/encoding metadata. Keep high-precision quantities and identifiers as strings. | JCS does not hash, sign, authenticate the provider or prove that the underlying statement is true. The RFC is informational, not Standards Track. |
| DSSE | Typed payload signing envelope; signatures bind payload bytes and payload type | Candidate wrapper for a future verifier attestation or evidence packet, after exact payload serialization/type and signer trust policy are specified. Keep verification as an independent role. | DSSE deliberately leaves key management/PKI and exclusive ownership out of scope. A valid signature proves a signature under a trust decision, not account completeness or financial authority. |
| FIX Protocol / FIX Trading Community practices | Order/execution lifecycle vocabulary; distinction between order state and execution-report purpose; snapshot/full-refresh and incremental-update patterns | Use as a field-mapping checklist for provider-specific order/fill models and market-data reconstruction. Record source-defined event role, sequence, snapshot/incremental relationship, execution quantity/price/fee/venue semantics. | Do not assume FIX transport, message versions, sequence semantics, or exact equivalence across non-FIX providers. FIX messages do not make end-of-day confirmations or settlement proofs interchangeable with execution events. |
| Certificate Transparency / Merkle append-only logs | Inclusion and consistency proof concepts, append-only evidence history | Keep as a possible later design reference for externally auditable evidence logs if the threat model requires transparency. | Not needed for current S1; CT trust and monitoring assumptions do not automatically transfer to financial evidence or prove source completeness. |

## Detailed mapping and decisions

### 1. CloudEvents — adopt the envelope, not its entire identity semantics

CloudEvents defines required context attributes including id, source, specversion and type. Its producer uniqueness rule is scoped to source plus id, and redelivery may reuse the same id. Arb already has a richer ObservationRecord envelope with sourceId, streamId, sourceEventId, eventKind, profile/version, timestamps, relations, evidence and quality.

Decision:
- Keep ObservationRecord as the canonical Arb envelope; do not replace it with CloudEvents or claim formal CloudEvents conformance.
- Provide an explicit mapping table in each future provider profile.
- Keep sourceEventId nullable when the provider does not supply it.
- Continue to require exact event lineage for a duplicate no-op: same event ID, source/stream/sequence identity and raw digest reference. A generic source+id match alone must not erase conflicting source-cursor evidence.
- Keep source occurrence time and local receipt time separate.

Reference: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

### 2. W3C PROV-O — adopt the concepts as an evidence graph

PROV-O separates Entities, Activities and Agents. Its relations include generated-by, derived-from, used, attributed-to and associated-with. This is a good conceptual model for a chain such as:

provider response (Entity) -> collection activity (Activity) -> raw evidence artifact (Entity) -> normalization activity (Activity) -> ObservationRecord (Entity) -> independent verification activity (Activity) -> verification report (Entity).

Decision:
- Model these as explicit references and role-bearing records in JSON first.
- Preserve input artifact, transform/version, output artifact and verifier as distinct nodes/links.
- Do not turn the observer into the verifier or authority.
- Do not require RDF/OWL infrastructure for S1.

Reference: https://www.w3.org/TR/prov-o/

### 3. RFC 8785 JCS — adopt for canonicalization only after raw retention

JCS gives a deterministic serialization scheme suitable as input to cryptographic hashing/signing. It constrains JSON to I-JSON and recommends strings for numbers needing precision or integer range beyond IEEE-754 double precision.

Decision:
- Raw provider bytes remain the primary source artifact and are never overwritten by normalized JSON.
- A future profile pins canonicalization algorithm/version and encoding rules for normalized evidence manifests.
- Monetary quantities, large cursors, IDs and high-precision decimals remain strings in JSON.
- A hash is recomputed over retrieved bytes; equality of two digest-reference strings is not verification.
- JCS must be tested against RFC vectors before it is used in a verification implementation.

Reference: https://www.rfc-editor.org/rfc/rfc8785.html

### 4. DSSE — consider for future verifier attestations, not now

DSSE signs a typed serialized payload using a pre-authentication encoding that binds payload type and payload bytes. It is designed to avoid ambiguity about what the signature is signing.

Decision:
- Do not introduce signing keys, signatures or a trust root in the current S1 package.
- If a later evidence attestation needs signatures, evaluate DSSE as the envelope.
- Define key discovery, trust roots, revocation, threshold policy, signer-role binding and verifier independence separately.
- Keep signed observation content distinct from verifier conclusion and Principal authority.

Reference: https://github.com/secure-systems-lab/dsse

### 5. FIX — reuse lifecycle questions and book synchronization patterns

The FIX Trading Community describes Snapshot/Full Refresh and Incremental Refresh messages, with book-management practices for sequencing and interpreting updates. FIX Execution Report references distinguish the current order state (OrdStatus) from the purpose of the report (ExecType), and include execution/fill and fee reporting use cases. Execution reports do not replace end-of-day confirmations.

Decision:
- Use FIX as a checklist for what a provider-specific order/fill profile must explain: order state vs event purpose, partial/final fills, corrections, cancels, execution IDs, price/quantity/fee units, venue/liquidity role and snapshot-to-incremental recovery.
- Do not project FIX-specific enumerations onto a provider until its official profile is mapped.
- Keep settlement/finality as a separate evidence family, never inferred from a fill or cancel request.

References:
- https://fixtrading.org/guidelines/data-transparency/
- https://fix.dev/workspaces/fix-standards/specs/1000002/messages/8

### 6. Certificate Transparency — optional future transparency-log reference

RFC 9162 uses append-only Merkle trees, inclusion proofs and consistency proofs to audit a log's history and detect certain forms of log misbehavior. It also explicitly treats the log as a trusted third party and identifies split-view risks.

Decision:
- Do not add a transparency log to S1.
- Revisit only if an explicit threat model requires public or multi-party audit of evidence packet inclusion/history.
- A Merkle proof would prove inclusion/consistency relative to a log's claims, not that the original provider data was complete or economically true.

Reference: https://www.rfc-editor.org/rfc/rfc9162.html

## Resulting Arb design

1. Envelope: retain ObservationRecord; document CloudEvents mapping without claiming conformance.
2. Provenance: add stable references for collection/normalization/verification activities and artifacts, aligned conceptually with PROV-O.
3. Integrity: preserve raw bytes; add a separately versioned canonicalization and recomputation process later; consider DSSE only for signed verifier attestations.
4. Trading semantics: source-profile-driven mappings informed by FIX lifecycle and book synchronization patterns.
5. Coverage: keep per-family completion evidence; no global accountComplete flag and no inference of zero from missing/unrequested data.
6. Authority: collector, verifier, Principal and account-resource authority remain separate. D0/D1 do not derive from the evidence adapter.

## What is not imported

No standard is imported as a universal provider guarantee. No provider is selected. No signature implementation, cryptographic hashing implementation, RDF graph, FIX client, market-data feed, account connection, or live adapter is added in this change.

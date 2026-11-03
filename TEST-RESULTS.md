# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.x

## Latest GitHub Actions evidence

The provider-neutral profile and coverage contracts add two schema-validated synthetic documents to the seven original S1 JSON documents. The current workflow validates 9 JSON documents and runs negative schema checks in addition to the existing replay and no-actuation tests. The exact latest run and commit are linked in the repository history; this report will be aligned to the completed run after the current workflow finishes.

## Expected verification coverage in the current workflow

- **38 Node tests** for S1 normalization, replay, exposure projection, capability allowlist and no-actuation checks.
- **9 synthetic JSON documents** validated against Draft 2020-12 schemas: the original seven plus an unselected ProviderProfile template and a per-family CollectionCoverageReport.
- **2 ReplayManifest consistency checks:** exactly one initial checkpoint per stream, with checkpoint cursor equal to the stream's start cursor.
- **6 negative evidence-claim checks:** reject COMPLETE_EMPTY without exhausted pagination, with non-zero count, or without a documented boundary; reject NOT_REQUESTED marked as requested; reject REVIEWABLE ProviderProfile without provider identity/documentation; reject attempts to set Principal authority.
- Unique data-family coverage entries are checked separately from JSON Schema validation.
- The static no-actuation check scans all JavaScript files under src.

The provider-profile and coverage work is schema/test/documentation-only. It adds no provider client, account connection, credentials, adapter, network capability, trading capability or economic admission.

## Existing test coverage

Tests cover the nine synthetic base fixtures; observation normalization and explicit identity/provenance; freshness/sequence/conflict classification; account-category completeness; order/fill lifecycle; simulation isolation; capability allowlist; duplicate/conflict/gap/correction replay; stale correction target rejection; event-ID reuse/alias conflict; null input fail-closed behavior; late fill after cancel confirmation; duplicate fill digest equality; conflicting fill payload digest; missing fill digest; deterministic replay; independent multi-stream progress; duplicate stream declaration rejection; typed gross OpenExposure preservation; empty/malformed/duplicate exposure handling; and source no-actuation checks.

The original seven JSON documents:
1. Base fixture pack.
2. ObservationRecord example.
3. Single-stream ReplayManifest.
4. Multi-stream ReplayManifest with one checkpoint per stream.
5. Single-stream ReplayResult.
6. MultiStreamReplayResult.
7. OpenExposureSet.

Two new documents:
8. ProviderProfile template with provider identity, protocol and documentation intentionally unselected.
9. Synthetic CollectionCoverageReport showing complete-nonempty, complete-empty, partial, not-requested and not-applicable family states.

## Prior CI attempts

- Runs #1–#5 passed before the expanded adversarial pass.
- Run #6 failed on normalizer provenance expectations introduced in that change.
- Run #7 exposed over-escaped timestamp/decimal validation patterns.
- Run #8 passed after those pattern fixes and test alignment.
- Run #9 passed after fill payload digest requirements and new regressions.
- Run #10 and #11 passed after adversarial-review/readiness documentation alignment.
- Runs #12–#20 passed while the prior-art and provider-profile documents, schemas and synthetic examples were added. The new negative evidence claims are executed by the latest validator change, not by those earlier runs.

These failures are retained as development history; no failed run is represented as a pass.

## Evidence limits

Passing workflows validate the candidate against synthetic fixtures on GitHub-hosted runners. They are not independent security certification, provider/venue conformance, real account ownership/control evidence, cryptographic digest verification, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence or permission to trade. Static source checks are defense-in-depth, not a sandbox or proof of universal absence of side effects.

The prior-art adaptation map is architectural research, not a claim of standards conformance. The ProviderProfile and CollectionCoverage schemas are declarative gates only. They do not establish provider facts, implement live collection, prove account completeness, cryptographically verify evidence, or close any authority gate.

# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.x

## Latest full S1 conformance evidence

**Latest full run #29:** [S1 Read-only Conformance — success](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41692538623)  
**Commit:** [115a8aa95d4016952639fbee1900f6a0b0e80721](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/115a8aa95d4016952639fbee1900f6a0b0e80721)  
**Conclusion:** success — full S1 Node, schema, coverage-negative and no-actuation job completed on the exact current readiness/assessment documentation commit.

The exact run logs show:

- **38 Node tests passed / 0 failed**.
- **9 synthetic JSON documents** passed Draft 2020-12 validation: the original seven plus a ProviderProfile template and a CollectionCoverageReport.
- **2 ReplayManifest consistency checks** passed: exactly one initial checkpoint per stream, with checkpoint cursor equal to the stream's start cursor.
- **6 negative evidence-claim checks** passed:
  1. COMPLETE_EMPTY without exhausted pagination was rejected.
  2. COMPLETE_EMPTY with a non-zero record count was rejected.
  3. COMPLETE_EMPTY without a documented query/snapshot boundary was rejected.
  4. NOT_REQUESTED marked as requested was rejected.
  5. REVIEWABLE ProviderProfile without provider identity/documentation was rejected.
  6. ProviderProfile attempting to set Principal authority was rejected.
- The synthetic coverage report has unique per-family records.
- Static no-actuation checks passed over all JavaScript files under src.

**Internal prior-art reconciliation and final documentation verification:** [Run #31](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41693739831) passed after adding the IMMORTAL hand-off crosswalk. [Run #32](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41693974851) passed after narrowing the novelty assessment. [Run #33](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41694022403) revalidated the README, and [run #34](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41694033062) revalidated S1 readiness on exact HEAD ca823b8. These were documentation-only changes; the full code/schema/negative-claim results remain those from run #29.

## What the new schemas cover

1. ProviderProfile is version-pinned and declares provider/product/environment, protocol, official documentation basis, resource scope, data-family mappings, event identity, stream/correction semantics, snapshot/pagination/recovery, time, execution fields, exclusions and an immutable authority boundary.
2. CollectionCoverageReport records coverage per data family, including COMPLETE_NONEMPTY, COMPLETE_EMPTY, PARTIAL, UNAVAILABLE, NOT_REQUESTED, NOT_APPLICABLE_PROFILE, UNKNOWN and CONFLICTED.
3. COMPLETE_EMPTY is scoped to the precise query. It requires successful query completion, exhausted pagination (or a documented non-paginated operation), no truncation, a completion evidence reference, a boundary reference and applicable retention evidence. A query-completion boundary with NON_ATOMIC state is not an atomic account snapshot.
4. No account-wide completeness or accountComplete boolean is introduced. Missing, unrequested, filtered, truncated or unknown categories are not represented as zero.

## Existing S1 test coverage

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
- Runs #10–#11 passed after adversarial-review/readiness documentation alignment.
- Runs #12–#20 passed as the prior-art map, provider contract, schemas and synthetic examples were added.
- Run #21 passed with the complete schema/negative-check update.
- Runs #22–#24 passed while README, readiness and results documentation was aligned.
- Run #27 passed after adding the preliminary contribution/novelty assessment.
- Runs #28–#29 passed after linking the assessment and updating readiness; run #29 revalidated all 38 Node tests, 9 schema documents, 2 checkpoint checks and 6 negative evidence-claim checks.

These failures are retained as development history; no failed run is represented as a pass.

## Evidence limits

Passing workflows validate the candidate against synthetic fixtures on GitHub-hosted runners. They are not independent security certification, provider/venue conformance, real account ownership/control evidence, cryptographic digest verification, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence or permission to trade. Static source checks are defense-in-depth, not a sandbox or proof of universal absence of side effects.

The prior-art adaptation map and the contribution assessment are architectural research, not claims of standards conformance or originality. The IMMORTAL hand-off crosswalk records that Gate 23/24/30, R9 V1–V9 and EV1–EV7, EconomicAdmissionWitness, CanonicalTransitionEvidence, GOV-27 and Composition X1–X7 already cover substantial parts of the proposed evidence-to-economic boundary. Arb must not introduce a duplicate EvidenceQualification type or economic gate without a demonstrated unmapped requirement.

The ProviderProfile and CollectionCoverage schemas are declarative adapter-side records only. They do not establish provider facts, implement live collection, prove account completeness, cryptographically verify evidence, close D0/D1 or grant authority.

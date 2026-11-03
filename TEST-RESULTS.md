# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.x

## Latest GitHub Actions evidence

**Run #10:** [S1 Read-only Conformance](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41586219658)  
**Commit:** [94cebf1173298994e167918fee3e59e7295cd7c6](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/94cebf1173298994e167918fee3e59e7295cd7c6)  
**Conclusion:** success — the S1 schemas, replay and no-actuation job completed.

- **38 Node tests passed / 0 failed** on the GitHub Actions runner (Node.js 22).
- **7 synthetic JSON documents passed** Draft 2020-12 validation.
- **2 ReplayManifest consistency checks passed:** exactly one initial checkpoint per stream, with checkpoint cursor equal to the stream's start cursor.
- The static no-actuation check scans all JavaScript files under src.

Run #9 passed on the latest code changes; run #10 independently revalidated the report/readiness documentation commit with the same conformance counts.

## Coverage

Tests cover the nine synthetic base fixtures; observation normalization and explicit identity/provenance; freshness/sequence/conflict classification; account-category completeness; order/fill lifecycle; simulation isolation; capability allowlist; duplicate/conflict/gap/correction replay; stale correction target rejection; event-ID reuse/alias conflict; null input fail-closed behavior; late fill after cancel confirmation; duplicate fill digest equality; conflicting fill payload digest; missing fill digest; deterministic replay; independent multi-stream progress; duplicate stream declaration rejection; typed gross OpenExposure preservation; empty/malformed/duplicate exposure handling; and source no-actuation checks.

Seven JSON documents:
1. Base fixture pack.
2. ObservationRecord example.
3. Single-stream ReplayManifest.
4. Multi-stream ReplayManifest with one checkpoint per stream.
5. Single-stream ReplayResult.
6. MultiStreamReplayResult.
7. OpenExposureSet.

## Prior CI attempts

- Runs #1–#5 passed before the expanded adversarial pass.
- Run #6 failed on normalizer provenance expectations introduced in that change.
- Run #7 exposed over-escaped timestamp/decimal validation patterns.
- Run #8 passed after those pattern fixes and test alignment.
- Run #9 passed after fill payload digest requirements and new regressions.
- Run #10 passed after the internal adversarial review report and readiness documentation were committed.

These failures are retained as development history; no failed run is represented as a pass.

## Evidence limits

Passing workflows validate the candidate against synthetic fixtures on GitHub-hosted runners. They are not independent security certification, provider/venue conformance, real account ownership/control evidence, cryptographic digest verification, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence or permission to trade. Static source checks are defense-in-depth, not a sandbox or proof of universal absence of side effects.

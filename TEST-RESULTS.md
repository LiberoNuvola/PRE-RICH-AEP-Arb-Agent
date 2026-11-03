# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.0

**GitHub Actions run:** [S1 Read-only Conformance #1](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41584700965)  
**Commit:** [7a98862a856e0daf94439e42b610150783cc431c](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/7a98862a856e0daf94439e42b610150783cc431c)  
**Conclusion:** success — job "S1 schemas, replay and no-actuation checks" completed.

## Node tests

- **28 passed / 0 failed** on the GitHub Actions runner.
- Runtime: Node.js 22.
- Covers the nine synthetic base fixtures; observation/freshness/sequence/conflict classification; account completeness; order/fill lifecycle; simulation isolation; capability allowlist; duplicate/conflict/gap/correction replay; late fill after cancel confirmation; deterministic replay; independent multi-stream progress; duplicate stream declaration rejection; typed gross exposure preservation; empty/malformed/duplicate exposure handling; and static no-actuation guards.

## JSON Schema checks

**Six synthetic documents passed** Draft 2020-12 validation on GitHub Actions:

1. Base fixture pack.
2. ObservationRecord example.
3. Single-stream ReplayManifest example.
4. Single-stream ReplayResult example.
5. MultiStreamReplayResult example.
6. OpenExposureSet example.

No schema validation errors were reported.

## Evidence limits

The passing workflow validates this package against synthetic fixtures on the GitHub runner. It is not independent security certification, provider/venue conformance, real account ownership/control evidence, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence, or permission to trade. Static source checks are defense-in-depth and not a complete security proof.

# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.0

## Latest GitHub Actions evidence

**Run #4:** [S1 Read-only Conformance](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41585214152)  
**Commit:** [f02602c710a1e890fa346e6719ccc33b44332e38](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/f02602c710a1e890fa346e6719ccc33b44332e38)  
**Conclusion:** success — job "S1 schemas, replay and no-actuation checks" completed.

- **29 Node tests passed / 0 failed** on the GitHub Actions runner (Node.js 22).
- **7 synthetic JSON documents passed** Draft 2020-12 validation.
- **2 additional manifest consistency checks passed:** one unique initial checkpoint per declared stream, and checkpoint cursor equals the stream's start cursor.

## Coverage

Node tests cover the nine synthetic base fixtures; observation/freshness/sequence/conflict classification; account completeness; order/fill lifecycle; simulation isolation; capability allowlist; duplicate/conflict/gap/correction replay; late fill after cancel confirmation; deterministic replay; independent multi-stream progress; duplicate stream declarations; duplicate event-ID reuse across source sequence; typed gross exposure preservation; empty/malformed/duplicate exposure handling; and static no-actuation guards.

Seven JSON documents:
1. Base fixture pack.
2. ObservationRecord example.
3. Single-stream ReplayManifest.
4. Multi-stream ReplayManifest with a distinct initial checkpoint for each stream.
5. Single-stream ReplayResult.
6. MultiStreamReplayResult.
7. OpenExposureSet.

The manifest consistency validator also rejects duplicate stream IDs, duplicate checkpoint IDs, missing/extra checkpoint coverage and cursor mismatches.

## Earlier CI evidence

- [Run #1](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41584700965): success; 28 Node tests and 6 schema validations.
- [Run #2](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41584895093): success; documentation/package metadata revalidation.
- [Run #3](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41585073825): success; 28 Node tests, 7 schema documents and 2 per-stream checkpoint consistency checks.

## Evidence limits

The passing workflows validate this package against synthetic fixtures on GitHub-hosted runners. They are not independent security certification, provider/venue conformance, real account ownership/control evidence, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence, or permission to trade. Static source checks are defense-in-depth and not a complete security proof.

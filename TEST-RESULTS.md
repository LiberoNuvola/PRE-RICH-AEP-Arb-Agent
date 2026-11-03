# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.x

## Latest GitHub Actions evidence

**Run #11:** [S1 Read-only Conformance](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41586398713)  
**Commit:** [246e50bef8cb8c45dbb15daa7b379308ae4e7116](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/246e50bef8cb8c45dbb15daa7b379308ae4e7116)  
**Conclusion:** success — the S1 schemas, replay and no-actuation job completed on the exact commit.

The conformance evidence recorded by implementation run #9 and revalidated by documentation runs #10 and #11 is:

- **38 Node tests passed / 0 failed** on the GitHub Actions runner (Node.js 22).
- **7 synthetic JSON documents passed** Draft 2020-12 validation.
- **2 ReplayManifest consistency checks passed:** exactly one initial checkpoint per stream, with checkpoint cursor equal to the stream's start cursor.
- The static no-actuation check scans all JavaScript files under src.

Run #9 passed on the latest code changes. Run #10 revalidated the internal-review/report documentation commit. Run #11 revalidated the repository's latest README/readiness documentation commit. The provider-neutral contract is documentation-only and does not add an adapter, schema, fixture or new test claim.

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
- Run #11 passed after the repository's latest readiness documentation alignment.

These failures are retained as development history; no failed run is represented as a pass.

## Evidence limits

Passing workflows validate the candidate against synthetic fixtures on GitHub-hosted runners. They are not independent security certification, provider/venue conformance, real account ownership/control evidence, cryptographic digest verification, IMMORTAL economic admission, D0/D1 closure, Composition Contract X1–X7 evidence or permission to trade. Static source checks are defense-in-depth, not a sandbox or proof of universal absence of side effects.

The provider-neutral evidence contract at docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md is a design checklist only. It does not establish provider facts, implement live collection, prove account completeness, or close any authority gate.

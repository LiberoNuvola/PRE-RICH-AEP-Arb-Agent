# Test Results — PRE-RICH AEP Arb Agent S1 Reference v0.2.0

Run environment: Node.js 22.16.0; Python jsonschema 4.26.0.  
Test commands: `npm test` and `python test/validate_schemas.py`.

## Node tests

- 27 tests passed.
- 0 failed.
- Covers the nine synthetic base fixtures; observation/freshness/sequence/conflict classification; account completeness; order/fill lifecycle; simulation isolation; capability allowlist; duplicate/conflict/gap/correction replay; late fill after cancel confirmation; deterministic replay; independent multi-stream progress; duplicate stream declaration rejection; typed gross exposure preservation; empty/malformed/duplicate exposure handling; and static no-actuation guards.

## JSON Schema checks

Six synthetic documents passed Draft 2020-12 validation:

1. Base fixture pack.
2. ObservationRecord example.
3. Single-stream ReplayManifest example.
4. Single-stream ReplayResult example.
5. MultiStreamReplayResult example.
6. OpenExposureSet example.

No schema validation errors were reported.

## Evidence limits

These are local reference-kit tests. They are not yet GitHub Actions evidence, independent security certification, provider/venue conformance, real account ownership/control, IMMORTAL economic admission, D0/D1 closure or permission to trade. Static source checks are defense-in-depth and not a complete security proof.

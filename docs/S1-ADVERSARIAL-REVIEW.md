# S1 Focused Adversarial Review — v0.2.x candidate

**Review type:** internal second-pass adversarial review by the implementation agent  
**Review date:** 2026-11-03  
**Scope:** read-only source normalization, per-stream replay lineage, correction chain, order/fill projection, no-actuation guard  
**Latest CI evidence:** [run #10](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41586219658)  
**Latest reviewed commit:** [287ad0d](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/commit/287ad0dc24793bb0ab7fdb95304be65a0fa788ab)

This is not an independent external audit, security certification, production readiness approval or venue conformance report.

## 1. Findings and dispositions

| ID | Adversarial case | Prior behavior / risk | Disposition |
| --- | --- | --- | --- |
| ARB-S1-R01 | A second correction refers to an event that was already superseded | The reducer accepted a non-active target and could leave competing active projections | **Fixed.** Corrections now require the target to be in the active projection head; otherwise the stream is blocked as CONFLICTED and the last accepted cursor is not advanced. |
| ARB-S1-R02 | Same source cursor and digest arrives with a new event ID | The new ID was treated as a harmless duplicate without registering that ID's lineage | **Fixed.** A no-op duplicate requires the same event ID, source/stream/sequence tuple and raw digest reference. A different event ID for the same source cursor is quarantined as a conflict. Reuse of an event ID for a different identity is also quarantined. |
| ARB-S1-R03 | An observation lacks a canonical instrument reference or source event ID | The normalizer synthesized an instrument reference from asset-reference suffixes and fabricated a source-event reference from source ID and sequence | **Fixed.** The normalizer requires an explicit instrumentRef mapping; it passes through the provider's sourceEventId only when supplied, otherwise returns null. It also requires profile/version, source ID and timezone-qualified source/receipt timestamps. |
| ARB-S1-R04 | Malformed top-level replay input is null or absent | Destructured parameters could throw before fail-closed classification | **Fixed.** replayStream and replayStreams return INVALID_INPUT for null/malformed top-level arguments. |
| ARB-S1-R05 | A repeated fill ID carries the same quantity but a different raw payload | The projector compared only quantity and could hide a change in other fill payload fields such as fees or price | **Fixed for this candidate projection.** A fill now requires rawDigestRef. A duplicate fill ID is a no-op only when quantity and digest reference both match. Different digest references are CONFLICTED; a fill without digest evidence is not counted. |
| ARB-S1-R06 | No-actuation source check only scans the primary reducer | A future helper under src could add a network or mutating call without the guard seeing it | **Fixed.** The static test scans every JavaScript file under src, not just reducer.js. It remains defense-in-depth, not a complete sandbox/security proof. |
| ARB-S1-R07 | Timestamp and decimal validation patterns were serialized with extra escaping during the first implementation attempt | Valid fixture values were rejected | **Fixed and covered.** RFC3339-style timestamps require an explicit UTC offset; decimal patterns use the intended decimal separator. The first affected CI runs failed and were corrected before run #9 passed. |

## 2. Current automated evidence

GitHub Actions [run #9](https://github.com/LiberoNuvola/PRE-RICH-AEP-Arb-Agent/actions/runs/41586103171) completed successfully:

- 38 Node tests passed, 0 failed.
- 7 synthetic JSON documents passed Draft 2020-12 schema validation.
- 2 ReplayManifest consistency checks passed: exactly one checkpoint per declared stream, with the checkpoint cursor equal to that stream's start cursor.
- The no-actuation guard passed over all current JavaScript source files under src.

The adversarial regressions include superseded-target correction, event-ID alias conflicts, null top-level replay input, missing canonical instrument mapping, absent source event ID, incomplete profile/timestamp provenance, timezone-less timestamps, fill-ID same-quantity/different-digest conflicts and missing fill digest evidence.

## 3. Residual limitations — explicitly OPEN

1. **Digest verification:** rawDigestRef is treated as an evidence reference and compared for equality; this package does not recompute or cryptographically verify the referenced bytes/digest. An upstream evidence verifier and canonicalization contract are still required.
2. **Provider identity:** event identity, stream sequencing, source event IDs, correction semantics, snapshot recovery and finality remain provider/profile-specific. No live provider adapter exists.
3. **Fill semantics:** the lifecycle projector is not a complete venue fill schema. It only counts fills with an ID, quantity and raw digest reference. It does not validate price, fee, fee asset, liquidity role, settlement status or provider execution identity. It is not a position, PnL, obligation, solvency or economic-admission engine.
4. **Account completeness:** the synthetic account-category helper checks declared categories; it is not proof that an external provider returned an authoritative, complete account snapshot or that the account belongs to the Principal.
5. **Multi-stream composition:** stream-local replay only. There is no global event order or Composition Contract X1–X7 witness; no aggregated shared account state is produced.
6. **Authority and isolation:** D0 Principal/financial authority and D1 account/resource isolation remain OPEN. S2 paper/test and S3 live execution remain unauthorized.
7. **Independent review:** a separate human or external reviewer has not reviewed or signed this candidate. This internal pass must not be described as independent external review.
8. **Security scope:** static source scanning is not a sandbox, dependency audit, threat model closure, penetration test or proof that the entire repository has no side effects.

## 4. IMMORTAL boundary preservation

- EXP-03: explicit instrument/asset references are required; no asset mapping is inferred from symbols or suffixes.
- EXP-07: no regime parameters or controller authority are introduced.
- EXP-08: gross obligations remain unnetted.
- EXP-09: no obligation transfer or novation is performed.
- EXP-10: no RiskBudget, RealizedExposure or ProtectedCapital calculation/admission is introduced.
- EXP-12: observer output remains evidence/projection only and grants no authority.
- Composition X1–X7 remains an explicit unresolved boundary.

## 5. Decision

**S1 remains a read-only candidate suitable for independent contract review.** The focused internal adversarial pass and automated synthetic conformance are complete. Do not promote to provider integration, S2 paper/test or S3 live execution on the strength of this report. D0/D1, provider evidence contracts, independent review and the remaining S1 data-provenance semantics must be closed through their own gates.

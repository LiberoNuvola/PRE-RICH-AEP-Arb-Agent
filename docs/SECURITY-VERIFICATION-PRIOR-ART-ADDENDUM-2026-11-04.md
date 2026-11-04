# Security and Verification Prior-Art Addendum — Substrate 1.10.3/1.10.4 and Orynq Tool Receipts

**Date:** 2026-11-04  
**Status:** source-reviewed external prior-art mapping; non-normative  
**Arb baseline inspected:** `Immortal-Protocol` @ `c507f343982716a9f346a79add89340a5adeffed`  
**Purpose:** map the Flux Point hardening landed on 2026-11-03/04 to the existing Arb / IMMORTAL boundaries without introducing a second permission system, evidence registry, verifier framework or economic gate.

## 1. Executive disposition

The six repository commits form two complementary but distinct security layers:

1. **Substrate send chokepoint:** a local pre-execution guard that decides whether a shell command may pass a repository-declared outbound-send policy. When the repository has opted in, it now fails closed when it cannot complete its judgment.
2. **Orynq tool-receipt verification:** a receipt verifier that checks the signature and requires the signed content to commit to the response being recorded. It also prevents untrusted bundle data or prototype inheritance from selecting an unintended verifier.

For Arb, these are reusable **implementation precedents**, not new IMMORTAL EXP semantics:

- Substrate is a runtime/command permission guard. It is not Principal authority, a trading mandate, an egress sandbox, or the IMMORTAL Economic Gate.
- Orynq is a tool-receipt integrity verifier. It is not a provider qualification policy, a universal EvidenceQualification state machine, a source-truth oracle, or an economic authorization.
- IMMORTAL remains the owner of EXP-06 evidence semantics, EXP-12 observer/verifier/authority separation, economic invariants and admission. Arb remains a source-scoped provider/account-data adapter and consumer.

**Decision:** reference these systems and reuse their tested patterns where the actual boundary fits. Do not copy either implementation into Arb and do not add a parallel generic security or evidence subsystem.

## 2. Source commits and observed behavior

### 2.1 Flux Point plugins — Substrate send chokepoint

| Change | Merged commit | Verified scope |
|---|---|---|
| Substrate 1.10.3, PR #231 | [`24e42bc`](https://github.com/Flux-Point-Studios/fluxpoint-plugins/commit/24e42bc6d3f75528b9147f3b39c7dc8781b44360) | Narrowed the read-only exemption so commands capable of execution, hidden program invocation, unsafe redirection or assignment are still judged. |
| Substrate 1.10.4 / Flux Point 1.49.1, PR #239 | [`d512048`](https://github.com/Flux-Point-Studios/fluxpoint-plugins/commit/d51204870c4ee4a219cd38fd91c03e4ec1931f3a) | Added a fail-closed child-process supervisor, bounded scans and symlink-safe plugin-root checks. |

PR references: [#231](https://github.com/Flux-Point-Studios/fluxpoint-plugins/pull/231) and [#239](https://github.com/Flux-Point-Studios/fluxpoint-plugins/pull/239).

The 1.10.3 change removes the broad assumption that a command made of apparently read-only tools is harmless. It specifically treats Git as non-exempt because repository configuration may invoke external programs; excludes tools/options that can execute or write; recognizes assignments, descriptor manipulation and redirection targets; and uses a quote/heredoc-aware reader for the Bash exemption. The read-only exemption applies to Bash only; PowerShell is judged as a full command because the reader models Bash grammar.

The 1.10.4 change makes failure behavior explicit when the guard is active:

- the judgment runs in a child process with an 8-second internal deadline and a 512 MiB heap limit;
- errors, signals, out-of-memory termination, spawn failures and missing answers block;
- unreadable payload/config/script, failed script-path inspection and script reads beyond the 16 MiB budget block in an opted-in repository;
- the three relevant text scans were changed to linear-time behavior;
- the hooks recognize a plugin root reached through a symlink, rather than silently exiting without judgment.

**Critical scope limitation:** the chokepoint is deliberately OFF by default and requires a repository-local `.send-chokepoint.json` opt-in. It is a static tripwire over command text and named scripts, not a complete network-egress boundary. Runtime-built commands/URLs, code hidden in data, aliases/functions or other paths outside its static inspection remain outside the guarantee. The upstream README explicitly describes it as a tripwire rather than a security boundary.

Consequently, this work is useful prior art for command-level permission enforcement and fail-closed behavior, but it does not prove that an agent has no alternate egress route and does not itself authorize the business action being attempted.

### 2.2 Orynq SDK — tool-receipt response binding

PR [#227](https://github.com/Flux-Point-Studios/orynq-sdk/pull/227) merged as [`4b01f21`](https://github.com/Flux-Point-Studios/orynq-sdk/commit/4b01f21b16df98f73d5b104d0a379fea0197066b). It contains three implementation commits:

| Commit | Change |
|---|---|
| [`6cc33f8`](https://github.com/Flux-Point-Studios/orynq-sdk/commit/6cc33f85a08b1114db971f8a8a070d45031084e4) | Allows a registered custom scheme to supply its own `responseCommitment(event)`. |
| [`51286c2`](https://github.com/Flux-Point-Studios/orynq-sdk/commit/51286c2f613defd5d93bd58c852102e24a7ec42b) | Resolves verifier functions and their commitment methods from own properties only. |
| [`ad59ec0`](https://github.com/Flux-Point-Studios/orynq-sdk/commit/ad59ec09e0cdfeaa101735c37861b82d768e3167) | Makes a null verifier registry fail closed instead of throwing. |

The verifier contract now separates two checks:

1. **Signature validity:** the selected scheme verifier accepts the receipt signature.
2. **Response binding:** the verifier's own `responseCommitment(event)` returns the digest committed to by the signed content, and that digest must match `event.response.hash`.

A custom scheme that does not provide a response commitment, or returns `null`, fails with `response-not-bound`. A different digest fails with `response-binding-mismatch`. Where `response.payload` is retained, the payload is also hashed and compared with `response.hash`.

Verifier resolution is restricted to own properties of `ctx.verifiers`, then own properties of the built-in verifier table. The optional `responseCommitment` is likewise read only as an own property. This prevents an inherited `Object.prototype` member from acting as an unregistered verifier or injecting a commitment. A null registry is treated as absent and resolves to a negative verification result rather than an exception.

The PR adds nine adversarial tests for custom scheme binding, fabricated responses, absent/null commitments, built-in overrides, prototype pollution and a null registry. Its description records mutation testing over 16 mutants and a local full gate run (203 files passed; 6,411 tests passed, 59 skipped, 0 failed).

### 2.3 Response-bound is not call-bound

This distinction is mandatory when mapping Orynq into Arb:

- A signed response commitment establishes that the recorded response is the response covered by the receipt.
- It does **not** automatically establish which request, account, session, Principal or mandate caused that response.
- Orynq reports external webhook schemes as `callBound: false`, because their provider signature cannot cover the enclosing trace's `runId` and request hash.
- Its self-signed JWS path can establish call binding only when the signed `orynqBinding.{runId, requestHash}` is present and both values match the enclosing trace and recorded request.

Therefore Arb must not turn `signatureValid`, `responseBound` or `receiptVerified` into an unqualified `callAuthorized`, `accountOwned`, `principalValid` or `tradePermitted` flag.

## 3. Mapping to IMMORTAL EXP boundaries

| EXP | Relationship to this prior art | Arb disposition |
|---|---|---|
| **EXP-06 — Evidence-as-Input** | Orynq demonstrates a concrete response-binding check that is stronger than comparing two digest-reference strings. | Reuse as a verifier-contract reference. Arb's current `rawDigestRef` equality remains a reference-consistency check only; it does not retrieve raw bytes, recompute a digest or authenticate a signer. Any future verifier must bind the exact raw artifact, canonicalization/derivation version and intended evidence scope under the existing IMMORTAL EXP-06 contract. Do not add a second evidence registry. |
| **EXP-12 — Observer / Verifier / Authority Split** | Orynq keeps receipt verification distinct from verifier lookup and from call attribution. Substrate guards a command path but does not decide financial authority. | Preserve separate observer, verifier, authorization and economic-decision outputs. The trusted registry/key/policy that determines which verifier is authoritative for a purpose remains an explicit trust decision; own-property lookup only prevents prototype-based dispatch. Neither project grants Principal or trading authority. |
| **EXP-03 — Asset identity / eligibility / valuation** | Neither system validates financial instrument identity, eligibility, valuation, haircut, liquidity or ProtectedCapital. | No new EXP-03 coverage. A signed price/response is not proof that the instrument's exact identity or valuation method is admissible. Reuse IMMORTAL's existing asset/source contracts. |
| **EXP-07 — Regime / hysteresis** | Neither system defines regime variables, a controller, hysteresis or policy thresholds. | No EXP-07 implementation or authority transfer. Substrate's execution refusal is not a financial regime state. |
| **EXP-08 — Netting / offset** | Neither system represents gross obligations, admissible offsets, counterparty consent, atomicity or discharge. | No EXP-08 coverage. A verified receipt cannot net or discharge any obligation. |
| **EXP-10 — Explicit risk budget** | Neither system defines a risk-budget issuer, measure, unit, scope, horizon, reservation, consumption or release. | No EXP-10 coverage. Command permission and response integrity cannot produce RiskBudget, RealizedExposure or ProtectedCapital. |

The same reasoning applies to EXP-01/02/04/05/09/11: these changes do not implement obligation typing, horizon semantics, composition, contingent claims, novation or allocation rules.

## 4. Safe composition for the Arb architecture

Keep the responsibility layers explicit:

| Layer | Responsibility | Does not prove |
|---|---|---|
| **Command/control guard** (Substrate-like) | Whether a declared local command path satisfies a configured execution policy; fail closed when that policy cannot be evaluated. | Principal authority, account ownership, provider truth, economic admissibility or complete egress control. |
| **Collector / observer** (Arb provider adapter) | Source-scoped raw observations, provider event/cursor identity, request/response context, timestamps and coverage limitations. | Signature validity, response integrity or source authority merely because it collected the data. |
| **Receipt verifier** (Orynq-like) | Whether a registered verifier accepts the receipt and whether signed bytes commit to the retained response. | Call/request attribution unless the scheme explicitly signs and verifies it; provider completeness; Principal or economic authority. |
| **Source/policy qualification** (existing IMMORTAL/profile contracts) | Whether the source and evidence are admissible for the exact decision purpose and scope. | Generic authority beyond that policy's stated scope. |
| **IMMORTAL authority and admission** | Principal/mandate, normative EXP semantics, economic state, risk/solvency invariants, Ω/viability and the authoritative gate. | Nothing may be inferred from an Arb-side boolean or receipt flag in place of its required evidence. |

For a future provider-specific integration, the evidence chain should remain traceable as separate objects/claims:

`request` → `raw response artifact` → `receipt/signature` → `response commitment check` → `source qualification` → `IMMORTAL decision`.

Where the provider signature cannot cover the request context, record that limitation explicitly. Do not silently upgrade response authenticity into call attribution.

## 5. Consequences for existing Arb implementation

1. **No immediate code change is required.** S1/W1/W2 remain read-only reference implementations, with no provider client, signer, submission path or live account connection.
2. Keep the documented limitation that `rawDigestRef` equality is not cryptographic verification. Do not change the current replay duplicate rule into an assertion that the referenced artifact was verified.
3. If a future slice adds receipts, first map the candidate package/API to the existing EXP-06 and EXP-12 contract fields. Prefer using an existing verifier implementation rather than reproducing its registry, signature parsing or commitment logic.
4. Keep response binding and call binding as separate result dimensions. A provider webhook may prove a response while leaving request attribution unresolved.
5. Keep the command-level read-only/no-actuation allowlist as a separate safety control. Substrate's opt-in mail-send chokepoint is not a drop-in authorization mechanism for arbitrary broker/exchange actions.
6. Any future command or receipt verifier must be independently tested against malformed inputs, prototype pollution, missing/null configuration, altered payloads, replay/call-binding mismatch and failure/timeout conditions.
7. Do not let a successful hook or verifier close D0/D1, grant Principal authority, qualify a provider, populate RiskBudget or authorize S2/S3.

## 6. Open issue / scope note

The reviewed GitHub window contains no open pull requests for the two repositories at the time of the check, but it does have open issue follow-ups: `fluxpoint-plugins` #232–#238 and `orynq-sdk` #226 were open. These are separate from the six commits and do not reverse the merged hardening. Treat the dev digest's "no open issues" line as requiring a narrower definition or correction; it is not supported as a repository-wide statement.

## 7. Sources

- [Substrate 1.10.3 commit](https://github.com/Flux-Point-Studios/fluxpoint-plugins/commit/24e42bc6d3f75528b9147f3b39c7dc8781b44360)
- [Substrate 1.10.4 merge commit](https://github.com/Flux-Point-Studios/fluxpoint-plugins/commit/d51204870c4ee4a219cd38fd91c03e4ec1931f3a)
- [Substrate PR #231](https://github.com/Flux-Point-Studios/fluxpoint-plugins/pull/231)
- [Substrate PR #239](https://github.com/Flux-Point-Studios/fluxpoint-plugins/pull/239)
- [Orynq PR #227](https://github.com/Flux-Point-Studios/orynq-sdk/pull/227)
- [Orynq response verifier implementation](https://github.com/Flux-Point-Studios/orynq-sdk/blob/4b01f21b16df98f73d5b104d0a379fea0197066b/packages/tool-receipts/src/verify.ts)
- [Orynq receipt-verification documentation](https://github.com/Flux-Point-Studios/orynq-sdk/blob/4b01f21b16df98f73d5b104d0a379fea0197066b/docs/anti-lie-tool-receipts.md)
- [Arb IMMORTAL hand-off crosswalk](IMMORTAL-HANDOFF-CROSSWALK.md)
- [Arb EXP ↔ Cardano Adapter crosswalk](IMMORTAL-CARDANO-EXP-ADAPTER-CROSSWALK-v0.1.md)
- [Arb W3 consumer mapping](W3-IMMORTAL-CONSUMER-MAPPING-v0.1.md)

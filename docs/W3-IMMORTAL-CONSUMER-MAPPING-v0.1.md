# W3 — IMMORTAL Consumer Mapping: EXP-03 / EXP-06 / EXP-10

**Revision:** 0.1 — 2026-11-04  
**Status:** implemented read-only consumer-readiness mapping; non-normative  
**Owner:** PRE-RICH AEP Arb Agent application edge  
**Canonical owner:** IMMORTAL owns all EXP semantics, qualifications, economic state, gates and authority rules

## 1. Decision

W3 maps the W2 Cardano wallet/pool identity result to existing IMMORTAL concepts. It does not claim that the W2 observation is an economically qualified asset, a verified position, a risk exposure or an admissible transition.

The output intentionally distinguishes:

- exact technical identity linkage;
- evidence that is structurally present but not yet qualified for economic use;
- asset eligibility/valuation/haircut/liquidity that has not been assessed;
- RiskBudget and exposure information that is absent;
- universal economic state and Economic Gate evaluation that have not been invoked.

The only positive claim W3 can make is **identity-only**: the W1 CIP-30 balance assertion reported an exact LP policy/name unit that matched one structurally qualified Minswap V2 Mainnet USDM pool candidate in the pinned IMMORTAL observer output.

## 2. Reused source contracts — no duplicate kernel

IMMORTAL remains the owner of the economic meaning:

| Existing source | Reusable meaning | W3 disposition |
|---|---|---|
| \`IMMORTAL/state/UniversalEconomicState.hs\` | Application-neutral aggregate of crystallised liabilities, unresolved reserve/count, worst-case exposure and protected components | Not constructed from wallet balances; W2 does not provide the required full economic state |
| \`IMMORTAL/kernel/UniversalEconomicKernel.hs\` | Existing ProtectedCapital, RawSurplus and solvency invariant | Not called; EEV and authoritative protected components are absent |
| \`IMMORTAL/kernel/EconomicGate.hs\` | Existing authoritative truth, fresh EEV, complete obligations and immediate liquidity gate | Not called; its booleans must be backed by real verification, not filled from W2 flags |
| \`IMMORTAL/kernel/RiskProtectionBridge.hs\` | Current deterministic PRE-RICH risk→protection bridge | Not reused for Arb; it imports the ticket-shaped \`EconomicProfile\`, requires profile/trajectory binding, and supports only the existing deterministic PRE-RICH mode |
| \`Adapter/CARDANO/observation/EconomicObservation.ts\` | Acceptance of an already-derived canonical economic state | Not applicable to raw wallet/LP balance data |
| \`Adapter/CARDANO/observation/ExecutableLiquidityObservation.ts\` | Exact consumed-input, spendable/non-ring-fenced UTxO observation | Not applicable to a CIP-30 aggregate LP token balance; it is a concrete liquidity witness, not a RiskBudget |
| \`Adapter/CARDANO/observation/CanonicalTransitionEvidence.ts\` | Binds canonical action, pre/post state and settlement transaction | No economic transition or settlement transaction exists in W2 |
| \`Adapter/CARDANO/runtime/EconomicAdmission.ts\` | Current Cardano admission witness for Issue/Reveal/Claim/Expire, including B1 PrizePool-specific fields | PRE-RICH-shaped; Arb action classes must not be added or relabelled here |

IMMORTAL current inspected baseline: branch \`work/immortal-green-closure\` at \`c00f5ade42bc7c509977bb247171f97d77cce57a\`. Source file hashes are recorded in the module and verified against GitHub. The Minswap observer itself is pinned separately to its immutable source commit and blob.

## 3. EXP-03 — asset identity is not economic eligibility or value

The W2 LP link is an exact Cardano native-asset identity:

\`policyId + assetNameHex\`

The mapped identity remains a raw wallet API quantity in LP token units. The pool datum's pair assets are carried as identities, not converted into values.

W3 keeps the IMMORTAL stages separate:

| Stage | W3 result | Why it cannot be promoted |
|---|---|---|
| Asset identity | \`EXACT_TECHNICAL_IDENTITY_ONLY\` when one W2 link exists | Exact policy/name equality and the existing Minswap structural decoder establish a technical link only |
| Eligibility | \`NOT_ASSESSED\` | No universal or selected Arb asset eligibility contract has qualified the LP token or pair assets |
| Valuation evidence | \`NOT_AVAILABLE\` | No admitted price/oracle path, valuation reference or valuation horizon is bound to the LP amount |
| Haircut policy | \`NOT_DECLARED\` | No authorized haircut model/version is selected |
| Executable value | \`NOT_DERIVED\` | LP token quantity is not a monetary value or executable liquidation amount |
| Immediate liquidity | \`NOT_OBSERVED\` | CIP-30 balance is not a spendable candidate-input witness; no slippage/depth/route/fee/finality proof exists |
| ProtectedCapital contribution | \`NOT_PROJECTED\` | A wallet token balance is not an obligation or protected-capital component |

The Minswap Pool UTxO's LP quantity is the remaining LP-token capacity retained by the pool contract. It is not circulating LP supply or an ownership-share denominator. W3 does not calculate pool share, reserve claim, USD value, APR, fee return, PnL or exposure.

## 4. EXP-06 — reuse existing evidence contracts, do not add another registry

The W2 result now carries:
- the exact immutable IMMORTAL observer source/schema pin;
- Koios query scope and exact USDM/address filters;
- page-count/completion metadata;
- the observer's SHA-256 response-body digests with their producing component identified;
- the pool UTxO reference, datum hash/CBOR and transaction block context;
- the CIP-30 source assertion, API version and observation time.

The wallet-side evidence still lacks a stable observation reference and evidence digest, and the Koios response hashes are collector-computed digests without an independent verifier attestation. The observer query is not bound to an explicit chain tip/header. Wallet and Koios observations remain non-atomic.

Therefore W3 reports \`UNVERIFIABLE_FOR_ECONOMIC_USE\`, not QUALIFIED. The current pool structural result \`MATCH\` remains a decoder/identity classification. It is not an EXP-06 economic evidence qualification or a price/currentness/oracle claim.

W3 maps into the existing evidence concepts; it does not create a second \`EvidenceQualification\`, source registry, signature service, currentness provider or authorization system.

## 5. EXP-10 — no RiskBudget or exposure can be inferred from W2

The current EXP-10 Arb research contract explicitly keeps:

\`RiskBudget ≠ RealizedExposure ≠ ProtectedCapital\`

Its small research predicate, \`RealizedExposure + RequestedExposure <= RiskBudget\`, is meaningful only with compatible declared measure, unit, scope and horizon. It does not supply a universal risk engine, issuer, exposure model, concurrency semantics or release rule.

The W2 LP quantity cannot populate any of these:

| EXP-10 dimension | Current W3 state |
|---|---|
| Budget identity/version | \`NOT_SUPPLIED\` |
| Principal and budget issuer authority | \`NOT_SUPPLIED\` |
| Account/strategy/asset/action scope | \`NOT_SUPPLIED\` |
| Risk measure and unit | \`NOT_SUPPLIED\` |
| Authorized limit | \`NOT_SUPPLIED\` |
| Horizon and model version | \`NOT_SUPPLIED\` |
| Validity and revocation state | \`NOT_SUPPLIED\` |
| RequestedExposure | \`NOT_DERIVED\` |
| RealizedExposure | \`NOT_DERIVED\` |
| ProtectedCapital | \`NOT_PROJECTED\` |
| RiskReservation | No universal IMMORTAL primitive is adopted; the Arb-side proposal remains non-normative and unimplemented |

The research predicate is therefore \`NOT_EVALUABLE\`. No zero budget, unlimited budget, budget reservation, risk capacity, surplus or protected capital is created by missing inputs.

## 6. Generic state, gate and Adapter mapping

W2 is not a canonical economic state and cannot populate the eight-field \`UniversalEconomicState\`. W3 explicitly disallows fallback to \`zeroUniversalEconomicState\`: absence of liabilities, EEV, reserves or obligations in W2 is absence of observation, not proof of zero.

The IMMORTAL Economic Gate is not invoked. W2 does not provide authoritative truth, fresh EEV, complete obligation coverage, candidate immediate liquidity or authoritative Ω/viability evidence. The gate's boolean input contract is not itself a verification mechanism.

The existing Cardano \`ExecutableLiquidityObservation\` requires exact candidate transaction inputs and spendable/non-ring-fenced UTxOs; the W2 wallet aggregate LP balance does not satisfy it. The current \`EconomicAdmissionWitness\` action union remains Issue/Reveal/Claim/Expire and B1 PrizePool-shaped. No Arb action class is introduced in W3.

## 7. W3 output and test evidence

Implementation:
- \`wallet-companion/immortal-exp-consumer-map.js\`
- \`test/immortal-exp-consumer-map.test.js\`

W2 provenance pass-through:
- \`wallet-companion/minswap-v2-position-link.js\`
- \`test/minswap-v2-position-link.test.js\`

The test suite covers exact identity-only mapping, raw LP quantity preservation, missing wallet digest and observation reference, pass-through of Koios body digests, unbound chain-tip/currentness, absent RiskBudget, no fabricated exposure/ProtectedCapital, no zero UniversalEconomicState fallback, and no Economic Gate invocation.

The mapping is a non-normative consumer-readiness report. It is not an IMMORTAL qualification, verifier attestation, economic decision, or trade authorization. No live wallet, Koios call or transaction is used in CI.

## 8. Completion boundary

W3 is complete as a consumer-side mapping/reference slice, not as complete EXP-03/06/10 implementation. Before W4 or any economic projection:
1. IMMORTAL must complete and version the missing generic eligibility/valuation/haircut, evidence-verification/currentness and RiskBudget contracts under the existing EXP workstream.
2. The relevant Cardano Adapter workstream must expose chain evidence/currentness and action-specific realization contracts without importing Arb strategy semantics.
3. Arb must bind an actual Principal/account perimeter, an authorized profile/mandate, complete source coverage and the approved risk measure/model.
4. A cross-application conformance packet must prove mapping to the existing UniversalEconomicState, EconomicGate, Ω/viability and composition contracts with no PRE-RICH compatibility leakage.

W3 does not authorize W4 signing/submission, S2 paper trading or S3 live execution. D0/D1 and the applicable D0–D8 gates remain open.

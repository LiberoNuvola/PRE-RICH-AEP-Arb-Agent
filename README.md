# PRE-RICH AEP Arb Agent — S1 Read-only Core + W1/W2 Cardano Companion (v0.2.x)

**Status:** the S1 reducer/replay core remains a synthetic-only reference implementation. An isolated W1 module adds user-authorized CIP-30 reads only. This repository is not a live trading agent, venue adapter, financial authority, economic kernel or production account observer.

## S1 scope

- Normalize synthetic observations only; no provider client exists.
- Require an explicit profile/version, source identifier, timezone-qualified source/receipt timestamps, and explicit instrument identity mapping.
- Pass through a provider source event ID only when present; do not synthesize source event references.
- Apply source/profile-supplied freshness and sequence semantics.
- Replay independent streams deterministically without inventing global causal order.
- Reject stale correction targets, ambiguous event identity reuse and fill-ID payload conflicts.
- Derive order/fill lifecycle and typed gross OpenExposure projections.
- Keep simulation distinct from realized state.
- Enforce a read-only capability allowlist and static no-actuation checks over all JavaScript files under src/ and wallet-companion/.

There are no credentials, direct network clients, exchange endpoints, signing/submission methods, order methods or actuator adapters in this package. W1 uses only an injected CIP-30 bridge for read-only wallet data. W2 consumes a serialized IMMORTAL Minswap V2 Mainnet USDM observation; it makes no Koios/Minswap network request and does not expose the wallet's full API.

## Run locally

Requirements: Node.js 22+ and Python 3.10+.

```bash
npm test
python -m pip install -r requirements.txt
python test/validate_schemas.py
```

GitHub Actions runs these checks on pushes, pull requests and manual dispatch.

## Evidence architecture and prior art

The [prior-art adaptation map](docs/PRIOR-ART-ADAPTATION.md) records what is reused or adapted from CloudEvents, W3C PROV-O, RFC 8785 JCS, DSSE and FIX.

The [contribution and novelty assessment](docs/CONTRIBUTION-AND-NOVELTY-ASSESSMENT.md) compares S1 with external prior art and then checks the idea against our own canonical IMMORTAL contracts. The [2026-11-04 security and verification prior-art addendum](docs/SECURITY-VERIFICATION-PRIOR-ART-ADDENDUM-2026-11-04.md) maps Substrate's opt-in command guard and Orynq's signed-response binding to EXP-06/12 without creating parallel Arb authority or evidence systems. The [IMMORTAL hand-off crosswalk](docs/IMMORTAL-HANDOFF-CROSSWALK.md) and [full cross-branch prior-art audit](docs/BRANCH-PRIOR-ART-AUDIT-2026-11-03.md) record prior work across all visible IMMORTAL, Arb and Cormia branches. This includes the IMMORTAL multi-oracle registry/currentness prototype, multi-venue source matrices, PRE-RICH ProtectedCapital item ledger, EXP-06/EXP-12 boundaries and Cormia's prior-art composition review. Arb must not create a duplicate evidence framework, price-feed registry, signature/currentness mechanism or economic gate. Its remaining candidate is provider-specific external broker/exchange account and trading-lifecycle observation/mapping. No originality or patentability claim is made.

The [provider-neutral adapter contract](docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md) defines the future read-only evidence boundary. Machine-readable starting points are [ProviderProfile schema](schemas/provider-profile.schema.json), [unselected ProviderProfile template](examples/provider-profile.template.json), [per-family collection coverage schema](schemas/collection-coverage.schema.json), and [synthetic coverage report](examples/collection-coverage.synthetic.json). The template is intentionally TEMPLATE_ONLY: provider, product, protocol and official documentation are unselected/unmapped.

The [account/trading lifecycle mapping matrix](docs/ACCOUNT-TRADING-LIFECYCLE-IMMORTAL-MAPPING-MATRIX-v0.1.md) compares balances, orders, fills, fees, positions, liabilities, transfers, collateral and settlement against existing IMMORTAL state aggregates and EXP boundaries. It records current schema gaps without adding a second ledger or selecting a provider. The [2026-11-04 provider API candidate assessment](docs/PROVIDER-API-CANDIDATE-ASSESSMENT-2026-11-04.md) compares official Binance Spot/Margin, Kraken Spot and Coinbase Advanced Trade documentation. Binance Spot is recommended only as the first synthetic profile candidate; no provider is selected or connected. The [Binance Spot read-only candidate endpoint mapping v0.1](docs/BINANCE-SPOT-READONLY-CANDIDATE-ENDPOINT-MAPPING-v0.1.md) pins the first USER_DATA/USER_STREAM operations, fields, identity, timestamp, pagination and reconciliation constraints; it remains documentation-only.\n\nThe [account/trading overlap and IMMORTAL reuse audit](docs/ACCOUNT-TRADING-OVERLAP-IMMORTAL-REUSE-AUDIT-v0.1.md) compares ProviderProfile, CollectionCoverage, ObservationRecord and OpenExposure against IMMORTAL's multi-venue source lineage, PRE-RICH item-ledger, R9/EV1–EV7 and EconomicAdmissionWitness. It confirms that Arb must not create a parallel evidence system, item ledger, oracle registry or admission witness; its residual candidate is provider-specific account/trading lifecycle collection and reconciliation.

## Cardano wallet companion and IMMORTAL adapter coverage

The [Cardano Wallet Companion architecture](docs/CARDANO-WALLET-COMPANION-ARCHITECTURE-v0.1.md) defines the non-custodial dApp boundary. W1 is an isolated [read-only CIP-30 port](wallet-companion/cip30-read-only.js). W2 adds a [consumer-side Minswap V2 LP-identity link](wallet-companion/minswap-v2-position-link.js) for the exact Mainnet USDM profile, consuming IMMORTAL's existing observer output. W3 adds a [non-normative EXP-03/06/10 consumer readiness mapping](wallet-companion/immortal-exp-consumer-map.js); it does not invoke the universal kernel or economic gate. See [W1](docs/W1-READINESS.md), [W2](docs/W2-READINESS.md) and [W3](docs/W3-IMMORTAL-CONSUMER-MAPPING-v0.1.md) readiness records. CI uses fixtures only; no live wallet or Koios query is performed.

The [IMMORTAL EXP ↔ Cardano Adapter crosswalk](docs/IMMORTAL-CARDANO-EXP-ADAPTER-CROSSWALK-v0.1.md) maps all twelve EXP axes to the existing Cardano Adapter boundary, identifies reusable implementation and states the generalized-contract gaps. The existing Cardano execution witness is still PRE-RICH-shaped; Arb must not relabel Issue/Reveal/Claim/Expire or duplicate the economic kernel. Any generalized Cardano Adapter implementation belongs in IMMORTAL's adapter workstream after the canonical EXP contracts are available.

## Multi-stream boundary

Each stream keeps its own cursor and event order. A gap/conflict blocks only that stream. Lexical sorting of result rows is presentation canonicalization only, not causal ordering. With multiple streams, composition remains COMPOSITION_UNRESOLVED until an explicit Composition Contract X1–X7 witness exists; this package does not implement that witness or aggregate stream state. Every stream must have its own matching initial checkpoint in the replay manifest.

## Order and fill lineage

A correction may supersede only an event that is currently active in its stream projection. Exact replay duplicates are no-ops only when event ID, source/stream/sequence identity and raw digest reference match. A fill is countable only with fill ID, quantity and raw digest reference. A repeated fill ID with a different quantity or raw digest reference is a conflict. The digest reference is not cryptographically recomputed or verified by this package.

## OpenExposure boundary

Gross records retain their own record, category, asset, unit, scope, horizon, status and evidence references. No scalar aggregation, conversion, netting, novation, ownership rewrite, valuation or admission is performed. Empty input means INCOMPLETE, not zero exposure.

## IMMORTAL EXP constraints

EXP-03 keeps asset identity/eligibility distinct from valuation, haircut, liquidity and ProtectedCapital. EXP-07 observations cannot override a controller or introduce thresholds. EXP-08 preserves gross obligations without implicit netting. EXP-09 does not infer novation from owner changes. EXP-10 keeps RiskBudget, RealizedExposure and ProtectedCapital distinct. EXP-12 separates observer, verifier and authority.

## Readiness

S1/W1/W2 are read-only reference implementations with synthetic conformance evidence only. The W2 Minswap profile is Mainnet + exact USDM and does not prove live pool currentness or complete DeFi coverage. D0 Principal/financial authority and D1 Solo account/resource isolation remain open. This package does not authorize S2 paper trading or S3 live execution. See [S1 Readiness](docs/S1-READINESS.md), the [focused adversarial review](docs/S1-ADVERSARIAL-REVIEW.md), the [provider-neutral evidence adapter contract](docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md), the [prior-art adaptation map](docs/PRIOR-ART-ADAPTATION.md), and the [contribution and novelty assessment](docs/CONTRIBUTION-AND-NOVELTY-ASSESSMENT.md). No provider profile, live adapter, account connection or provider conformance is implemented.

Provider observation reconciliation boundary: [contract v0.1](docs/OBSERVATION-RECONCILIATION-CONTRACT-v0.1.md) defines scoped provider identity, immutable evidence preservation, MATCHED/INCOMPLETE/CONFLICTED outcomes, and the adapter-before-reducer boundary. Design-only; no provider client or live integration.


## W1 desktop browser extension

The installable desktop pilot is a Manifest V3 [Chromium extension](browser-extension/manifest.json) for Chrome and Edge. Build it with `npm run build:extension`; the output is `dist/arb-agent-chromium.zip`. Install locally through the browser's **Load unpacked** developer-mode flow. It reuses the existing W1 CIP-30 port and Cardano Value decoder. The extension asks only for `activeTab` and `scripting`, has no persistent host permissions, and performs no signing or submission. Its wallet connection is made from the active page origin, so use only a trusted page; see the [installation and security boundary](docs/BROWSER-EXTENSION-INSTALLATION.md). The CI workflow uploads the generated ZIP as a downloadable build artifact. This is a local pilot, not a signed Web Store release.

## W1 PWA shell

The static [W1 Wallet Companion PWA](app/index.html) remains a browser/mobile-WebView prototype and development surface. Serve the repository root with `npm run serve:w1` and open `http://localhost:4173/app/`. It wraps the same read-only CIP-30 port without changing its semantics. The browser wallet must inject CIP-30 into the page origin and the app must be served from a secure context (localhost is suitable for local testing). The PWA shell has no RPC, indexer, exchange, credential, signing or transaction-submission integration. Its service worker caches only the static app shell; it does not persist wallet observations or promise offline wallet access. It is not a native Android/iOS application.
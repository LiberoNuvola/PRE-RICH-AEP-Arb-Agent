# PRE-RICH AEP Arb Agent — S1 Read-only Reference (v0.2.x)

**Status:** isolated reference implementation for the S1 research gate. This package is read-only and synthetic-only. It is not a live trading agent, venue adapter, financial authority, economic kernel or production account observer.

## S1 scope

- Normalize synthetic observations only; no provider client exists.
- Require an explicit profile/version, source identifier, timezone-qualified source/receipt timestamps, and explicit instrument identity mapping.
- Pass through a provider source event ID only when present; do not synthesize source event references.
- Apply source/profile-supplied freshness and sequence semantics.
- Replay independent streams deterministically without inventing global causal order.
- Reject stale correction targets, ambiguous event identity reuse and fill-ID payload conflicts.
- Derive order/fill lifecycle and typed gross OpenExposure projections.
- Keep simulation distinct from realized state.
- Enforce a read-only capability allowlist and static no-actuation checks over all JavaScript files under src.

There are no credentials, network clients, exchange endpoints, wallet operations, order methods or actuator adapters in this package.

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

The [contribution and novelty assessment](docs/CONTRIBUTION-AND-NOVELTY-ASSESSMENT.md) compares S1 and its proposed economic hand-off with trading reconciliation, account snapshots, stream processing, proof-of-solvency systems, provenance/attestation, zero-trust authorization and financial netting. It explicitly distinguishes established prior art from a still-unproven research hypothesis: a decision-specific evidence-to-economic-admission boundary. No originality or patentability claim is made.

The [provider-neutral adapter contract](docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md) defines the future read-only evidence boundary. Machine-readable starting points are [ProviderProfile schema](schemas/provider-profile.schema.json), [unselected ProviderProfile template](examples/provider-profile.template.json), [per-family collection coverage schema](schemas/collection-coverage.schema.json), and [synthetic coverage report](examples/collection-coverage.synthetic.json). The template is intentionally TEMPLATE_ONLY: provider, product, protocol and official documentation are unselected/unmapped.

## Multi-stream boundary

Each stream keeps its own cursor and event order. A gap/conflict blocks only that stream. Lexical sorting of result rows is presentation canonicalization only, not causal ordering. With multiple streams, composition remains COMPOSITION_UNRESOLVED until an explicit Composition Contract X1–X7 witness exists; this package does not implement that witness or aggregate stream state. Every stream must have its own matching initial checkpoint in the replay manifest.

## Order and fill lineage

A correction may supersede only an event that is currently active in its stream projection. Exact replay duplicates are no-ops only when event ID, source/stream/sequence identity and raw digest reference match. A fill is countable only with fill ID, quantity and raw digest reference. A repeated fill ID with a different quantity or raw digest reference is a conflict. The digest reference is not cryptographically recomputed or verified by this package.

## OpenExposure boundary

Gross records retain their own record, category, asset, unit, scope, horizon, status and evidence references. No scalar aggregation, conversion, netting, novation, ownership rewrite, valuation or admission is performed. Empty input means INCOMPLETE, not zero exposure.

## IMMORTAL EXP constraints

EXP-03 keeps asset identity/eligibility distinct from valuation, haircut, liquidity and ProtectedCapital. EXP-07 observations cannot override a controller or introduce thresholds. EXP-08 preserves gross obligations without implicit netting. EXP-09 does not infer novation from owner changes. EXP-10 keeps RiskBudget, RealizedExposure and ProtectedCapital distinct. EXP-12 separates observer, verifier and authority.

## Readiness

S1 is a candidate read-only implementation with synthetic conformance evidence only. D0 Principal/financial authority and D1 Solo account/resource isolation remain open. This package does not authorize S2 paper trading or S3 live execution. See [S1 Readiness](docs/S1-READINESS.md), the [focused adversarial review](docs/S1-ADVERSARIAL-REVIEW.md), the [provider-neutral evidence adapter contract](docs/PROVIDER-EVIDENCE-ADAPTER-CONTRACT.md), the [prior-art adaptation map](docs/PRIOR-ART-ADAPTATION.md), and the [contribution and novelty assessment](docs/CONTRIBUTION-AND-NOVELTY-ASSESSMENT.md). No provider profile, live adapter, account connection or provider conformance is implemented.

# PRE-RICH AEP Arb Agent — S1 Read-only Reference (v0.2.0)

**Status:** isolated reference implementation for the S1 research gate. This package is read-only and synthetic-only. It is not a live trading agent, venue adapter, financial authority, economic kernel or production account observer.

## S1 scope

- Normalize externally supplied observations; current package consumes fixtures only and has no provider client.
- Apply source/profile-supplied freshness and sequence semantics.
- Replay independent streams deterministically without inventing global causal order.
- Derive order/fill lifecycle and typed gross OpenExposure projections.
- Keep simulation distinct from realized state.
- Enforce a read-only capability allowlist and no-actuation checks.

There are no credentials, network clients, exchange endpoints, wallet operations, order methods or actuator adapters in this package.

## Run locally

Requirements: Node.js 22+ and Python 3.10+.

```bash
npm test
python -m pip install -r requirements.txt
python test/validate_schemas.py
```

GitHub Actions runs these checks on pushes, pull requests and manual dispatch.

## Multi-stream boundary

Each stream keeps its own cursor and event order. A gap/conflict blocks only that stream. Lexical sorting of result rows is presentation canonicalization only, not causal ordering. With multiple streams, composition remains `COMPOSITION_UNRESOLVED` until an explicit Composition Contract X1–X7 witness exists; this package does not implement that witness or aggregate stream state.

## OpenExposure boundary

Gross records retain their own record, category, asset, unit, scope, horizon, status and evidence references. No scalar aggregation, conversion, netting, novation, ownership rewrite, valuation or admission is performed. Empty input means `INCOMPLETE`, not zero exposure.

## IMMORTAL EXP constraints

EXP-03 keeps asset identity/eligibility distinct from valuation, haircut, liquidity and ProtectedCapital. EXP-07 observations cannot override a controller or introduce thresholds. EXP-08 preserves gross obligations without implicit netting. EXP-09 does not infer novation from owner changes. EXP-10 keeps RiskBudget, RealizedExposure and ProtectedCapital distinct. EXP-12 separates observer, verifier and authority.

## Readiness

S1 is a candidate read-only implementation. D0 Principal/financial authority and D1 Solo account/resource isolation remain open. This package does not authorize S2 paper trading or S3 live execution. See [`docs/S1-READINESS.md`](docs/S1-READINESS.md) for invariants and exit criteria.
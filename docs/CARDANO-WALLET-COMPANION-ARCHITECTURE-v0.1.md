# Cardano Wallet Companion Architecture v0.1

**Date:** 2026-11-03  
**Status:** W1 read-only reference implementation plus non-normative integration architecture  
**Target workstream:** PRE-RICH AEP Arb Agent  
**Repository baseline:** `Immortal-Protocol` at `7305f8027eb765d051403c5ac31a90dd2170fc6c`  
**IMMORTAL Cardano source inspected:** `work/immortal-green-closure` at `2746652cb0fe327720fc66fe981eb355811bff9c`  
**Change scope:** W1 adds an isolated, mocked-and-tested CIP-30 read-only port in Arb. No live user wallet was connected by CI. Signing, submission, credentials, provider RPC clients, mandate, deployment and live trading are not implemented or authorized.

## 1. Decision under evaluation

Position Arb as a **wallet companion / financial intelligence layer**, not as a new custodial wallet.

For the first Cardano profile, Arb should connect to an existing user-controlled wallet through the standard Cardano dApp-wallet bridge, read the wallet's explicitly exposed state, combine it with independently collected ledger and protocol observations, and present evidence-backed portfolio and candidate views.

The existing IMMORTAL Cardano Adapter remains the shared Cardano translation, observation and realization boundary. Arb consumes its contracts and contributes application-specific intent, strategy and lifecycle projections. It must not fork the adapter or reproduce IMMORTAL economic semantics.

This proposal deliberately uses the term **Wallet Companion**, not "plugin installed inside every wallet". CIP-30 standardizes a webpage/dApp interface to browser wallets. A companion dApp or PWA can use that interface. An embedded extension inside a wallet's own UI would require wallet-vendor-specific integration or adoption and is not implied by CIP-30.

## 2. Correct system boundary

```text
Principal / wallet owner
   │
   │ connects and retains signing control
   ▼
Existing Cardano wallet (CIP-30 provider)
   │  addresses · network · wallet-controlled UTxOs
   │  user-approved signatures
   ▼
Arb Wallet Companion
   ├── Wallet session / capability negotiation
   ├── Wallet-scoped observation
   ├── Cardano ledger and protocol observers
   ├── Candidate / strategy / portfolio projection
   └── IMMORTAL consumer interface
          │
          ▼
IMMORTAL — universal EXP semantics and economic authority
          │
          ▼
IMMORTAL Cardano Adapter — translate · observe · realize · report
          │
          ▼
Cardano ledger / contracts / DEX venues
```

The diagram separates logical responsibilities; it does not prescribe deployment topology or a new universal runtime.

### Ownership matrix

| Concern | Owner | Explicit non-ownership |
|---|---|---|
| Private keys, seed, wallet authorization UI | Existing wallet | Arb does not import, store, derive or export signing secrets |
| Principal identity and economic rights | Principal and independently grounded authority/evidence model | Wallet connection or key control alone is not a universal ownership proof |
| Wallet connection and wallet-scoped reads | CIP-30 bridge / wallet provider | Does not prove complete account or DeFi coverage |
| Cardano ledger facts and transaction realization | IMMORTAL Cardano Adapter | Adapter does not decide economic admissibility |
| Generic obligations, exposure, ProtectedCapital, RawSurplus, Ω, viability and economic gate | IMMORTAL | Arb and adapter do not duplicate the kernel |
| Strategy, candidate, order/position lifecycle projection | Arb application/profile | Strategy output is not authority or verified execution |
| Task execution, workspace, general agent lifecycle | Cormia Runtime when integrated | Cormia Project Mandate does not grant financial trading authority |

The boundary is consistent with the IMMORTAL–Cormia EXP crosswalk and the AEP–IMMORTAL jurisdiction proposal: Cormia owns work/task semantics; IMMORTAL governs economic effects only when the task/profile enters an IMMORTAL economic perimeter; adapters realize admitted transitions.

## 3. What CIP-30 provides — and what it does not

CIP-30 is an injected JavaScript bridge from a webpage/dApp to a Cardano wallet. The dApp discovers `window.cardano`, requests `enable()`, and receives the wallet API after the wallet grants connection access.

The base interface is suitable for the first companion slice:

- wallet provider identity and API version;
- selected account addresses;
- network identifier;
- wallet-controlled UTxOs and balance;
- transaction signing through the wallet;
- data/message signing through the wallet;
- transaction submission where supported by the wallet API.

The CIP-30 specification requires informative user consent for every `signTx()` and `signData()` call. The wallet retains private-key material. A connected read session is not a standing financial delegation.

### Important coverage limit

CIP-30 is not a complete account-history, exchange-account or DeFi-position API.

In particular:
- `getUtxos()` concerns UTxOs controlled by the connected wallet. It does not enumerate arbitrary UTxOs held at DEX validator addresses merely because the user has an economic interest in a pool or order.
- A wallet balance does not reconstruct all LP positions, open DEX orders, pending fills, protocol liabilities, collateral relationships or settlement claims.
- DeFi positions must be discovered from chain/protocol state and source-specific observers, then linked to the wallet through exact asset, address, datum, credential and transaction evidence where the protocol supports that relationship.
- A wallet address or signing key is not automatically proof of beneficial ownership, shared-resource exclusivity or Principal authority.
- A third-party indexer response is an observation; it is not, by itself, a complete or authoritative account statement.

Therefore the first companion requires both a wallet bridge and read-only chain/protocol observers. The wallet is the user's entry point and signing boundary, not the sole source of truth for all financial state.

## 4. CIP capability negotiation and implementation constraints

CIP-30 supports extension negotiation at connection time. The companion must inspect the wallet's advertised and enabled extensions and select a capability path explicitly. It must not assume that every wallet implements every extension.

| Standard | Current status in the Cardano CIP register | Arb disposition |
|---|---|---|
| CIP-30 | Active | Required baseline for the first browser-wallet companion |
| CIP-95 | Active | Optional only if governance-related wallet data becomes relevant; not required for portfolio observation |
| CIP-103 | Active | Optional bulk transaction signing/submission; useful for UX, not autonomous authority |
| CIP-104 | Proposed | Do not require or request the account extended public key by default; it grants broad read access to derivation paths/history and is not needed for the first slice |
| CIP-106 | Proposed | Treat multisig support as a separate capability profile; its proposed API changes signing behavior and disables base `signTx()` / `signData()` while enabled |

CIP-103's bulk signing endpoint is a batch UX mechanism. The specification expects wallets to give users visibility and an overview of the transactions to be signed. It does **not** establish an unattended standing mandate or a background execution right.

CIP-104's account public key endpoint, where implemented, can expose complete account derivation/history read access. Its use needs explicit additional user consent and a separate privacy decision. Arb does not need it for the initial design.

CIP-106 is a proposed multisig-wallet extension, not a universal CIP-30 capability. Its behavior must not be assumed for ordinary wallets or for the first Solo profile.

## 5. Session, network and evidence rules

The companion must treat a wallet connection as a revocable, changing session.

1. Discover providers and request `enable()` only after an explicit user action.
2. Read the actual enabled extensions and current network/account context.
3. Record the connected provider, wallet session generation, selected account references, observation time and source references.
4. Revalidate the session before any fresh wallet read or user-signing request.
5. On account change, network change, disconnect, provider refusal or malformed response, invalidate the affected session-derived observations and require fresh reads.
6. Never reuse a snapshot across account or network changes.
7. Pin the expected Cardano environment independently of the wallet's coarse network identifier.

**Network warning:** CIP-30 `getNetworkId()` distinguishes mainnet from testnet-level network IDs (commonly 1 and 0); it does not by itself distinguish Preprod from Preview. The existing IMMORTAL DApp wallet wrapper is configured for Preprod and currently checks for network ID 0. That check is necessary but not sufficient to prove the exact test network. An exact environment binding must also come from the configured trusted chain/provider context (for example, a verified genesis/network identity or an equally explicit network profile). Do not label any network ID 0 session "Preprod" without that independent binding.

Wallet observations must preserve:
- exact address bytes and network identity;
- exact UTxO reference (`txHash#outputIndex`);
- asset unit as policy ID + asset name, not ticker or display symbol;
- raw transaction/datum/CBOR references where available;
- source and receipt timestamps separately;
- pagination/cursor completeness and omissions;
- provider, API and profile versions;
- explicit `UNKNOWN`, `INCOMPLETE`, `UNVERIFIED` or `CONFLICT` states where required.

Missing data is not zero, flat, empty exposure or proof of absence.

## 6. Transaction path: preserve wallet custody

For an interactive companion transaction, the intended sequence is:

```text
Arb candidate / application intent
       ↓
IMMORTAL economic evaluation and applicable gate
       ↓
IMMORTAL Cardano Adapter translates admitted requirements
       ↓
Adapter builds and validates a concrete Cardano transaction candidate
       ↓
Connected wallet receives the signing request
       ↓
Wallet presents the transaction and obtains user consent
       ↓
Wallet signs; transaction is submitted through the selected provider path
       ↓
Cardano Adapter / independent observer records chain result
       ↓
IMMORTAL revalidates the observed transition and evidence
       ↓
Arb updates its application-level order/position projection
```

The exact signing/submission port is an implementation choice for the IMMORTAL Adapter and selected Lucid/CIP-30 integration. Arb must not introduce a parallel signing library, secret store, seed importer or transaction submitter.

A wallet signature proves that the wallet authorized that transaction according to its signing interface. It does not prove that:
- the transaction is economically admissible;
- the transaction settled the intended obligation;
- the transaction belongs to the correct Arb Principal;
- the source data was complete;
- an order or multi-leg strategy completed atomically.

The adapter/ledger observation path must separately bind intended action, actual transaction body, consumed inputs, output state, datum/redeemer path, validity interval, fees, network and post-state evidence.

## 7. Autonomous execution is a later, separate capability

CIP-30 must not be reinterpreted as persistent background authorization.

The existing IMMORTAL Arb research contracts already distinguish:
- Principal authority credential;
- mandate issuance and revocation authority;
- Arb Mandate verifier;
- technical execution credential;
- economic admission producer / IMMORTAL gate;
- actuator adapter and independent observer/reconciler.

The Principal's authority credential must remain outside the Arb execution process. A future standing mandate may authorize repeated bounded actions without a fresh human approval for every order, but it requires a distinct execution capability that cannot issue, amend or revoke the mandate, change ownership, expand account/asset/action scope or replenish its own RiskBudget.

That future mode requires the already-recorded D0–D8 gates, including Principal/economic-rights evidence, account binding and Solo isolation, mandate status/revocation, provider/venue lifecycle evidence, asset/time profile, authorized RiskBudget, complete OpenExposure projection, Composition Contract X1–X7 where applicable, and reproducible adversarial conformance.

No execution credential, key/custody product, session-key design or actuator is selected by this document.

## 8. Reuse of existing Cardano work

The companion should reuse, not duplicate:

- `src/wallet.ts` for the existing CIP-30/Lucid discovery/session pattern, subject to the exact-network correction above;
- `Adapter/CARDANO/runtime/CardanoExecutionAdapter.ts` for the existing Cardano execution boundary;
- `Adapter/CARDANO/runtime/EconomicAdmission.ts` and its witness-validation pattern, without pretending the current PRE-RICH-shaped witness is a universal trading contract;
- `ExecutableLiquidityObservation` for exact consumed-input/liquidity binding where its current semantics apply;
- `EconomicObservation`, `CardanoObservedTransitionEvidence`, `CanonicalTransitionEvidence` and `EconomicAdmissionTransitionBinding` for the observation-to-transition evidence distinction;
- existing read-only DEX observers in IMMORTAL `work/immortal-green-closure` for source-specific Cardano venue research, subject to their stated asset/network/protocol scope;
- the existing multi-oracle registry/currentness work and EXP-06/EXP-12 contracts rather than a new Arb oracle registry, signature system or generic evidence-authority layer.

Current DEX collectors and the current Cardano execution path are not interchangeable: read-only pool discovery is not an order adapter, a pool observer is not a wallet position index, and an execution adapter is not an economic kernel.

## 9. First implementation stages

| Stage | Scope | Exit evidence | Explicitly excluded |
|---|---|---|---|
| W0 — contract design | This architecture and the EXP/Cardano adapter crosswalk | Source-backed ownership and gap matrix | No provider connection, wallet call or code change |
| W1 — wallet read-only companion | **Implemented reference slice:** injected CIP-30 discovery, explicit enable, account/network fingerprint check, raw balance and unpaginated wallet UTxO read | Mocked-provider tests, account-change/refusal invalidation, null-vs-empty handling, testnet-variant unresolved, static no-actuation scan | No signing call, transaction submission, mandate, provider write key, RPC client or live wallet connection |
| W2 — Cardano protocol observation | Reuse one existing read-only Cardano venue observer and independently bind wallet-held assets/position claims | Exact asset identity, datum/UTxO provenance, coverage, freshness, unknown-state and replay tests | No DEX orders, no automatic trading, no inferred complete portfolio |
| W3 — IMMORTAL consumer mapping | Map observations to existing EXP contracts, generic state/kernel/gate interfaces and adapter evidence | Field-by-field conformance packet and no-duplicate-kernel review | No parallel ProtectedCapital, Ω, netting, novation, risk-budget or authority engine |
| W4 — interactive transaction proposal | Construct a candidate through the IMMORTAL Adapter and request a user-visible wallet signature | Transaction-intent/body binding, user refusal handling, actual submission and post-state reconciliation tests | No unattended execution |
| W5 — bounded delegated execution | Separate authority key, standing mandate and constrained execution capability | D0–D8 closed for a selected Solo profile and venue, plus revocation/recovery and security evidence | No implicit multi-Principal/Pool support |

W1 is implemented as an isolated read-only reference port under wallet-companion/; its precise scope and limitations are recorded in [W1 Readiness](W1-READINESS.md). It has not been exercised against an actual user wallet or deployed PWA. W2 remains unselected and unimplemented. W4 is not authorized merely because W1/W2 pass. W5 is a distinct future assurance gate.

## 10. Design conclusions

1. Build a Cardano Wallet Companion dApp/PWA using CIP-30; do not build a new custodial wallet or assume a plugin can be embedded in arbitrary wallets.
2. Keep the wallet as the user's key custodian and signer.
3. Use the Cardano Adapter as the shared IMMORTAL chain boundary; expand that adapter's capability/contracts for generalized EXP consumers rather than forking it in Arb.
4. Combine wallet reads with independent chain/protocol observations; never call a wallet-only balance a complete DeFi portfolio.
5. Keep Principal, economic rights, account control, mandate, execution capability and IMMORTAL economic admission as distinct claims.
6. Treat CIP-103 as batch UX, not standing autonomy. Treat CIP-104 and CIP-106 as optional/proposed capability paths.
7. Do not enable signing, submissions or autonomous trading until the separately specified gates close.

## Sources

### Internal architecture and source
- [IMMORTAL–Cormia EXP Generalization Crosswalk v1.0](https://app.notion.com/p/40cc4454d6d581b1b4cac0eb7468d1c2)
- [AEP–IMMORTAL Economic Jurisdiction & EXP Conformance](https://app.notion.com/p/40cc4454d6d5813491bcc68d88bef279)
- [IMMORTAL master EXP / Arb consumer contracts](https://app.notion.com/p/3e3c4454d6d58136a85cfcdbc0e287f3)
- [Cardano Adapter Specification](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/docs/ADAPTER-SPECIFICATION.md)
- [Cardano Adapter complete system specification](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/docs/CARDANO-ADAPTER-COMPLETE-SYSTEM-SPECIFICATION.md)
- [Existing wallet connector](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/src/wallet.ts)
- [Current Cardano execution adapter](https://github.com/LiberoNuvola/Immortal-Protocol/blob/work/immortal-green-closure/Adapter/CARDANO/runtime/CardanoExecutionAdapter.ts)

### Cardano standards
- [CIP-30 — Cardano dApp-Wallet Web Bridge](https://cips.cardano.org/cip/CIP-30)
- [CIP-30 accepted extensions register](https://cips.cardano.org/cip/CIP-30/annex/extensions-register)
- [CIP-95 — Web-Wallet Bridge, Conway era](https://cips.cardano.org/cip/CIP-95)
- [CIP-103 — Bulk transaction signing](https://cips.cardano.org/cip/CIP-103)
- [CIP-104 — Account public key (Proposed)](https://cips.cardano.org/cip/CIP-104)
- [CIP-106 — Multisig wallet bridge (Proposed)](https://cips.cardano.org/cip/CIP-106)
- [Cardano Developer Portal — Connect a Wallet](https://developers.cardano.org/docs/developers/curriculum/dapps/connect-a-wallet/)

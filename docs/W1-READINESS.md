# W1 — Cardano Wallet Companion Read-only Readiness

**Revision:** 0.1 — 2026-11-03  
**Status:** read-only reference slice plus initial static PWA shell; not deployed and no live user wallet has been connected by CI  
**Owner:** PRE-RICH AEP Arb Agent application edge  
**Boundary:** CIP-30 read-only port only; IMMORTAL Cardano Adapter and economic kernel unchanged

## 1. W1 implementation

The isolated module at wallet-companion/cip30-read-only.js provides:

- provider discovery from an injected CIP-30 namespace;
- explicit enable() connection, invoked only when its caller calls connectReadOnlyWallet;
- an allowlisted read facade for getNetworkId, getChangeAddress, getBalance and getUtxos;
- a wallet snapshot preserving the provider's raw CBOR strings;
- session invalidation on CIP-30 AccountChange (-4), access refusal (-3), explicit local close, malformed responses, or a changed before/after account fingerprint;
- a timezone-qualified observedAt supplied by the caller, not generated from an assumed local clock.

The module does not read window, persist sessions, start background polling, make HTTP/RPC calls, or expose the complete wallet API object to consumers.

## 2. Strict read-only capability surface

Only these provider operations are invoked:

| Operation | Purpose |
|---|---|
| enable() | User-approved dApp connection; caller must invoke from an explicit user action |
| getNetworkId() | Coarse network identifier |
| getChangeAddress() | Read-only account fingerprint component |
| getBalance() | Raw CBOR value returned by the wallet |
| getUtxos() | Wallet-controlled UTxOs returned by the wallet |

No optional CIP extensions are requested. CIP-103 batch signing is not used. No wallet mutation, signing, transaction submission, transfer, withdrawal, order, or actuator operation is implemented.

## 3. Evidence and completeness limits

- CBOR values are preserved as hex strings and are not decoded, converted, valued, or summed.
- The UTxO query uses one unpaginated response. null is UNKNOWN_NULL_RESPONSE, not an empty result.
- An empty UTxO array is scoped only to the wallet-controlled UTxO query. It says nothing about contract-held UTxOs, LP positions, DEX orders, liabilities, settlement, or DeFi completeness.
- The snapshot is NON_ATOMIC_CROSS_METHOD_OBSERVATION; CIP-30 does not provide a shared atomic snapshot token for the separately read account, balance and UTxO methods.
- Raw CBOR is not cryptographically re-hashed or independently verified by this module.
- getNetworkId() === 0 means testnet-level only. Exact Preprod/Preview identity remains unresolved without an independent trusted network binding.
- getNetworkId() === 1 is labelled MAINNET according to CIP-30, not as independent verification of the provider's honesty.
- The change-address/network fingerprint is a session consistency check, not proof of Principal identity, beneficial ownership or exclusive control.

## 4. Authority exclusions

Every snapshot explicitly leaves these claims unestablished:

- Principal binding and account ownership;
- financial mandate and delegated execution capability;
- RiskBudget, RealizedExposure and ProtectedCapital;
- economic admission and settlement;
- complete DeFi position, order or liability coverage.

The wallet remains key custodian. This implementation neither requests nor receives signing capability.

## 5. Test coverage

test/cip30-read-only.test.js covers provider discovery, explicit connection, read-only facade, CBOR preservation, unknown testnet variant, empty versus null UTxO response, account/network fingerprint changes, CIP-30 error handling, timestamp validation and local session closure.

test/no-actuation.test.js scans both src/ and wallet-companion/ and rejects network transports, server/process/environment-secret APIs, mutating order/asset methods and CIP-30 signing/submission method names.

The GitHub Actions workflow remains read-only (contents: read). CI uses mocked providers only; it does not connect to an actual wallet.

## 6. Exit and next boundary

W1 is a narrow reference implementation, not a complete wallet UI, network verifier, ledger indexer or portfolio engine. It is suitable for an isolated integration review and synthetic conformance. Before W2, select an exact Cardano network identity and a specific read-only protocol observer, then prove wallet-to-protocol position linkage and per-family coverage without mixing environments.

W1 passing does not authorize W2 protocol integration automatically, W4 signing, S2 paper trading or S3 live execution. D0/D1 and the applicable D0–D8 authority/recovery gates remain separate.


## 7. Initial PWA shell (2026-11-04)

The static UI in `app/` composes the existing W1 port and the existing CBOR value decoder. It provides provider discovery, an explicit user-click connection, manual refresh, local session close, raw lovelace/native-asset quantities, wallet UTxO response count, and visible evidence/coverage limitations.

- No framework, runtime dependency, provider RPC, indexer, API client, backend, credential store or new economic logic is introduced.
- The app reads `window.cardano` only at the application edge; the W1 module remains dependency-injected and browser-global-free.
- `enable()` is reached only from the Connect button handler. Refresh calls only the existing W1 read facade.
- The UI does not decode addresses, convert token decimals, price assets, aggregate portfolio value, infer LP positions or invoke the W3 economic consumer mapping.
- The service worker caches the static shell only. It does not store wallet data or provide offline wallet reads.
- The content security policy limits connections to the same origin. The app contains no remote provider endpoints or transaction-signing/submission calls.
- `test/w1-pwa-shell.test.js` checks the shell contract; `test/no-actuation.test.js` now scans `app/` as well as `src/` and `wallet-companion/`.

This is an initial PWA-style shell (manifest and service worker), not a deployment or security certification. Browser-specific installation eligibility and compatibility with every wallet/browser have not yet been verified. The next gate is local browser verification with a real CIP-30 wallet, followed by a controlled hosted test. Exact Preprod/Preview binding and W2's live observer remain unresolved; no live DeFi or economic projection is presented.

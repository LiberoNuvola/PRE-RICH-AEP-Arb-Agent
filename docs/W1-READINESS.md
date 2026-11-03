# W1 — Cardano Wallet Companion Read-only Readiness

**Revision:** 0.1 — 2026-11-03  
**Status:** implemented reference slice; not a deployed PWA and no user wallet has been connected by CI  
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

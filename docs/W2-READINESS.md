# W2 — Minswap V2 Mainnet USDM Wallet-Link Readiness

**Revision:** 0.1 — 2026-11-03
**Status:** implemented consumer-side conformance slice; not a live wallet or current-pool qualification
**Owner:** PRE-RICH AEP Arb Agent application edge
**Upstream observer owner:** IMMORTAL Cardano Adapter/evidence workstream
**Boundary:** read-only evidence mapping only; IMMORTAL source remains unchanged

## 1. Selected W2 scope

W2 consumes the existing IMMORTAL observer:

- Repository: LiberoNuvola/Immortal-Protocol
- Branch: work/immortal-green-closure
- Pinned commit: ebca6c139e489bacaddcb6e0ae90b40e974b20da
- Source: scripts/observeMinswapV2UsdmUtxosReadOnly.mjs
- Source blob: 25419945ab4a2359b5a8f57a6b97af4472f5aa0f
- Output schema: immortal-minswap-v2-usdm-utxo-observation-v2

The observer is a Koios read-only Mainnet query for exact Moneta USDM candidates at the deployed Minswap V2 pool validator address. Its own output separates structural pool identity/reserve checks from oracle qualification. W2 does not import, copy, execute or modify the observer; it consumes the observer's serialized output.

This first profile is intentionally narrow: Minswap V2 Mainnet pools containing the exact USDM asset unit. It is not an all-Cardano portfolio or all-Minswap pool scanner.

## 2. What the W2 mapper does

wallet-companion/minswap-v2-position-link.js:

1. Validates the W1 CIP-30 snapshot and requires network ID 1 (Mainnet).
2. Decodes only the CIP-30 getBalance() CBOR Value forms needed for lovelace and multiasset balances.
3. Preserves raw token quantities as decimal integer strings; exact asset identity is policy ID + asset-name bytes.
4. Validates the pinned IMMORTAL observer schema, exact USDM filter, Mainnet pool validator identity, successful request evidence and complete Koios pagination.
5. Accepts only candidates already marked MATCH by the existing IMMORTAL PoolDatum/NFT/reserve decoder.
6. Links an exact wallet LP token unit only when one unique structurally qualified pool candidate has the same LP policy ID and asset name.
7. Preserves unlinked wallet LP units and ambiguous pool matches rather than guessing.

It uses no network, RPC, indexer, Minswap endpoint, credential or browser-global API. A caller supplies both the W1 wallet snapshot and the serialized IMMORTAL observer result.

## 3. Critical Minswap LP-token distinction

The observer's datumValidation.lpAsset.quantityRaw is the quantity of that LP unit held in the Pool UTxO. It is not the total circulating LP supply or a wallet's ownership amount.

Minswap's Mainnet Factory validator computes the LP token name from the sorted pool asset pair. At pool creation, the Pool UTxO retains the remaining LP-token capacity:
MAX_INT64 - (total_liquidity - default_burn_liquidity).
The validator's expected Pool Value explicitly contains this remaining LP token, plus the two pair assets, one Pool NFT and minimum ADA.

W2 uses the observer's LP policy/name pair solely as the exact pool identity. It never uses the Pool UTxO's LP quantity as a share denominator. It does not derive an ownership percentage, reserve claim, USD value, APR or economic exposure.

Official source references:
- Minswap V2 repository: https://github.com/minswap/minswap-dex-v2
- Factory validator: https://github.com/minswap/minswap-dex-v2/blob/main/validators/factory_validator.ak
- The validator derives the LP asset name from the sorted pair and retains the remaining LP token in the Pool UTxO. This is the protocol's capacity marker, not a circulating-supply denominator.

## 4. Wallet and pool-link semantics

A positive exact LP unit in CIP-30 getBalance() is represented as a wallet API source assertion. The result says only that the connected wallet API reported that aggregate asset balance and that its exact policy/name matches a unique observed Minswap V2 USDM pool.

It does not prove:
- beneficial ownership or Principal identity;
- exclusive account/resource control;
- complete wallet-history or complete DeFi-position coverage;
- current on-chain tip/finality of the Koios observation;
- an atomic relationship between the wallet snapshot and Koios pool query;
- pool share, market value, realizable liquidity, fees, APR or PnL;
- RiskBudget, ProtectedCapital, OpenExposure, settlement or IMMORTAL economic admission.

No matching LP unit in the wallet balance does not prove the user has no Minswap positions: the observed profile is USDM-only, and other Minswap/Cardano pools are outside this query.

## 5. Provenance/currentness limits

The pinned IMMORTAL observer queries Koios' indexed UTxO set with explicit pagination and preserves raw response hashes, inline datum CBOR, datum hash, UTxO reference and transaction block context. Its schema does not provide an explicit chain-tip/header binding for the query. W2 labels this source as an indexed current-UTxO query without explicit tip binding; it is not an independent ledger proof.

The upstream captured fixture scripts/fixtures/minswap-v2-usdm-mainnet-2026-10-31.json is useful for decoder/identity regression only. Its Koios response header is dated 2026-10-31, while the referenced UTxO transaction blockTime is 2024-07-18T13:48:52Z (approximately 835 days earlier). It must not be described as a current liquid pool or current market evidence. Its datum reserves are raw units 7 and 16. W2 does not impose a new freshness threshold; it reports source times and leaves currentness unverified beyond the Koios query semantics.

Wallet and Koios observations are separate non-atomic reads. W2 does not create a synthetic common snapshot or infer finality.

## 6. Test and exit evidence

test/minswap-v2-position-link.test.js uses deterministic synthetic W1 and observer envelopes, grounded in the exact asset/validator/schema constants and the upstream captured fixture. It covers CBOR Value parsing, large integer preservation, exact policy/name matching, Mainnet gating, incomplete pagination, duplicate pool identities, empty versus unmatched wallet states and contradictory source assertions.

The fixture envelopes are synthetic. No actual user wallet was connected, no live Koios request was issued by Arb, and no live pool/LP position was claimed by these tests.

## 7. Next boundary

W2 is a consumer-side identity-link reference slice. It does not complete a production wallet companion. Before calling a pool position current or valuation-ready, IMMORTAL must supply/qualify a currentness and chain-tip evidence contract and the relevant EXP-03/06/10 mappings; Arb must then consume that existing contract. No second chain observer, oracle, EvidenceQualification registry or economic gate should be created here.

W2 does not authorize W3 economic projection, W4 signing/submission, S2 paper trading or S3 live execution. D0/D1 and the relevant D0–D8 authority/recovery gates remain separate.


## 8. EXP-06 source-evidence pass-through

The W2 output exposes the original Koios query scope, pagination-completion metadata and response-body SHA-256 digests produced by the pinned IMMORTAL observer. It identifies the digest producer and does not label these values independently verified evidence.

The W2 wallet source assertion now explicitly records that its observation reference and evidence digest are absent, that raw balance CBOR is not copied into the link result, and that the CIP-30 read remains unverified. This is deliberate: W2 does not manufacture an EvidenceBoundRef or claim economic qualification from a wallet API response.

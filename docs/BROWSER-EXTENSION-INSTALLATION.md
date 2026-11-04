# Arb Agent — Chromium browser extension (W1 pilot)

**Package:** Manifest V3, Chrome and Microsoft Edge  
**Version:** 0.1.0  
**Status:** local installable pilot; no Web Store publication, wallet certification or live-wallet conformance claim  
**Boundary:** existing W1 read-only CIP-30 port; no IMMORTAL kernel or adapter change

## Build

Requirements: Node.js 22+.

~~~bash
npm run build:extension
~~~

The build produces:

- dist/arb-agent-chromium/ — unpacked extension directory;
- dist/arb-agent-chromium.zip — ZIP package whose root contains manifest.json.

The build bundles the existing wallet-companion/cip30-read-only.js and the existing Cardano Value CBOR decoder from wallet-companion/minswap-v2-position-link.js. It does not create a second W1 implementation. The generated files are build outputs and are not source-of-truth.

## Local installation

1. Extract arb-agent-chromium.zip into a permanent folder.
2. In Chrome open chrome://extensions; in Edge open edge://extensions.
3. Enable Developer mode.
4. Select Load unpacked and choose the extracted folder containing manifest.json.
5. Pin Arb Agent to the toolbar.

The ZIP is not a signed one-click installer. Normal public installation requires publication and approval through the relevant browser extension store. This repository has not submitted or published it.

## Connect a wallet

1. Install and unlock a Cardano browser wallet that exposes CIP-30 in the same browser.
2. Open a trusted web page in the active tab.
3. Click the Arb Agent toolbar icon.
4. Select the discovered wallet and click Connetti e leggi.
5. Approve the connection request in the wallet.

CIP-30 is specified as a webpage-based bridge using wallet code injected into webpages. The extension therefore temporarily injects its read-only bridge into the active page's main JavaScript world. It needs the active page context to access window.cardano; an extension popup cannot assume that injected namespace exists on its own chrome-extension:// origin.

**Important origin boundary:** the wallet connection is made from the active page origin. The wallet may show that origin as the requesting dApp, and the page itself can potentially access wallet APIs after authorization. Use this pilot only on an origin you trust. A dedicated Arb Agent origin and a reviewed connection boundary are required before broad public distribution.

## Permissions and data handling

The manifest requests only:

- activeTab — temporary access to the currently active tab after the user opens the extension;
- scripting — injection of the read-only bridge into that tab.

There are no persistent host_permissions, background polling, backend, RPC, indexer, exchange API, remote network request, credential store, local storage or wallet-data persistence. The bridge is removed from the page after each request. Full UTxO CBOR and balance CBOR remain in the page execution; only a display projection is returned to the popup.

The W1 allowlist is unchanged: enable(), getNetworkId(), getChangeAddress(), getBalance(), and getUtxos(). No signing, submission, transaction construction, order or transfer capability is present.

## Qualification still required

- Test with real supported wallets in Chrome and Edge, including permission prompt behavior from the extension popup.
- Confirm supported browser and wallet versions.
- Review the active-origin exposure before public rollout; do not connect on untrusted sites.
- Keep Preprod/Preview unresolved: CIP-30 network ID 0 does not distinguish these testnets.
- No mobile native application is included in this desktop package.
- No W2 live observer, W3 economic projection, W4 signing or W5 delegated execution is enabled.

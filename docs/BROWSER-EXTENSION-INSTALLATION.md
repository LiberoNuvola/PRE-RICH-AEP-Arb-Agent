# Arb Agent — Brave + Lace W1 wallet companion

**Desktop target:** Brave + Lace  
**Extension:** Manifest V3 launcher, version 0.2.0  
**Wallet integration:** existing W1 read-only CIP-30 dApp  
**Status:** project site deployment; synthetic CI only, no live-wallet authorization by CI

## Connection model

CIP-30 is a webpage-based dApp-wallet bridge. Lace injects its provider as `window.cardano.lace` into webpages; a dApp requests access by calling `enable()`. The extension itself must not request Lace access from an arbitrary active tab.

The browser extension is only a launcher. It has no permissions, does not inspect the active tab, and does not inject code into unrelated sites. It opens:

`https://liberonuvola.github.io/PRE-RICH-AEP-Arb-Agent/app/`

The Arb Agent page discovers `window.cardano` and calls the existing W1 read-only port only after the user presses Connect. Lace should identify the Arb Agent page as the requesting dApp.

## Install in Brave

1. Extract `arb-agent-chromium.zip` into a permanent folder.
2. Open `brave://extensions`.
3. Enable Developer mode.
4. Select Load unpacked and choose the extracted folder containing `manifest.json`.
5. Pin Arb Agent and click its toolbar icon.

The extension manifest has no permissions, host permissions, background scripts, content scripts or service worker.

## GitHub Pages origin limitation

The app is deployed at a project-specific path. Standard GitHub Pages project sites for the same account share the `liberonuvola.github.io` hostname origin. A different URL path is not a separate browser origin. The app source and deploy are controlled by this repository, and the launcher no longer executes inside a third-party page; however, before broad production use or any future signing capability, configure a dedicated custom domain/subdomain for stronger origin isolation.

Before approving a Lace prompt, verify that the requesting site is the expected Arb Agent Pages site. Do not approve prompts on unrelated websites.

## W1 boundary and remaining checks

The dApp calls only `enable()`, `getNetworkId()`, `getChangeAddress()`, `getBalance()` and `getUtxos()`. No signing, submission, API/RPC, indexer, exchange, credentials, seed phrase or private-key handling is implemented. CIP-30 network ID 0 does not distinguish Preprod from Preview.

CI uses mocked providers; it does not connect Lace. Real Brave + Lace permission and read-only behavior must still be tested manually. The extension ZIP is not a signed Web Store package.


## Deployment blocker and required owner setting

The static Pages build step passed, but the first deploy attempt stopped at Configure GitHub Pages because this repository has no Pages site configured yet. The default GITHUB_TOKEN cannot create/enable the Pages site; the action's enablement mode requires a separate PAT or GitHub App with administration:write and pages:write. The safe one-time setup is for the repository owner to open Settings → Pages → Build and deployment → Source and select GitHub Actions. Then run the Arb Agent dApp Pages workflow.

Do not connect the main Lace wallet to the default GitHub Pages project URL: project sites under this account share the liberonuvola.github.io origin. Before wallet authorization, use a custom domain/subdomain dedicated to Arb Agent, update the launcher and Pages CNAME/configuration, and verify HTTPS plus the exact requesting origin.

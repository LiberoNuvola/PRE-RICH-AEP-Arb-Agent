# Arb Agent — Brave + Lace W1 wallet companion

**Desktop target:** Brave + Lace  
**Extension:** Manifest V3 launcher  
**Wallet integration:** existing W1 read-only CIP-30 dApp  
**Hosting target:** Cloudflare Pages project hostname (`<project>.pages.dev`)  
**Status:** source prepared; Pages project still needs to be created in the user's Cloudflare account

## Why a dedicated Pages hostname

CIP-30 is a webpage-based dApp-wallet bridge. Lace injects its provider as `window.cardano.lace` into webpages; a dApp requests access by calling `enable()`. The extension must not request Lace access from an arbitrary active tab.

A static Cloudflare Pages project gets its own `<project>.pages.dev` hostname over HTTPS. This avoids using the shared GitHub Pages account hostname. Choose a project name dedicated to Arb Agent, for example `arb-agent-liberonuvola` if available. The resulting URL is not guessed or assumed; copy the actual production hostname from Cloudflare after first deployment.

## One-time Cloudflare setup

1. Create a Cloudflare account at https://dash.cloudflare.com/ (the Pages Free plan is sufficient for this static pilot).
2. Open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Authorize Cloudflare Pages to access only the GitHub repository `LiberoNuvola/PRE-RICH-AEP-Arb-Agent`.
4. Choose branch `Immortal-Protocol` as the production branch.
5. Configure the build:
   - Framework preset: None
   - Root directory: `/`
   - Build command: `npm run build:pages`
   - Build output directory: `dist/pages`
6. Save and deploy. Cloudflare will assign the project a `<project>.pages.dev` hostname. Enable/confirm HTTPS and copy the exact production URL.

Cloudflare's Git integration builds and deploys after pushes to the configured production branch. Keep Cloudflare's GitHub app access limited to this repository.

## After the first deployment

The exact Pages hostname is a required input for the next repository update. The launcher URL and the deployment/readiness record must be pinned to the actual hostname, then the updated ZIP must be rebuilt and installed in Brave. Do not connect Lace through the old GitHub Pages URL.

## Install the Brave launcher

1. Extract `arb-agent-chromium.zip` into a permanent folder.
2. Open `brave://extensions`.
3. Enable Developer mode.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
5. Pin Arb Agent and click its toolbar icon to open the dedicated dApp.

The launcher has no browser permissions, host permissions, background scripts, content scripts or service worker. It does not inspect the active tab, inject scripts into third-party sites or talk directly to Lace.

## W1 boundary

The dApp calls only `enable()`, `getNetworkId()`, `getChangeAddress()`, `getBalance()` and `getUtxos()`. No signing, submission, API/RPC, indexer, exchange, credentials, seed phrase or private-key handling is implemented. CIP-30 network ID 0 does not distinguish Preprod from Preview.

CI uses mocked providers; it does not connect Lace. Real Brave + Lace permission and read-only behavior must still be tested manually. The extension ZIP is not a signed Web Store package.


## Current safe state

The current extension popup intentionally does not contain a destination URL and cannot initiate wallet access. Do not reuse an older ZIP that points to the GitHub Pages project path. After the Cloudflare project has been created, its exact hostname will be written into the launcher, the ZIP will be rebuilt, and the old extension package will be replaced in Brave.

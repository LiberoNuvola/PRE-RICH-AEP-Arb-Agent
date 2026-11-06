import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('W1 PWA manifest and service-worker shell point to the existing read-only wallet port', async () => {
  const [html, manifest, main, worker] = await Promise.all([
    read('../app/index.html'),
    read('../app/manifest.webmanifest'),
    read('../app/main.js'),
    read('../app/service-worker.js'),
  ])
  const parsedManifest = JSON.parse(manifest)
  assert.match(html, /rel="manifest"/)
  assert.match(html, /Content-Security-Policy/)
  assert.equal(parsedManifest.display, 'standalone')
  assert.equal(parsedManifest.start_url, './')
  assert.match(main, /connectReadOnlyWallet/)
  assert.match(main, /discoverCip30Wallets/)
  assert.match(main, /window\.cardano/)
  assert.match(main, /new Date\(\)\.toISOString\(\)/)
  assert.match(worker, /cache\.addAll\(SHELL\)/)
  assert.match(worker, /requestUrl\.origin !== self\.location\.origin/)
  assert.match(worker, /caches\.match\(event\.request,\s*\{\s*ignoreSearch:\s*true\s*\}\)/)
  assert.doesNotMatch(worker, /\bfetch\s*\(/)
})

test('W1 PWA UI does not request signing, submission, credentials or remote APIs', async () => {
  const [html, main, worker] = await Promise.all([
    read('../app/index.html'),
    read('../app/main.js'),
    read('../app/service-worker.js'),
  ])
  const source = html + main + worker
  for (const forbidden of ['signTx', 'signData', 'submitTx', 'signTxs', 'submitTxs', 'process.env', 'WebSocket', 'XMLHttpRequest']) {
    assert.equal(source.includes(forbidden), false, 'forbidden capability present: ' + forbidden)
  }
  assert.match(html, /connect-src 'self'/)
})

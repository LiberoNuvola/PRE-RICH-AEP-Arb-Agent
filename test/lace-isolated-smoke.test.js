import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../diagnostics/lace-cip30-smoke.html', import.meta.url), 'utf8')
const script = await readFile(new URL('../diagnostics/lace-cip30-smoke.js', import.meta.url), 'utf8')

test('isolated Lace smoke page is deployed separately from the app shell', () => {
  assert.match(html, /lace-cip30-smoke\.js/)
  assert.doesNotMatch(html, /Content-Security-Policy/)
  assert.match(script, /window\.cardano\?\.lace/)
  assert.match(script, /button\.addEventListener\('click'/)
  assert.match(script, /provider\.enable\.call\(provider\)/)
  assert.doesNotMatch(script, /serviceWorker|navigator\.serviceWorker/)
})

test('isolated Lace smoke page does not call wallet read methods or request signing', () => {
  for (const method of ['getNetworkId', 'getChangeAddress', 'getBalance', 'getUtxos']) {
    assert.ok(script.includes("'" + method + "'"))
    assert.doesNotMatch(script, new RegExp('api\\.' + method + '\\s*\\('))
  }
  for (const method of ['signTx', 'signData', 'submitTx', 'signTxs', 'submitTxs']) {
    assert.ok(!script.includes(method))
  }
})

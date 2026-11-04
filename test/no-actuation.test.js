import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const sourceDirectories = ['../src/', '../wallet-companion/', '../app/']
const sourceFiles = (await Promise.all(sourceDirectories.map(async (directory) => {
  const paths = await readdir(new URL(directory, import.meta.url), { recursive: true })
  return paths.filter((path) => path.endsWith('.js')).map((path) => `${directory}${path}`)
}))).flat()
const sources = await Promise.all(sourceFiles.map((path) =>
  readFile(new URL(path, import.meta.url), 'utf8')
))
const combinedSource = sources.join('\n')

test('all S1 source files have no network, server, process-spawn or environment-secret APIs', () => {
  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /\bWebSocket\b/,
    /\bhttps?\.request\s*\(/,
    /\bcreateServer\s*\(/,
    /\bchild_process\b/,
    /\bspawnSync?\s*\(/,
    /\bprocess\.env\b/,
  ]
  for (const pattern of forbiddenPatterns) assert.equal(pattern.test(combinedSource), false, `forbidden runtime pattern: ${pattern}`)
})

test('all S1 source files contain no mutating adapter method declarations', () => {
  const forbiddenMethods = [
    'submitOrder', 'amendOrder', 'cancelOrder', 'withdrawAsset', 'transferAsset',
    'depositAsset', 'changeAccountPermissions', 'issueMandate', 'revokeMandate',
  ]
  for (const method of forbiddenMethods) assert.equal(combinedSource.includes(method), false, `mutating method found: ${method}`)
})


test('W1 wallet companion exposes no CIP-30 signing or submission methods', () => {
  const forbiddenWalletMethods = ['signTx', 'signData', 'submitTx', 'signTxs', 'submitTxs']
  for (const method of forbiddenWalletMethods) {
    assert.equal(combinedSource.includes(method), false, 'forbidden CIP-30 method found: ' + method)
  }
})

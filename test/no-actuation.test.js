import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/reducer.js', import.meta.url), 'utf8')

test('S1 reducer has no network, server, process-spawn or environment-secret APIs', () => {
  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /\bWebSocket\b/,
    /\bhttps?\.request\s*\(/,
    /\bcreateServer\s*\(/,
    /\bchild_process\b/,
    /\bspawnSync?\s*\(/,
    /\bprocess\.env\b/,
  ]
  for (const pattern of forbiddenPatterns) assert.equal(pattern.test(source), false, `forbidden runtime pattern: ${pattern}`)
})

test('S1 source contains no mutating adapter method declarations', () => {
  const forbiddenMethods = [
    'submitOrder', 'amendOrder', 'cancelOrder', 'withdrawAsset', 'transferAsset',
    'depositAsset', 'changeAccountPermissions', 'issueMandate', 'revokeMandate',
  ]
  for (const method of forbiddenMethods) assert.equal(source.includes(method), false, `mutating method found: ${method}`)
})

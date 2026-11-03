import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const sourcePaths = await readdir(new URL('../src/', import.meta.url), { recursive: true })
const javascriptPaths = sourcePaths.filter((path) => path.endsWith('.js'))
const sources = await Promise.all(javascriptPaths.map((path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')
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

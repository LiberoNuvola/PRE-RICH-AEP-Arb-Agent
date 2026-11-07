import test from 'node:test'
import assert from 'node:assert/strict'
import {
  connectReadOnlyWallet,
  discoverCip30Wallets,
  WalletCompanionError,
} from '../wallet-companion/cip30-read-only.js'

const OBSERVED_AT = '2026-11-03T20:00:00.000Z'
const ADDRESS_A = '01aabb'
const ADDRESS_B = '01ccdd'
const BALANCE = 'a100'

function makeApi(overrides = {}) {
  const calls = []
  const state = {
    networkId: 0,
    changeAddress: ADDRESS_A,
    balance: BALANCE,
    utxos: ['d87980', 'd87a80'],
    ...overrides,
  }

  const api = {
    async getNetworkId() {
      calls.push('getNetworkId')
      return typeof state.networkId === 'function' ? state.networkId() : state.networkId
    },
    async getChangeAddress() {
      calls.push('getChangeAddress')
      return typeof state.changeAddress === 'function'
        ? state.changeAddress()
        : state.changeAddress
    },
    async getBalance() {
      calls.push('getBalance')
      if (state.balanceError) throw state.balanceError
      return state.balance
    },
    async getUtxos() {
      calls.push('getUtxos')
      if (state.utxosError) throw state.utxosError
      return state.utxos
    },
  }

  return { api, calls, state }
}

function namespaceFor(api, onEnable = () => {}) {
  return {
    nami: {
      name: 'Nami',
      apiVersion: '1',
      async enable() {
        onEnable()
        return api
      },
    },
    notAWallet: { name: 'Not a wallet' },
  }
}

test('discovery lists only injected providers that expose enable', () => {
  const wallets = discoverCip30Wallets(namespaceFor(makeApi().api))
  assert.deepEqual(wallets, [{
    walletName: 'nami',
    displayName: 'Nami',
    apiVersion: '1',
  }])
})

test('connection refusal preserves the CIP-30 provider error code and info', async () => {
  const providerError = Object.assign(new Error('wallet not authorized.'), {
    name: 'ApiError',
    code: -3,
    info: 'User declined authorization',
  })
  const injectedWallets = {
    lace: {
      name: 'Lace',
      apiVersion: '0.1.0',
      async enable() {
        throw providerError
      },
    },
  }

  await assert.rejects(
    connectReadOnlyWallet({ walletName: 'lace', injectedWallets }),
    (error) => error instanceof WalletCompanionError &&
      error.code === 'WALLET_ACCESS_NOT_GRANTED' &&
      error.providerError.name === 'ApiError' &&
      error.providerError.code === '-3' &&
      error.providerError.info === 'User declined authorization',
  )
})

test('connection failure preserves a bounded internal connector diagnostic', async () => {
  const injectedWallets = {
    lace: {
      name: 'Lace',
      async enable() {
        throw Object.assign(new Error('connector unavailable'), {
          name: 'APIError',
          code: -2,
        })
      },
    },
  }

  await assert.rejects(
    connectReadOnlyWallet({ walletName: 'lace', injectedWallets }),
    (error) => error.code === 'WALLET_ACCESS_NOT_GRANTED' &&
      error.providerError.code === '-2' &&
      error.providerError.info === 'connector unavailable',
  )
})

test('connection is explicit and the session exposes only read operations', async () => {
  const { api, calls } = makeApi()
  let enables = 0
  const session = await connectReadOnlyWallet({
    walletName: 'nami',
    injectedWallets: namespaceFor(api, () => { enables += 1 }),
  })

  assert.equal(enables, 1)
  assert.deepEqual(calls, [])
  assert.deepEqual(session.getState(), { status: 'CONNECTED_READ_ONLY', invalidationReason: null })
  assert.equal('api' in session, false)
  assert.equal('providerApi' in session, false)
})

test('snapshot preserves raw CBOR and marks testnet variant unresolved', async () => {
  const { api, calls } = makeApi()
  const session = await connectReadOnlyWallet({
    walletName: 'nami',
    injectedWallets: namespaceFor(api),
  })

  const snapshot = await session.readSnapshot({ observedAt: OBSERVED_AT })
  assert.equal(snapshot.accountContext.network.networkId, 0)
  assert.equal(snapshot.accountContext.network.networkKind, 'TESTNET')
  assert.equal(snapshot.accountContext.network.exactEnvironment, null)
  assert.equal(snapshot.accountContext.network.environmentResolution, 'UNRESOLVED_TESTNET_VARIANT')
  assert.equal(snapshot.walletData.balanceCborHex, BALANCE)
  assert.deepEqual(snapshot.walletData.utxoCborHex, ['d87980', 'd87a80'])
  assert.equal(snapshot.coverage.walletControlledUtxos.status, 'EXHAUSTIVE_RESPONSE_NONEMPTY')
  assert.equal(snapshot.coverage.walletControlledUtxos.atomicity, 'NOT_GUARANTEED')
  assert.equal(snapshot.coverage.defiPositions, 'NOT_PROVIDED_BY_CIP30')
  assert.equal(snapshot.authority.principalBinding, 'NOT_ESTABLISHED')
  assert.equal(snapshot.authority.riskBudget, 'NOT_DERIVED')
  assert.deepEqual(calls, [
    'getNetworkId', 'getChangeAddress', 'getBalance', 'getUtxos',
    'getNetworkId', 'getChangeAddress',
  ])
})

test('empty UTxO response is scoped to wallet-controlled UTxOs only', async () => {
  const { api } = makeApi({ utxos: [] })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })
  const snapshot = await session.readSnapshot({ observedAt: OBSERVED_AT })

  assert.equal(snapshot.coverage.walletControlledUtxos.status, 'EXHAUSTIVE_RESPONSE_EMPTY')
  assert.equal(snapshot.coverage.walletControlledUtxos.returnedCount, 0)
  assert.notEqual(snapshot.coverage.defiPositions, 'EMPTY')
})

test('null UTxO response remains unknown and is never converted into an empty list', async () => {
  const { api } = makeApi({ utxos: null })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })
  const snapshot = await session.readSnapshot({ observedAt: OBSERVED_AT })

  assert.equal(snapshot.walletData.utxoCborHex, null)
  assert.equal(snapshot.coverage.walletControlledUtxos.status, 'UNKNOWN_NULL_RESPONSE')
  assert.equal(snapshot.coverage.walletControlledUtxos.returnedCount, null)
})

test('account-change API error invalidates the session', async () => {
  const { api } = makeApi({ utxosError: Object.assign(new Error('account changed'), { code: -4 }) })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error instanceof WalletCompanionError && error.code === 'ACCOUNT_CHANGE',
  )
  assert.deepEqual(session.getState(), { status: 'INVALIDATED', invalidationReason: 'ACCOUNT_CHANGE' })
  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error.code === 'SESSION_INVALIDATED',
  )
})

test('account or network fingerprint change during the read discards the snapshot', async () => {
  let addressCalls = 0
  const { api } = makeApi({
    changeAddress: () => {
      addressCalls += 1
      return addressCalls < 2 ? ADDRESS_A : ADDRESS_B
    },
  })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error.code === 'ACCOUNT_OR_NETWORK_CHANGED_DURING_READ',
  )
  assert.equal(session.getState().status, 'INVALIDATED')
})

test('refused wallet access during a read invalidates the session', async () => {
  const { api } = makeApi({ utxosError: Object.assign(new Error('refused'), { code: -3 }) })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error.code === 'ACCESS_REFUSED',
  )
  assert.equal(session.getState().invalidationReason, 'ACCESS_REFUSED_OR_DISCONNECTED')
})

test('an invalid observation timestamp is rejected before wallet reads', async () => {
  const { api, calls } = makeApi()
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  await assert.rejects(
    session.readSnapshot({ observedAt: '2026-11-03T20:00:00' }),
    (error) => error.code === 'OBSERVATION_TIME_REQUIRED',
  )
  assert.deepEqual(calls, [])
})

test('local close invalidates the read-only session', async () => {
  const { api } = makeApi()
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  session.close()
  assert.deepEqual(session.getState(), { status: 'INVALIDATED', invalidationReason: 'LOCAL_SESSION_CLOSED' })
  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error.code === 'SESSION_INVALIDATED',
  )
})


test('network ID change during the read discards the snapshot', async () => {
  let networkCalls = 0
  const { api } = makeApi({
    networkId: () => {
      networkCalls += 1
      return networkCalls < 2 ? 0 : 1
    },
  })
  const session = await connectReadOnlyWallet({ walletName: 'nami', injectedWallets: namespaceFor(api) })

  await assert.rejects(
    session.readSnapshot({ observedAt: OBSERVED_AT }),
    (error) => error.code === 'ACCOUNT_OR_NETWORK_CHANGED_DURING_READ',
  )
  assert.equal(session.getState().status, 'INVALIDATED')
})

/**
 * W1 Cardano wallet companion.
 *
 * This module is an application-edge CIP-30 read-only port.
 * The caller must invoke connectReadOnlyWallet from an explicit user action.
 * It accepts an injected provider namespace instead of reading browser globals.
 *
 * No signing, submission, network transport, persistence or authority is exposed.
 */

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isHexBytes(value) {
  return typeof value === 'string' && value.length > 0 &&
    value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

function isOffsetDateTime(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false
  }
  return Number.isFinite(Date.parse(value))
}

function classifyNetworkId(networkId) {
  if (networkId === 1) {
    return Object.freeze({
      networkId,
      networkKind: 'MAINNET',
      exactEnvironment: 'MAINNET',
      environmentResolution: 'CIP30_NETWORK_ID',
    })
  }
  if (networkId === 0) {
    return Object.freeze({
      networkId,
      networkKind: 'TESTNET',
      exactEnvironment: null,
      environmentResolution: 'UNRESOLVED_TESTNET_VARIANT',
    })
  }
  return Object.freeze({
    networkId,
    networkKind: 'UNKNOWN',
    exactEnvironment: null,
    environmentResolution: 'UNKNOWN_NETWORK_ID',
  })
}

export class WalletCompanionError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'WalletCompanionError'
    this.code = code
  }
}

export function discoverCip30Wallets(injectedNamespace) {
  if (!isRecord(injectedNamespace)) return Object.freeze([])

  const wallets = Object.keys(injectedNamespace).sort().flatMap((walletName) => {
    const provider = injectedNamespace[walletName]
    if (!isRecord(provider) || typeof provider.enable !== 'function') return []

    return [Object.freeze({
      walletName,
      displayName: typeof provider.name === 'string' && provider.name.length > 0
        ? provider.name
        : walletName,
      apiVersion: typeof provider.apiVersion === 'string' ? provider.apiVersion : null,
    })]
  })

  return Object.freeze(wallets)
}

export async function connectReadOnlyWallet({ walletName, injectedWallets } = {}) {
  if (typeof walletName !== 'string' || walletName.length === 0 || !isRecord(injectedWallets)) {
    throw new WalletCompanionError('INVALID_PROVIDER_SELECTION', 'A wallet name and injected CIP-30 namespace are required')
  }

  const provider = injectedWallets[walletName]
  if (!isRecord(provider) || typeof provider.enable !== 'function') {
    throw new WalletCompanionError('WALLET_PROVIDER_UNAVAILABLE', 'The selected CIP-30 wallet provider is unavailable')
  }

  // This is the only connection entry point. The caller is responsible for
  // invoking it from an explicit user gesture; no auto-connect is performed.
  let api
  try {
    api = await provider.enable.call(provider)
  } catch {
    throw new WalletCompanionError('WALLET_ACCESS_NOT_GRANTED', 'The wallet did not grant read access')
  }

  if (!isRecord(api)) {
    throw new WalletCompanionError('INVALID_WALLET_API', 'The wallet returned an invalid CIP-30 API object')
  }

  const requiredReadMethods = ['getNetworkId', 'getChangeAddress', 'getBalance', 'getUtxos']
  for (const method of requiredReadMethods) {
    if (typeof api[method] !== 'function') {
      throw new WalletCompanionError('READ_CAPABILITY_MISSING', 'The wallet does not expose the required read capability: ' + method)
    }
  }

  const providerInfo = Object.freeze({
    walletName,
    displayName: typeof provider.name === 'string' && provider.name.length > 0
      ? provider.name
      : walletName,
    apiVersion: typeof provider.apiVersion === 'string' ? provider.apiVersion : null,
    bridge: 'CIP-30',
  })

  let active = true
  let invalidationReason = null
  let readInProgress = false
  let apiRef = api

  function invalidate(reason) {
    active = false
    invalidationReason = reason
    apiRef = null
  }

  function assertActive() {
    if (!active || !apiRef) {
      throw new WalletCompanionError('SESSION_INVALIDATED', 'Wallet session is not active (' + (invalidationReason ?? 'CLOSED') + ')')
    }
  }

  async function invokeRead(method) {
    assertActive()
    const currentApi = apiRef
    try {
      return await currentApi[method].call(currentApi)
    } catch (error) {
      const code = isRecord(error) && Number.isInteger(error.code) ? error.code : null
      if (code === -4) invalidate('ACCOUNT_CHANGE')
      if (code === -3) invalidate('ACCESS_REFUSED_OR_DISCONNECTED')
      throw new WalletCompanionError(
        code === -4 ? 'ACCOUNT_CHANGE' : code === -3 ? 'ACCESS_REFUSED' : 'WALLET_READ_FAILED',
        'CIP-30 read failed: ' + method,
      )
    }
  }

  async function readIdentity() {
    const networkId = await invokeRead('getNetworkId')
    const changeAddressCborHex = await invokeRead('getChangeAddress')

    if (!Number.isSafeInteger(networkId) || networkId < 0 ||
        !isHexBytes(changeAddressCborHex)) {
      invalidate('MALFORMED_PROVIDER_RESPONSE')
      throw new WalletCompanionError('MALFORMED_PROVIDER_RESPONSE', 'The wallet returned invalid account or network data')
    }

    return Object.freeze({
      networkId,
      changeAddressCborHex,
      fingerprint: String(networkId) + ':' + changeAddressCborHex.toLowerCase(),
    })
  }

  return Object.freeze({
    provider: providerInfo,

    getState() {
      return Object.freeze({
        status: active ? 'CONNECTED_READ_ONLY' : 'INVALIDATED',
        invalidationReason,
      })
    },

    async readSnapshot({ observedAt } = {}) {
      assertActive()
      if (readInProgress) {
        throw new WalletCompanionError('READ_ALREADY_IN_PROGRESS', 'A wallet snapshot read is already in progress')
      }
      if (!isOffsetDateTime(observedAt)) {
        throw new WalletCompanionError('OBSERVATION_TIME_REQUIRED', 'Pass an explicit timezone-qualified observation timestamp')
      }

      readInProgress = true
      try {
        const before = await readIdentity()
        const [balanceCborHex, utxoCborHex] = await Promise.all([
          invokeRead('getBalance'),
          invokeRead('getUtxos'),
        ])

        const after = await readIdentity()
        if (before.fingerprint !== after.fingerprint) {
          invalidate('ACCOUNT_OR_NETWORK_CHANGED_DURING_READ')
          throw new WalletCompanionError(
            'ACCOUNT_OR_NETWORK_CHANGED_DURING_READ',
            'The wallet account or network changed during the observation; discard this snapshot',
          )
        }

        if (!isHexBytes(balanceCborHex)) {
          invalidate('MALFORMED_PROVIDER_RESPONSE')
          throw new WalletCompanionError('MALFORMED_PROVIDER_RESPONSE', 'The wallet returned an invalid balance CBOR value')
        }

        let utxos
        let utxoCoverage
        if (utxoCborHex === null) {
          utxos = null
          utxoCoverage = Object.freeze({
            status: 'UNKNOWN_NULL_RESPONSE',
            query: 'CIP30_GET_UTXOS_WITHOUT_AMOUNT_OR_PAGINATION',
            scope: 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET',
            pagination: 'NOT_USED',
            atomicity: 'NOT_GUARANTEED',
            returnedCount: null,
          })
        } else if (Array.isArray(utxoCborHex) && utxoCborHex.every(isHexBytes)) {
          utxos = Object.freeze([...utxoCborHex])
          utxoCoverage = Object.freeze({
            status: utxos.length === 0 ? 'EXHAUSTIVE_RESPONSE_EMPTY' : 'EXHAUSTIVE_RESPONSE_NONEMPTY',
            query: 'CIP30_GET_UTXOS_WITHOUT_AMOUNT_OR_PAGINATION',
            scope: 'UTXOS_CONTROLLED_BY_CONNECTED_WALLET',
            pagination: 'NOT_USED',
            atomicity: 'NOT_GUARANTEED',
            returnedCount: utxos.length,
          })
        } else {
          invalidate('MALFORMED_PROVIDER_RESPONSE')
          throw new WalletCompanionError('MALFORMED_PROVIDER_RESPONSE', 'The wallet returned an invalid UTxO response')
        }

        const network = classifyNetworkId(before.networkId)
        return Object.freeze({
          schemaVersion: 'arb.cardano.wallet-read.v1',
          evidenceClass: 'SOURCE_ASSERTION_UNVERIFIED',
          observedAt,
          provider: providerInfo,
          accountContext: Object.freeze({
            network,
            changeAddressCborHex: before.changeAddressCborHex,
            fingerprintMethod: 'NETWORK_ID_AND_CHANGE_ADDRESS_BYTES',
            fingerprintStability: 'CHECKED_BEFORE_AND_AFTER_READ',
          }),
          walletData: Object.freeze({
            balanceCborHex,
            utxoCborHex: utxos,
          }),
          coverage: Object.freeze({
            walletControlledUtxos: utxoCoverage,
            defiPositions: 'NOT_PROVIDED_BY_CIP30',
            contractHeldUtxos: 'NOT_ENUMERATED_BY_WALLET_GETUTXOS',
            orderHistory: 'NOT_PROVIDED_BY_CIP30',
            liabilitiesAndSettlement: 'NOT_PROVIDED_BY_CIP30',
          }),
          consistency: 'NON_ATOMIC_CROSS_METHOD_OBSERVATION',
          integrity: 'RAW_CBOR_PRESERVED_NOT_RECOMPUTED_OR_VERIFIED',
          authority: Object.freeze({
            principalBinding: 'NOT_ESTABLISHED',
            accountOwnership: 'NOT_ESTABLISHED',
            financialMandate: 'NOT_ESTABLISHED',
            riskBudget: 'NOT_DERIVED',
            protectedCapital: 'NOT_DERIVED',
            economicAdmission: 'NOT_PERFORMED',
          }),
        })
      } finally {
        readInProgress = false
      }
    },

    close() {
      invalidate('LOCAL_SESSION_CLOSED')
    },
  })
}

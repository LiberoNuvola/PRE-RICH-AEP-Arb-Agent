import { connectReadOnlyWallet, discoverCip30Wallets } from '../wallet-companion/cip30-read-only.js'
import { decodeCardanoValueCbor } from '../wallet-companion/minswap-v2-position-link.js'

const byId = (id) => document.getElementById(id)
const walletSelect = byId('wallet-select')
const connectButton = byId('connect-button')
const refreshButton = byId('refresh-button')
const disconnectButton = byId('disconnect-button')
const connectionStatus = byId('connection-status')
const walletPanel = byId('wallet-panel')

let session = null

function setStatus(message, kind = 'info') {
  connectionStatus.textContent = message
  connectionStatus.dataset.kind = kind
}

function addOption(select, value, label) {
  const option = document.createElement('option')
  option.value = value
  option.textContent = label
  select.append(option)
}

function discoverWallets() {
  walletSelect.replaceChildren()
  const injected = window.cardano
  const wallets = discoverCip30Wallets(injected)
  addOption(walletSelect, '', wallets.length ? 'Seleziona un wallet…' : 'Nessun wallet CIP-30 rilevato')
  for (const wallet of wallets) addOption(walletSelect, wallet.walletName, wallet.displayName + (wallet.apiVersion ? ' · API ' + wallet.apiVersion : ''))
  connectButton.disabled = wallets.length === 0
  return wallets.length
}

function renderAssets(balanceCborHex) {
  const list = byId('asset-list')
  list.replaceChildren()
  try {
    const decoded = decodeCardanoValueCbor(balanceCborHex)
    const rows = [{ label: 'ADA · lovelace', quantity: decoded.lovelaceRaw, identity: 'coin / lovelace' },
      ...decoded.assets.map((asset) => ({
        label: 'Native asset',
        quantity: asset.quantityRaw,
        identity: asset.unit,
      }))]
    for (const row of rows) {
      const item = document.createElement('div')
      item.className = 'asset'
      const left = document.createElement('div')
      const label = document.createElement('strong')
      label.textContent = row.label
      const identity = document.createElement('code')
      identity.textContent = row.identity
      left.append(label, identity)
      const quantity = document.createElement('strong')
      quantity.textContent = row.quantity
      item.append(left, quantity)
      list.append(item)
    }
  } catch {
    const message = document.createElement('p')
    message.className = 'muted'
    message.textContent = 'Il CBOR del saldo è stato conservato, ma non è stato possibile decodificarlo per la visualizzazione.'
    list.append(message)
  }
}

function renderSnapshot(snapshot) {
  const network = snapshot.accountContext.network
  byId('network-value').textContent = network.networkKind
  byId('network-detail').textContent = network.exactEnvironment ?? 'Ambiente esatto non risolto'
  const coverage = snapshot.coverage.walletControlledUtxos
  byId('utxo-value').textContent = coverage.returnedCount === null ? 'UNKNOWN' : String(coverage.returnedCount)
  byId('utxo-detail').textContent = coverage.status.replaceAll('_', ' ')
  byId('provider-value').textContent = snapshot.provider.displayName
  byId('address-value').textContent = snapshot.accountContext.changeAddressCborHex
  byId('observed-value').textContent = snapshot.observedAt
  byId('evidence-pill').textContent = snapshot.evidenceClass
  renderAssets(snapshot.walletData.balanceCborHex)
  walletPanel.hidden = false
}

async function readSnapshot() {
  if (!session) return
  refreshButton.disabled = true
  setStatus('Lettura CIP-30 in corso…')
  try {
    const snapshot = await session.readSnapshot({ observedAt: new Date().toISOString() })
    renderSnapshot(snapshot)
    setStatus('Lettura completata. I dati restano osservazioni non verificate.', 'success')
  } catch (error) {
    if (session.getState().status === 'INVALIDATED') {
      session = null
      refreshButton.disabled = true
      disconnectButton.disabled = true
    }
    setStatus('Lettura non disponibile: ' + (error?.message ?? 'errore wallet'), 'error')
  } finally {
    refreshButton.disabled = !session
  }
}

connectButton.addEventListener('click', async () => {
  const walletName = walletSelect.value
  if (!walletName) {
    setStatus('Seleziona prima un wallet.', 'error')
    return
  }
  connectButton.disabled = true
  setStatus('Richiesta di connessione al wallet…')
  try {
    // The only enable() path: reached exclusively from this explicit click.
    session = await connectReadOnlyWallet({ walletName, injectedWallets: window.cardano })
    refreshButton.disabled = false
    disconnectButton.disabled = false
    await readSnapshot()
  } catch (error) {
    session = null
    setStatus('Connessione non riuscita: ' + (error?.message ?? 'errore wallet'), 'error')
  } finally {
    connectButton.disabled = false
  }
})

refreshButton.addEventListener('click', readSnapshot)

disconnectButton.addEventListener('click', () => {
  session?.close()
  session = null
  walletPanel.hidden = true
  refreshButton.disabled = true
  disconnectButton.disabled = true
  setStatus('Sessione locale chiusa. Il wallet può mantenere la propria autorizzazione secondo le sue impostazioni.')
})

discoverWallets()
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {
    setStatus('Companion disponibile; registrazione offline non riuscita. La lettura wallet resta disponibile.')
  })
}

const byId = (id) => document.getElementById(id)
const button = byId('connect')
const status = byId('status')
const provider = window.cardano?.lace

byId('origin').textContent = window.location.origin
byId('provider-state').textContent =
  provider && typeof provider.enable === 'function'
    ? 'Lace CIP-30 rilevato'
    : 'Lace CIP-30 non rilevato'

button.disabled = !(provider && typeof provider.enable === 'function')

button.addEventListener('click', async () => {
  if (!provider || typeof provider.enable !== 'function') {
    status.textContent = 'Lace non è disponibile in window.cardano.lace.'
    return
  }

  button.disabled = true
  status.textContent = 'Richiesta enable() inviata a Lace. Attendi la risposta del wallet…'

  let api = null
  try {
    // Explicit click only. Do not call any returned wallet method.
    api = await provider.enable.call(provider)

    const requiredReadMethods = ['getNetworkId', 'getChangeAddress', 'getBalance', 'getUtxos']
    const missing = requiredReadMethods.filter((method) => typeof api?.[method] !== 'function')

    status.textContent = missing.length
      ? 'ENABLE_OK, ma l’API restituita non espone tutte le capacità di lettura attese. Mancanti: ' + missing.join(', ')
      : 'ENABLE_OK — Lace ha restituito l’API CIP-30 e le quattro capacità di lettura sono presenti. Nessun dato del wallet è stato letto.'
  } catch (error) {
    const name = typeof error?.name === 'string' ? error.name.slice(0, 80) : 'Error'
    const code = typeof error?.code === 'number' || typeof error?.code === 'string'
      ? ' [' + String(error.code).slice(0, 32) + ']'
      : ''
    const detail = typeof error?.info === 'string'
      ? error.info
      : typeof error?.message === 'string' ? error.message : 'Errore senza dettaglio'
    status.textContent = 'ENABLE_FAILED — ' + name + code + ': ' + detail.slice(0, 240)
  } finally {
    api = null
    button.disabled = false
  }
})

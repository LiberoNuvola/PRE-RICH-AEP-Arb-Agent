const byId = (id) => document.getElementById(id);
const walletSelect = byId('wallet-select');
const connectButton = byId('connect-button');
const refreshButton = byId('refresh-button');
const clearButton = byId('clear-button');
const statusNode = byId('connection-status');
const walletPanel = byId('wallet-panel');

let activeTabId = null;
let discoveredWallets = [];

function setStatus(message, kind = 'info') {
  statusNode.textContent = message;
  statusNode.dataset.kind = kind;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab || !Number.isInteger(tab.id)) {
    throw new Error('Nessuna scheda browser attiva disponibile.');
  }
  return tab;
}

async function invokePageBridge(method, payload = {}) {
  if (!Number.isInteger(activeTabId)) {
    throw new Error('Scheda attiva non disponibile. Riapri il popup su una pagina web.');
  }

  await chrome.scripting.executeScript({
    target: { tabId: activeTabId },
    world: 'MAIN',
    files: ['page-bridge.js'],
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId: activeTabId },
    world: 'MAIN',
    func: async (methodName, input) => {
      const bridgeKey = Symbol.for('arb-agent.readonly.bridge.v1');
      const bridge = window[bridgeKey];
      if (!bridge) throw new Error('Bridge CIP-30 non disponibile nella scheda attiva.');
      try {
        if (methodName === 'discover') return bridge.discover();
        if (methodName === 'readSnapshot') return await bridge.readSnapshot(input.walletName);
        throw new Error('Operazione bridge non consentita.');
      } finally {
        try { delete window[bridgeKey]; } catch {}
      }
    },
    args: [method, payload],
  });

  if (!Array.isArray(results) || results.length !== 1 || !results[0]) {
    throw new Error('La scheda attiva non ha restituito un risultato leggibile.');
  }
  return results[0].result;
}

function populateWallets(wallets) {
  discoveredWallets = Array.isArray(wallets) ? wallets : [];
  walletSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = discoveredWallets.length
    ? 'Seleziona un wallet…'
    : 'Nessun wallet CIP-30 rilevato';
  walletSelect.append(placeholder);

  for (const wallet of discoveredWallets) {
    const option = document.createElement('option');
    option.value = wallet.walletName;
    option.textContent = wallet.displayName + (wallet.apiVersion ? ' · API ' + wallet.apiVersion : '');
    walletSelect.append(option);
  }

  walletSelect.disabled = discoveredWallets.length === 0;
  connectButton.disabled = discoveredWallets.length === 0 || !walletSelect.value;
}

function renderAssets(decodedBalance) {
  const list = byId('asset-list');
  list.replaceChildren();
  if (!decodedBalance) {
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = 'Il saldo CBOR è stato conservato durante la lettura, ma non è stato possibile decodificarlo per la visualizzazione.';
    list.append(message);
    return;
  }

  const rows = [
    { label: 'ADA · lovelace', quantity: decodedBalance.lovelaceRaw, identity: 'coin / lovelace' },
    ...decodedBalance.assets.map((asset) => ({
      label: 'Native asset · quantità grezza',
      quantity: asset.quantityRaw,
      identity: asset.unit,
    })),
  ];

  for (const row of rows) {
    const item = document.createElement('div');
    item.className = 'asset';
    const left = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = row.label;
    const identity = document.createElement('code');
    identity.textContent = row.identity;
    left.append(label, identity);
    const quantity = document.createElement('strong');
    quantity.textContent = row.quantity;
    item.append(left, quantity);
    list.append(item);
  }
}

function renderSnapshot(result) {
  byId('network-value').textContent = result.network.networkKind;
  byId('network-detail').textContent = result.network.exactEnvironment
    ?? result.network.environmentResolution.replaceAll('_', ' ');
  const coverage = result.utxoCoverage;
  byId('utxo-value').textContent = coverage.returnedCount === null ? 'UNKNOWN' : String(coverage.returnedCount);
  byId('utxo-detail').textContent = coverage.status.replaceAll('_', ' ');
  byId('provider-value').textContent = result.provider.displayName;
  byId('address-value').textContent = result.addressCborHex;
  byId('observed-value').textContent = result.observedAt;
  byId('evidence-pill').textContent = result.evidenceClass;
  renderAssets(result.decodedBalance);
  walletPanel.hidden = false;
  refreshButton.disabled = false;
  clearButton.disabled = false;
}

async function readSnapshot() {
  const walletName = walletSelect.value;
  if (!walletName) {
    setStatus('Seleziona prima un wallet.', 'error');
    return;
  }

  connectButton.disabled = true;
  refreshButton.disabled = true;
  setStatus('Richiesta di lettura al wallet…');
  try {
    const result = await invokePageBridge('readSnapshot', { walletName });
    renderSnapshot(result);
    setStatus('Lettura completata. I dati restano osservazioni non verificate.', 'success');
  } catch (error) {
    setStatus('Lettura non disponibile: ' + (error?.message ?? 'errore wallet o pagina'), 'error');
  } finally {
    connectButton.disabled = discoveredWallets.length === 0 || !walletSelect.value;
    refreshButton.disabled = walletPanel.hidden;
  }
}

connectButton.addEventListener('click', readSnapshot);
refreshButton.addEventListener('click', readSnapshot);
walletSelect.addEventListener('change', () => {
  connectButton.disabled = !walletSelect.value;
});

clearButton.addEventListener('click', () => {
  walletPanel.hidden = true;
  refreshButton.disabled = true;
  clearButton.disabled = true;
  setStatus('Vista locale pulita. L’eventuale autorizzazione concessa resta gestita dal wallet.');
});

async function initialize() {
  try {
    const tab = await getActiveTab();
    activeTabId = tab.id;
    try {
      const origin = new URL(tab.url).origin;
      byId('active-origin').textContent = 'Origine attiva: ' + origin;
    } catch {
      byId('active-origin').textContent = 'Origine attiva: non leggibile';
    }
    const wallets = await invokePageBridge('discover');
    populateWallets(wallets);
    if (wallets.length === 0) {
      setStatus('Nessun provider CIP-30 rilevato. Apri una pagina web attendibile in un browser con un wallet Cardano installato.', 'info');
    } else {
      setStatus('Wallet rilevati. Selezionane uno e premi “Connetti e leggi”.', 'success');
    }
  } catch {
    populateWallets([]);
    setStatus('Arb non può leggere questa scheda. Apri una normale pagina web attendibile: le pagine interne del browser non sono supportate.', 'error');
  }
}

initialize();

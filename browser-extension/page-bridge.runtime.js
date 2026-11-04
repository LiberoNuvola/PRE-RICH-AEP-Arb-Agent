(function registerArbReadOnlyBridge() {
  const bridgeKey = Symbol.for('arb-agent.readonly.bridge.v1');
  const bridge = Object.freeze({
    discover() {
      return walletCore.discoverCip30Wallets(window.cardano);
    },

    async readSnapshot(walletName) {
      const session = await walletCore.connectReadOnlyWallet({
        walletName,
        injectedWallets: window.cardano,
      });

      try {
        const snapshot = await session.readSnapshot({
          observedAt: new Date().toISOString(),
        });

        let decodedBalance = null;
        try {
          decodedBalance = walletDecoder.decodeCardanoValueCbor(snapshot.walletData.balanceCborHex);
        } catch {
          decodedBalance = null;
        }

        // Only a presentation projection crosses back to the extension popup.
        // Full UTxO CBOR and raw balance CBOR remain inside this page execution.
        return Object.freeze({
          schemaVersion: snapshot.schemaVersion,
          evidenceClass: snapshot.evidenceClass,
          observedAt: snapshot.observedAt,
          provider: snapshot.provider,
          network: snapshot.accountContext.network,
          addressCborHex: snapshot.accountContext.changeAddressCborHex,
          utxoCoverage: snapshot.coverage.walletControlledUtxos,
          consistency: snapshot.consistency,
          decodedBalance,
          authority: snapshot.authority,
        });
      } finally {
        session.close();
      }
    },
  });

  Object.defineProperty(window, bridgeKey, {
    value: bridge,
    configurable: true,
    enumerable: false,
    writable: false,
  });
})();

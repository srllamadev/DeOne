import { Asset, Horizon, Keypair, Networks, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import type { StellarRail } from "./rail.js";

export function createTestnetRail(env: NodeJS.ProcessEnv): StellarRail {
  const { STELLAR_SOURCE_SECRET, STELLAR_DESTINATION_ADDRESS, STELLAR_USDC_ISSUER } = env;
  if (!STELLAR_SOURCE_SECRET || !STELLAR_DESTINATION_ADDRESS || !STELLAR_USDC_ISSUER) {
    throw new Error("Testnet requiere STELLAR_SOURCE_SECRET, STELLAR_DESTINATION_ADDRESS y STELLAR_USDC_ISSUER");
  }
  if (!StrKey.isValidEd25519SecretSeed(STELLAR_SOURCE_SECRET) ||
      !StrKey.isValidEd25519PublicKey(STELLAR_DESTINATION_ADDRESS) ||
      !StrKey.isValidEd25519PublicKey(STELLAR_USDC_ISSUER)) {
    throw new Error("Las claves de Stellar Testnet tienen un formato inválido");
  }

  const signer = Keypair.fromSecret(STELLAR_SOURCE_SECRET);
  const destination = STELLAR_DESTINATION_ADDRESS;
  if (destination === signer.publicKey() || STELLAR_USDC_ISSUER === signer.publicKey() || STELLAR_USDC_ISSUER === destination) {
    throw new Error("Usa dos cuentas de prueba distintas del emisor de USDC");
  }

  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const asset = new Asset("USDC", STELLAR_USDC_ISSUER);

  return {
    mode: "testnet",
    async settle(amount, onPrepared) {
      const source = await server.loadAccount(signer.publicKey());
      const transaction = new TransactionBuilder(source, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({ destination, asset, amount }))
        .setTimeout(60)
        .build();

      transaction.sign(signer);
      const hash = transaction.hash().toString("hex");
      onPrepared(hash);

      try {
        await server.submitTransaction(transaction);
      } catch (error) {
        const confirmed = await server.transactions().transaction(hash).call().catch(() => undefined);
        if (!confirmed?.successful) throw error;
      }
    },
  };
}

import { Asset, Keypair } from "@stellar/stellar-sdk";
import type { Currency, ProfileId } from "@deone/contracts";
import { sendPayment, testnetServer } from "./accounts.js";
import type { SettlementLeg, SettlementResult, StellarRail } from "./rail.js";
import { addressFor, secretFor } from "./wallet-state.js";

const MEMO = "DeOne remesa";

/**
 * Rail de Testnet con activos propios: BOBT (boliviano) y COPT (peso colombiano).
 * Tramo 1: la wallet del emisor paga a la tesorería (cobro).
 * Tramo 2: la tesorería paga a la wallet del destinatario (abono).
 * Los tramos fiat siguen simulados; aquí solo se mueven los activos en Stellar Testnet.
 */
export function createOwnAssetRail(env: NodeJS.ProcessEnv): StellarRail {
  const issuerSecret = env.STELLAR_ASSET_ISSUER_SECRET;
  const treasurySecret = env.STELLAR_TREASURY_SECRET;
  if (!issuerSecret || !treasurySecret) {
    throw new Error("Testnet requiere STELLAR_ASSET_ISSUER_SECRET y STELLAR_TREASURY_SECRET (npm run setup:assets)");
  }
  for (const profile of ["lidia", "martha"] as ProfileId[]) {
    if (!secretFor(profile)) throw new Error(`Testnet requiere la wallet de ${profile} (WALLET_USER*_SECRET)`);
  }

  const issuer = Keypair.fromSecret(issuerSecret).publicKey();
  const treasury = Keypair.fromSecret(treasurySecret);
  const token = (currency: Currency) => new Asset(currency === "BOB" ? "BOBT" : "COPT", issuer);

  return {
    mode: "testnet",
    async settle(leg: SettlementLeg, hooks): Promise<SettlementResult> {
      const sender = Keypair.fromSecret(secretFor(leg.sender)!);
      const recipientAddress = addressFor(leg.recipient)!;

      const collect = await sendPayment({
        from: sender,
        to: treasury.publicKey(),
        asset: token(leg.sendCurrency),
        amount: leg.sendAmount,
        memo: MEMO,
      });
      hooks.onCollected(collect);

      const payout = await sendPayment({
        from: treasury,
        to: recipientAddress,
        asset: token(leg.receiveCurrency),
        amount: leg.receiveAmount,
        memo: MEMO,
      });
      await testnetServer.transactions().transaction(payout).call();
      return { payoutHash: payout };
    },
  };
}

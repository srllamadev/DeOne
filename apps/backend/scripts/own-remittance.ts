// Remesa de prueba con activos propios: user1 envía BOBT a la tesorería (se retira del circuito)
// y la tesorería envía COPT a user2. Los tramos fiat siguen simulados fuera de la cadena.
// Uso: npm run remit:own -w @deone/backend -- [BOB] (por defecto 10 BOBT → 4.500 COPT, tasa de la demo)
import { Asset, Keypair } from "@stellar/stellar-sdk";
import { assertStellarAmount, balances, explorerTxUrl, sendPayment, testnetServer } from "../src/stellar/accounts.js";

const bob = assertStellarAmount(process.argv[2] ?? "10");
const DEMO_RATE_COP_PER_BOB = 450; // Bs 1 → $450 COP, igual al ejemplo de la demo (Bs 10 → $4.500)
const cop = (Number(bob) * DEMO_RATE_COP_PER_BOB).toFixed(7);

const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en apps/backend/.env (ejecuta npm run setup:assets)`);
  return value;
};
const user1 = Keypair.fromSecret(env("WALLET_USER1_SECRET"));
const user2 = Keypair.fromSecret(env("WALLET_USER2_SECRET"));
const treasury = Keypair.fromSecret(env("STELLAR_TREASURY_SECRET"));
const issuer = Keypair.fromSecret(env("STELLAR_ASSET_ISSUER_SECRET"));
const BOBT = new Asset("BOBT", issuer.publicKey());
const COPT = new Asset("COPT", issuer.publicKey());

const hashIn = await sendPayment({ from: user1, to: treasury.publicKey(), asset: BOBT, amount: bob, memo: "DeOne rem BOB" });
console.log(`Tramo 1 · user1 → treasury: ${bob} BOBT · ${explorerTxUrl(hashIn)}`);
const hashOut = await sendPayment({ from: treasury, to: user2.publicKey(), asset: COPT, amount: cop, memo: "DeOne rem COP" });
console.log(`Tramo 2 · treasury → user2: ${cop} COPT · ${explorerTxUrl(hashOut)}`);

for (const hash of [hashIn, hashOut]) {
  const tx = await testnetServer.transactions().transaction(hash).call();
  console.log(`Horizon ${hash.slice(0, 8)}…: successful=${tx.successful}`);
}
console.log("user2:", JSON.stringify(await balances(user2.publicKey())));

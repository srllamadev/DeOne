// M2 · Prueba de concepto: dos wallets Stellar de Testnet y una transferencia entre ellas.
// Uso: npm run m2 -w @deone/backend -- [XLM|USDC] [monto]
// Con XLM no hace falta trustline ni fondos externos. Con USDC, la wallet emisora debe tener saldo de prueba.
import { Asset } from "@stellar/stellar-sdk";
import {
  assertStellarAmount,
  balances,
  createAccount,
  ensureTrustline,
  explorerTxUrl,
  fundWithFriendbot,
  sendPayment,
  testnetServer,
  usdcAsset,
} from "../src/stellar/accounts.js";

const [assetArg = "XLM", amountArg = "1"] = process.argv.slice(2);
const amount = assertStellarAmount(amountArg);
const asset = assetArg.toUpperCase() === "USDC" ? usdcAsset() : Asset.native();
const assetLabel = assetArg.toUpperCase() === "USDC" ? "USDC" : "XLM";

const user1 = createAccount();
const user2 = createAccount();
console.log("user1 (Lidia)  :", user1.publicKey());
console.log("user2 (Martha) :", user2.publicKey());

await fundWithFriendbot(user1.publicKey());
await fundWithFriendbot(user2.publicKey());
console.log("Fondeadas con XLM de Friendbot.");

if (assetLabel === "USDC") {
  const trustline1 = await ensureTrustline(user1, asset);
  const trustline2 = await ensureTrustline(user2, asset);
  console.log("Trustlines USDC:", trustline1 ?? "ya existía (user1)", "·", trustline2 ?? "ya existía (user2)");
}

const senderBalances = await balances(user1.publicKey());
const senderBalance = senderBalances.find((entry) => entry.asset === assetLabel)?.balance ?? "0";
if (Number(senderBalance) < Number(amount)) {
  console.error(`user1 tiene ${senderBalance} ${assetLabel} y necesita ${amount}.`);
  console.error(`Fondea esta cuenta antes de transferir: ${user1.publicKey()}`);
  console.error("Con USDC, el depósito llegará por el ancla de prueba (M3). Con XLM, usa el monto por defecto.");
  process.exit(1);
}

const before = await balances(user2.publicKey());
const hash = await sendPayment({
  from: user1,
  to: user2.publicKey(),
  asset,
  amount,
  memo: "DeOne M2",
}).catch((error: unknown) => {
  const codes = (error as { response?: { data?: { extras?: { result_codes?: unknown } } } })
    .response?.data?.extras?.result_codes;
  console.error("Horizon rechazó el pago:", JSON.stringify(codes ?? (error as Error).message));
  process.exit(1);
});
console.log(`Pago enviado: ${amount} ${assetLabel} de user1 a user2`);
console.log("Hash:", hash);
console.log("Explorer:", explorerTxUrl(hash));

const tx = await testnetServer.transactions().transaction(hash).call();
console.log("Confirmada en Horizon:", tx.successful, "· ledger", tx.ledger_attr);

const after = await balances(user2.publicKey());
console.log("Saldo user2 antes :", JSON.stringify(before));
console.log("Saldo user2 después:", JSON.stringify(after));

// M3 · Retiro USDC → COP (Bre-B) contra el sandbox de VANK en Stellar Testnet.
// Uso: npm run m3 -w @deone/backend -- [monto_usdc]   (mínimo del ancla: 1 USDC)
// Requiere WALLET_USER2_SECRET en apps/backend/.env con USDC de prueba.
// Los datos KYC y la llave Bre-B son de prueba, publicados por VANK para su sandbox.
import { Keypair } from "@stellar/stellar-sdk";
import { resolveAnchor, sep10Token } from "../src/anchors/sep10.js";
import { sep6Withdraw, sep6WaitFinal, type WithdrawKyc } from "../src/anchors/sep6.js";
import { assertStellarAmount, balances, explorerTxUrl, sendPayment, testnetServer, usdcAsset } from "../src/stellar/accounts.js";

const DOMAIN = "dev-stable-anchor.thisisvank.com";
const amount = assertStellarAmount(process.argv[2] ?? "1.2");

const secret = process.env.WALLET_USER2_SECRET;
if (!secret) throw new Error("Falta WALLET_USER2_SECRET en apps/backend/.env");
const user = Keypair.fromSecret(secret);
const log = (message: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

// Datos de prueba del sandbox de VANK. Quien retira es el usuario; la llave Bre-B identifica al beneficiario.
const kyc: WithdrawKyc = {
  first_name: "Tester",
  last_name: "Sandbox",
  email_address: "tester@example.com",
  id_type: "CC",
  id_number: "1000000001",
  bank_account_number: "@alphamunKey01",
};

const usdcBefore = (await balances(user.publicKey())).find((b) => b.asset === "USDC")?.balance;
log(`Cuenta ${user.publicKey()} · USDC antes: ${usdcBefore}`);

const anchor = await resolveAnchor(DOMAIN);
log(`stellar.toml OK · SEP-6: ${anchor.sep6}`);

const token = await sep10Token(anchor, user);
log("SEP-10 OK · JWT obtenido");

const tx = await sep6Withdraw({ anchor, token, account: user.publicKey(), amount, kyc, log });
if (tx.status !== "pending_user_transfer_start") {
  log(`El retiro terminó sin enviar USDC. Estado: ${tx.status} · ${tx.message ?? ""}`);
  process.exit(1);
}
if (!tx.withdraw_anchor_account || !tx.withdraw_memo) throw new Error("El ancla no devolvió cuenta o memo de destino.");
log(`Destino del ancla: ${tx.withdraw_anchor_account} · memo ${tx.withdraw_memo_type ?? "id"}: ${tx.withdraw_memo}`);
if (tx.message) log(`Beneficiario resuelto por el ancla: ${tx.message}`);

const hash = await sendPayment({
  from: user,
  to: tx.withdraw_anchor_account,
  asset: usdcAsset(),
  amount,
  memo: tx.withdraw_memo,
  memoType: tx.withdraw_memo_type === "text" ? "text" : "id",
});
log(`USDC enviado al ancla · hash ${hash}`);
log(`Explorer: ${explorerTxUrl(hash)}`);

const horizonTx = await testnetServer.transactions().transaction(hash).call();
log(`Horizon confirma: ${horizonTx.successful}`);

const final = await sep6WaitFinal(anchor, token, tx.id, log);
log(`Resultado final: ${final.status}${final.message ? ` · ${final.message}` : ""}`);
if (final.amount_out) log(`Monto a entregar en COP: ${final.amount_out}`);
if (final.stellar_transaction_id) log(`Transacción de reembolso o liquidación: ${final.stellar_transaction_id}`);

const usdcAfter = (await balances(user.publicKey())).find((b) => b.asset === "USDC")?.balance;
log(`USDC después: ${usdcAfter}`);
process.exit(final.status === "completed" ? 0 : 1);

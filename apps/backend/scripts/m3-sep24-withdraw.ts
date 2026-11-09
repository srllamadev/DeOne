// M3 · Retiro USDC → COP por SEP-24 (formulario interactivo) contra el sandbox de VANK.
// 1) Crea el retiro y muestra la URL del formulario. Completar el formulario en el navegador.
// 2) El script espera el estado pending_user_transfer_start, envía el USDC con el memo indicado y espera el final.
// Uso: npm run m3:sep24 -w @deone/backend -- [monto_usdc]
import { Keypair } from "@stellar/stellar-sdk";
import { resolveAnchor, sep10Token } from "../src/anchors/sep10.js";
import { assertStellarAmount, balances, explorerTxUrl, sendPayment, testnetServer, usdcAsset } from "../src/stellar/accounts.js";

const DOMAIN = "dev-stable-anchor.thisisvank.com";
const amount = assertStellarAmount(process.argv[2] ?? "1.2");
const secret = process.env.WALLET_USER2_SECRET;
if (!secret) throw new Error("Falta WALLET_USER2_SECRET en apps/backend/.env");
const user = Keypair.fromSecret(secret);
const log = (message: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

// El ancla a veces corta la conexión; el polling reintenta en vez de abortar el retiro.
async function getTx(id: string, headers: Record<string, string>): Promise<Record<string, string | undefined>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${anchor.sep24Base}/transaction?id=${encodeURIComponent(id)}`, { headers });
      return (await response.json() as { transaction: Record<string, string | undefined> }).transaction;
    } catch (error) {
      if (attempt >= 5) throw error;
      log(`Error de red al consultar el estado (intento ${attempt}), reintentando…`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

const anchor = await resolveAnchor(DOMAIN);
const token = await sep10Token(anchor, user);
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
log("SEP-10 OK");

const started = await fetch(`${anchor.sep24Base}/transactions/withdraw/interactive`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ asset_code: "USDC", account: user.publicKey(), amount, lang: "es" }),
});
if (!started.ok) throw new Error(`SEP-24 withdraw rechazado (HTTP ${started.status}): ${await started.text()}`);
const { url, id } = await started.json() as { url: string; id: string };
log(`Retiro SEP-24 creado: ${id}`);
log(`FORMULARIO (abrir en el navegador antes de 10 min): ${url}`);

const deadline = Date.now() + 15 * 60_000;
let last = "";
let tx: Record<string, string | undefined> = {};
while (Date.now() < deadline) {
  tx = await getTx(id, auth);
  if (tx.status !== last) {
    log(`Estado: ${tx.status}${tx.message ? ` · ${tx.message}` : ""}`);
    last = tx.status ?? "";
  }
  if (tx.status === "pending_user_transfer_start") break;
  if (tx.status === "error" || tx.status === "completed") throw new Error(`Retiro terminó en ${tx.status}: ${tx.message ?? ""}`);
  await new Promise((resolve) => setTimeout(resolve, 5_000));
}
if (tx.status !== "pending_user_transfer_start") throw new Error(`Sin pago pendiente tras 15 min. Último estado: ${last}`);

const destination = tx.withdraw_anchor_account;
const memo = tx.withdraw_memo;
if (!destination || !memo) throw new Error("El ancla no devolvió cuenta o memo de destino.");
const sendAmount = tx.amount_in ?? amount;
log(`Destino: ${destination} · memo ${tx.withdraw_memo_type ?? "id"}: ${memo} · monto ${sendAmount} USDC`);
if (tx.message) log(`Beneficiario: ${tx.message}`);

const hash = await sendPayment({
  from: user,
  to: destination,
  asset: usdcAsset(),
  amount: sendAmount,
  memo,
  memoType: tx.withdraw_memo_type === "text" ? "text" : "id",
});
log(`USDC enviado · hash ${hash} · ${explorerTxUrl(hash)}`);
log(`Horizon confirma: ${(await testnetServer.transactions().transaction(hash).call()).successful}`);

const finalDeadline = Date.now() + 10 * 60_000;
while (Date.now() < finalDeadline) {
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  tx = await getTx(id, auth);
  if (tx.status !== last) {
    log(`Estado: ${tx.status}${tx.message ? ` · ${tx.message}` : ""}`);
    last = tx.status ?? "";
  }
  if (["completed", "error", "refunded"].includes(tx.status ?? "")) break;
}
log(`Final: ${tx.status}${tx.amount_out ? ` · COP ${tx.amount_out}` : ""}`);
log(`USDC después: ${(await balances(user.publicKey())).find((b) => b.asset === "USDC")?.balance}`);

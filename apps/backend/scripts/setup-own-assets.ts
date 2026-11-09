// Activos propios de prueba: BOBT (boliviano) y COPT (peso colombiano) en Stellar Testnet.
// Crea el emisor y la tesorería (llaves en apps/backend/.env, ignorado por Git), fondea con Friendbot,
// crea las trustlines y emite el saldo inicial. Es idempotente: se puede ejecutar varias veces.
// Uso: npm run setup:assets -w @deone/backend
import { appendFileSync } from "node:fs";
import { Asset, Keypair } from "@stellar/stellar-sdk";
import {
  balances,
  ensureTrustline,
  explorerTxUrl,
  fundWithFriendbot,
  sendPayment,
} from "../src/stellar/accounts.js";

const ENV_FILE = new URL("../.env", import.meta.url).pathname;
const log = (message: string) => console.log(message);

function keypairFrom(name: string): Keypair {
  const existing = process.env[name];
  if (existing) return Keypair.fromSecret(existing);
  const created = Keypair.random();
  appendFileSync(ENV_FILE, `${name}=${created.secret()}\n`, { mode: 0o600 });
  process.env[name] = created.secret();
  log(`${name} creada y guardada en .env (${created.publicKey()})`);
  return created;
}

const user1 = keypairFrom("WALLET_USER1_SECRET");
const user2 = keypairFrom("WALLET_USER2_SECRET");
const issuer = keypairFrom("STELLAR_ASSET_ISSUER_SECRET");
const treasury = keypairFrom("STELLAR_TREASURY_SECRET");

const BOBT = new Asset("BOBT", issuer.publicKey());
const COPT = new Asset("COPT", issuer.publicKey());

// Cantidades de prueba. Son saldos sin valor real.
const BOBT_TO_USER1 = "10000";
const COPT_TO_TREASURY = "1000000";
const COPT_TO_USER2 = "20000"; // saldo para que Martha pueda enviar en pruebas
const BOBT_TO_TREASURY = "1000000"; // inventario para pagar remesas de COP a BOB

log("Fondeando cuentas con Friendbot…");
for (const account of [issuer, treasury]) await fundWithFriendbot(account.publicKey());

log("Creando trustlines…");
const trustlines: Array<[string, Keypair, Asset]> = [
  ["user1 → BOBT", user1, BOBT],
  ["user2 → COPT", user2, COPT],
  ["treasury → BOBT", treasury, BOBT],
  ["treasury → COPT", treasury, COPT],
];
for (const [label, signer, asset] of trustlines) {
  const hash = await ensureTrustline(signer, asset);
  log(`  ${label}: ${hash ? explorerTxUrl(hash) : "ya existía"}`);
}

async function balanceOf(account: string, code: string) {
  return (await balances(account)).find((entry) => entry.asset === code)?.balance ?? "0";
}

log("Emitiendo saldo inicial (completando hasta el objetivo)…");
const targets: Array<[string, Keypair, Asset, string]> = [
  ["user1", user1, BOBT, BOBT_TO_USER1],
  ["user2", user2, COPT, COPT_TO_USER2],
  ["treasury", treasury, BOBT, BOBT_TO_TREASURY],
  ["treasury", treasury, COPT, COPT_TO_TREASURY],
];
for (const [label, account, asset, target] of targets) {
  const current = await balanceOf(account.publicKey(), asset.getCode());
  const missing = Number(target) - Number(current);
  if (missing <= 0) {
    log(`  ${label} ya tiene ${current} ${asset.getCode()}`);
    continue;
  }
  const amount = missing.toFixed(7);
  const hash = await sendPayment({ from: issuer, to: account.publicKey(), asset, amount, memo: `DeOne ${asset.getCode()} test` });
  log(`  ${asset.getCode()} +${amount} → ${label}: ${explorerTxUrl(hash)}`);
}

log("\nSaldos:");
for (const [label, account] of [["issuer", issuer], ["treasury", treasury], ["user1", user1], ["user2", user2]] as const) {
  log(`  ${label} ${account.publicKey()}: ${JSON.stringify(await balances(account.publicKey()))}`);
}

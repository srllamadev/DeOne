import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const [baseUrl, result] = process.argv.slice(2);
if (!baseUrl || !["success", "failed"].includes(result)) {
  console.error("Uso: node apps/backend/scripts/qa-ramps.mjs http://127.0.0.1:4401 success|failed");
  process.exit(2);
}

async function request(path, { body, headers = {} } = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  assert.ok(response.ok, `${path} devolvió HTTP ${response.status}: ${response.ok ? "" : await response.text()}`);
  return response;
}

async function wallet(cookie) {
  return (await request("/api/wallet", { headers: { Cookie: cookie } })).json();
}

const health = await (await request("/api/health")).json();
assert.equal(health.mode, "demo");
assert.equal(health.stellarMode, "simulated", "Ejecuta esta prueba con STELLAR_MODE=simulated");

const profile = await request("/api/demo/profile", { body: { id: "martha" } });
const marthaCookie = profile.headers.get("set-cookie")?.split(";")[0];
assert.ok(marthaCookie, "La API debe devolver la cookie de Martha");
const [beforeLidia, beforeMartha] = await Promise.all([wallet(""), wallet(marthaCookie)]);
assert.equal(beforeLidia.profile.id, "lidia");
assert.equal(beforeMartha.profile.id, "martha");

const quote = await (await request("/api/quotes", {
  body: { recipientAlias: "@martha", sendAmountMinor: 1000 },
})).json();
assert.equal(quote.sendAmountMinor, 1000);
assert.equal(quote.feeMinor, 50);
assert.equal(quote.receiveAmountMinor, 450_000);

const confirmation = { body: { quoteId: quote.id }, headers: { "Idempotency-Key": quote.id } };
const started = await (await request("/api/remittances", confirmation)).json();
const replay = await (await request("/api/remittances", confirmation)).json();
assert.equal(replay.id, started.id, "La confirmación repetida debe devolver la misma remesa");

const terminal = new Set(["COMPLETED", "FAILED", "REVIEW_REQUIRED"]);
const observed = new Set([started.status, replay.status]);
const deadline = Date.now() + 10_000;
let remittance = replay;
while (!terminal.has(remittance.status) && Date.now() < deadline) {
  await setTimeout(150);
  remittance = await (await request(`/api/remittances/${started.id}`)).json();
  observed.add(remittance.status);
}

const success = result === "success";
assert.equal(remittance.status, success ? "COMPLETED" : "REVIEW_REQUIRED");
assert.equal(remittance.stellarMode, "simulated");
assert.equal(remittance.txHash, undefined);

const [afterLidia, afterMartha] = await Promise.all([wallet(""), wallet(marthaCookie)]);
const debits = afterLidia.entries.filter((entry) => entry.remittanceId === started.id);
const credits = afterMartha.entries.filter((entry) => entry.remittanceId === started.id);
assert.deepEqual(debits.map((entry) => entry.amountMinor), [-1000]);
assert.deepEqual(credits.map((entry) => entry.amountMinor), success ? [450_000] : []);
assert.equal(afterLidia.availableMinor - beforeLidia.availableMinor, -1000);
assert.equal(afterMartha.availableMinor - beforeMartha.availableMinor, success ? 450_000 : 0);

console.log(JSON.stringify({
  result,
  remittanceId: started.id,
  observed: [...observed],
  status: remittance.status,
  lidiaBeforeMinor: beforeLidia.availableMinor,
  lidiaAfterMinor: afterLidia.availableMinor,
  marthaBeforeMinor: beforeMartha.availableMinor,
  marthaAfterMinor: afterMartha.availableMinor,
  debits: debits.length,
  credits: credits.length,
}, null, 2));

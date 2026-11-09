import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { test } from "node:test";
import type { SettlementLeg, StellarRail } from "../stellar/rail.js";
import { DemoRemittances } from "./service.js";

function recordingRail(legs: SettlementLeg[]): StellarRail {
  return {
    mode: "simulated",
    async settle(leg, hooks) {
      legs.push(leg);
      hooks.onCollected("collect-hash");
      return { payoutHash: "payout-hash" };
    },
  };
}

const noopPayIn = { async collect() {} };
const okPayOut = { async disburse() {} };

test("Lidia envía BOB a Martha: tasa, tramos on-chain y saldos", async () => {
  const legs: SettlementLeg[] = [];
  const service = new DemoRemittances(noopPayIn, recordingRail(legs), okPayOut);
  const lidiaBefore = service.wallet("lidia").availableMinor;
  const marthaBefore = service.wallet("martha").availableMinor;

  const quote = service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 1_000 });
  assert.equal(quote.receiveAmountMinor, 450_000);
  const remittance = service.send("lidia", quote.id, "same-key");
  assert.equal(service.send("lidia", quote.id, "same-key").id, remittance.id);
  assert.throws(() => service.send("lidia", quote.id, "another-key"), /ya fue utilizada/);
  await setImmediate();

  assert.equal(service.get(remittance.id).status, "COMPLETED");
  assert.equal(service.get(remittance.id).txHash, "collect-hash");
  assert.equal(service.get(remittance.id).payoutTxHash, "payout-hash");
  assert.deepEqual(legs, [{
    sender: "lidia", recipient: "martha",
    sendCurrency: "BOB", sendAmount: "10.00",
    receiveCurrency: "COP", receiveAmount: "4500.00",
  }]);
  assert.equal(service.wallet("lidia").availableMinor, lidiaBefore - 1_000);
  assert.equal(service.wallet("martha").availableMinor, marthaBefore + 450_000);
  assert.equal(service.wallet("martha").entries.filter((entry) => entry.remittanceId === remittance.id).length, 1);
});

test("Martha envía COP a Lidia: la tasa es inversa y el tramo sale en COPT y BOBT", async () => {
  const legs: SettlementLeg[] = [];
  const service = new DemoRemittances(noopPayIn, recordingRail(legs), okPayOut);
  const lidiaBefore = service.wallet("lidia").availableMinor;
  const marthaBefore = service.wallet("martha").availableMinor;

  const quote = service.quote("martha", { recipientAlias: "@lidia", sendAmountMinor: 1_000_000 });
  assert.equal(quote.feeMinor, 100_000);
  assert.equal(quote.receiveAmountMinor, 1_900);
  const remittance = service.send("martha", quote.id, "martha-1");
  await setImmediate();

  assert.equal(service.get(remittance.id).status, "COMPLETED");
  assert.deepEqual(legs, [{
    sender: "martha", recipient: "lidia",
    sendCurrency: "COP", sendAmount: "10000.00",
    receiveCurrency: "BOB", receiveAmount: "19.00",
  }]);
  assert.equal(service.wallet("martha").availableMinor, marthaBefore - 1_000_000);
  assert.equal(service.wallet("lidia").availableMinor, lidiaBefore + 1_900);
  assert.equal(service.wallet("lidia").entries[0].remittanceId, remittance.id);
});

test("un usuario no puede enviar con la cotización de otro", () => {
  const service = new DemoRemittances(noopPayIn, recordingRail([]), okPayOut);
  const quote = service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 1_000 });
  assert.throws(() => service.send("martha", quote.id, "stolen"), (error: Error & { status?: number }) => error.status === 403);
});

test("alias desconocido, mismo destinatario o monto fuera de rango se rechazan", () => {
  const service = new DemoRemittances(noopPayIn, recordingRail([]), okPayOut);
  assert.throws(() => service.quote("lidia", { recipientAlias: "@nadie", sendAmountMinor: 1_000 }), /No encontramos ese alias/);
  assert.throws(() => service.quote("lidia", { recipientAlias: "@lidia", sendAmountMinor: 1_000 }), /No encontramos ese alias/);
  assert.throws(() => service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 50 }), /entre Bs 1,00 y Bs 100,00/);
  assert.throws(() => service.quote("martha", { recipientAlias: "@lidia", sendAmountMinor: 100_000 }), /entre \$5\.000 y \$100\.000 COP/);
});

test("un fallo de desembolso deja la remesa en revisión sin acreditar al destinatario", async () => {
  const service = new DemoRemittances(
    noopPayIn,
    recordingRail([]),
    { async disburse() { throw new Error("Pago fallido"); } },
  );
  const marthaBefore = service.wallet("martha").availableMinor;
  const quote = service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 1_000 });
  const remittance = service.send("lidia", quote.id, "payout-failed");
  await setImmediate();

  assert.equal(service.get(remittance.id).status, "REVIEW_REQUIRED");
  assert.equal(service.wallet("martha").availableMinor, marthaBefore);
  assert.equal(service.wallet("martha").entries.some((entry) => entry.remittanceId === remittance.id), false);
});

import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { test } from "node:test";
import { DemoRemittances } from "./service.js";

test("una cotización se consume una vez y el reintento no vuelve a abonar", async () => {
  const service = new DemoRemittances(
    { async collect() {} },
    { mode: "simulated", async settle(amount) { assert.equal(amount, "1.2000000"); } },
    { async disburse() {} },
  );
  const from = service.wallet("lidia").availableMinor;
  const to = service.wallet("martha").availableMinor;
  const quote = service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 1_000 });

  assert.equal(quote.receiveAmountMinor, 450_000);
  const remittance = service.send("lidia", quote.id, "same-key");
  assert.equal(service.send("lidia", quote.id, "same-key").id, remittance.id);
  assert.throws(() => service.send("lidia", quote.id, "another-key"), /ya fue utilizada/);
  await setImmediate();

  assert.equal(service.get(remittance.id).status, "COMPLETED");
  assert.equal(service.wallet("lidia").availableMinor, from - 1_000);
  assert.equal(service.wallet("martha").availableMinor, to + 450_000);
  assert.equal(service.wallet("martha").entries.filter((entry) => entry.remittanceId === remittance.id).length, 1);
});

test("un fallo de desembolso deja la remesa en revisión sin acreditar COP", async () => {
  const service = new DemoRemittances(
    { async collect() {} },
    { mode: "simulated", async settle() {} },
    { async disburse() { throw new Error("Pago fallido"); } },
  );
  const to = service.wallet("martha").availableMinor;
  const quote = service.quote("lidia", { recipientAlias: "@martha", sendAmountMinor: 1_000 });
  const remittance = service.send("lidia", quote.id, "payout-failed");
  await setImmediate();

  assert.equal(service.get(remittance.id).status, "REVIEW_REQUIRED");
  assert.equal(service.wallet("martha").availableMinor, to);
  assert.equal(service.wallet("martha").entries.some((entry) => entry.remittanceId === remittance.id), false);
});

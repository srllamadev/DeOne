import assert from "node:assert/strict";
import { test } from "node:test";
import { assertStellarAmount } from "./accounts.js";

test("acepta importes positivos con hasta 7 decimales", () => {
  assert.equal(assertStellarAmount("1"), "1");
  assert.equal(assertStellarAmount("1.2000001"), "1.2000001");
});

test("rechaza cero, negativos, texto y más de 7 decimales", () => {
  for (const bad of ["0", "0.0", "-1", "abc", "1.00000001", "", "1,5"]) {
    assert.throws(() => assertStellarAmount(bad), /Importe inválido/, bad);
  }
});

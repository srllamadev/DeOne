import { setTimeout } from "node:timers/promises";
import type { Remittance } from "@deone/contracts";

export interface PayInProvider {
  collect(remittance: Remittance): Promise<void>;
}

export interface PayOutProvider {
  disburse(remittance: Remittance): Promise<void>;
}

export function demoRamps(payoutResult: "success" | "failed") {
  const payIn: PayInProvider = {
    async collect() {
      await setTimeout(600);
    },
  };
  const payOut: PayOutProvider = {
    async disburse() {
      await setTimeout(900);
      if (payoutResult === "failed") throw new Error("Fallo de desembolso simulado");
    },
  };
  return { payIn, payOut };
}

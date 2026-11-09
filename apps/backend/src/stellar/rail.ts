import { setTimeout } from "node:timers/promises";
import type { Currency, ProfileId } from "@deone/contracts";

export interface SettlementLeg {
  sender: ProfileId;
  recipient: ProfileId;
  sendCurrency: Currency;
  sendAmount: string;
  receiveCurrency: Currency;
  receiveAmount: string;
}

export interface SettlementHooks {
  /** Se llama en cuanto el tramo de cobro queda confirmado en la cadena. */
  onCollected(hash: string): void;
}

export interface SettlementResult {
  payoutHash?: string;
}

export interface StellarRail {
  readonly mode: "simulated" | "testnet";
  settle(leg: SettlementLeg, hooks: SettlementHooks): Promise<SettlementResult>;
}

export const simulatedRail: StellarRail = {
  mode: "simulated",
  async settle() {
    await setTimeout(900);
    return {};
  },
};

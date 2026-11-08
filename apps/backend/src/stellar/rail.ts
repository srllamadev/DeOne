import { setTimeout } from "node:timers/promises";

export interface StellarRail {
  readonly mode: "simulated" | "testnet";
  settle(amount: string, onPrepared: (hash: string) => void): Promise<void>;
}

export const simulatedRail: StellarRail = {
  mode: "simulated",
  async settle() {
    await setTimeout(900);
  },
};

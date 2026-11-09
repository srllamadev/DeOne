import type { Currency, Profile } from "@deone/contracts";

export class RouteError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

// Montos en unidades menores (centavos). Tasas de la demo, no de mercado.
const LIMITS: Record<Currency, { min: number; max: number; label: string }> = {
  BOB: { min: 100, max: 10_000, label: "Bs 1,00 y Bs 100,00" },
  COP: { min: 500_000, max: 10_000_000, label: "$5.000 y $100.000 COP" },
};

const FEE_MINOR: Record<Currency, number> = {
  BOB: 50, // Bs 0,50
  COP: 100_000, // $1.000 COP
};

/**
 * Tasa de la demo: Bs 9,50 = $4.500 COP (la misma del ejemplo de la demo).
 * Se aplica en ambos sentidos con el mismo par.
 */
const BOB_TO_COP = { numerator: 450_000, denominator: 950 };
// COP → BOB: recíproco exacto de la misma tasa.
const COP_TO_BOB = { numerator: 950, denominator: 450_000 };

export interface Route {
  feeMinor: number;
  receiveAmountMinor: number;
}

export function route(sender: Profile, recipient: Profile, sendAmountMinor: number): Route {
  if (sender.currency === recipient.currency) {
    throw new RouteError(422, "UNSUPPORTED_ROUTE", "Elige un destinatario en otra moneda.");
  }
  const limits = LIMITS[sender.currency];
  if (!Number.isSafeInteger(sendAmountMinor) || sendAmountMinor < limits.min || sendAmountMinor > limits.max) {
    throw new RouteError(422, "INVALID_AMOUNT", `Ingresa un monto entre ${limits.label}.`);
  }

  const feeMinor = FEE_MINOR[sender.currency];
  const net = sendAmountMinor - feeMinor;
  const rate = sender.currency === "BOB" ? BOB_TO_COP : COP_TO_BOB;
  return { feeMinor, receiveAmountMinor: Math.floor((net * rate.numerator) / rate.denominator) };
}

/** Convierte un monto en centavos a una cadena decimal para Stellar (2 decimales). */
export function minorToToken(minor: number): string {
  return (minor / 100).toFixed(2);
}

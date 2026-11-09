import type { Currency, UtilityId } from "@deone/contracts";

// Facturas de demo. Son simuladas: no hay proveedor real detrás.
export const UTILITY_CATALOG: Array<{ id: UtilityId; name: string; provider: string }> = [
  { id: "water", name: "Agua", provider: "Servicio de agua (demo)" },
  { id: "electricity", name: "Luz", provider: "Energía eléctrica (demo)" },
  { id: "gas", name: "Gas", provider: "Gas domiciliario (demo)" },
];

// Montos en centavos según la moneda de la cuenta.
export const UTILITY_AMOUNTS: Record<Currency, Record<UtilityId, number>> = {
  BOB: { water: 4_550, electricity: 12_000, gas: 3_000 },
  COP: { water: 8_500_000, electricity: 18_000_000, gas: 6_000_000 },
};

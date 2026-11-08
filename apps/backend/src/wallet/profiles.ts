import type { Profile, ProfileId, WalletEntry } from "@deone/contracts";

export const profiles: Record<ProfileId, Profile> = {
  lidia: { id: "lidia", name: "Lidia", alias: "@lidia", currency: "BOB", accountNumber: "9000 0000 001" },
  martha: { id: "martha", name: "Martha", alias: "@martha", currency: "COP", accountNumber: "9000 0000 002" },
};

export const openingBalances: Record<ProfileId, number> = {
  lidia: 1_025_080,
  martha: 245_000_000,
};

const seedAmounts: Record<ProfileId, number[]> = {
  lidia: [20_000, -5_500, -12_000, -3_000, -50_000],
  martha: [20_000_000, -5_500_000, -12_000_000, -3_000_000, -50_000_000],
};

export function openingEntries(id: ProfileId): WalletEntry[] {
  return ["Pago recibido", "Transferencia enviada", "Pago de servicio", "Recarga", "Retiro"]
    .map((label, index) => ({
      id: `${id}-fixture-${index}`,
      label,
      amountMinor: seedAmounts[id][index],
      createdAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
    }));
}

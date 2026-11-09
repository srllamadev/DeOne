import type { ProfileId, StellarBalance, StellarWallet } from "@deone/contracts";
import { Keypair } from "@stellar/stellar-sdk";
import { balances, testnetServer } from "./accounts.js";

// Cada perfil de demo usa una wallet Testnet del .env (ver setup-own-assets).
const SECRET_BY_PROFILE: Record<ProfileId, string> = {
  lidia: "WALLET_USER1_SECRET",
  martha: "WALLET_USER2_SECRET",
};

export function secretFor(profile: ProfileId): string | undefined {
  return process.env[SECRET_BY_PROFILE[profile]];
}

export function addressFor(profile: ProfileId): string | undefined {
  const secret = secretFor(profile);
  return secret ? Keypair.fromSecret(secret).publicKey() : undefined;
}

export async function stellarWallet(profile: ProfileId): Promise<StellarWallet> {
  const address = addressFor(profile);
  if (!address) throw new Error(`Falta ${SECRET_BY_PROFILE[profile]} en apps/backend/.env`);
  try {
    await testnetServer.loadAccount(address);
  } catch {
    return { profile, address, exists: false, balances: [], network: "testnet" };
  }
  const list: StellarBalance[] = await balances(address);
  return { profile, address, exists: true, balances: list, network: "testnet" };
}

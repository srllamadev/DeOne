"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../lib/api";
import { StellarBalances } from "../wallet/stellar-balances";
import { useWallet } from "../wallet/use-wallet";

export function AccountPanel() {
  const router = useRouter();
  const { wallet, error: walletError } = useWallet();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <>
      <h1 className="page-title">Más</h1>
      <div className="panel stack">
        {wallet && <p className="muted">Sesión iniciada como {wallet.profile.name} · {wallet.profile.currency}</p>}
        {walletError && <p role="alert" className="debit">{walletError}</p>}
        <button className="primary-button" disabled={busy} onClick={() => void logout()}>Cerrar sesión</button>
      </div>
      <div className="panel stack">
        <StellarBalances />
      </div>
    </>
  );
}

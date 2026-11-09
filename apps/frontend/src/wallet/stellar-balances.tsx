"use client";

import type { StellarWallet } from "@deone/contracts";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const LABELS: Record<string, string> = {
  BOBT: "Boliviano de prueba",
  COPT: "Peso colombiano de prueba",
  USDC: "USDC de prueba",
  XLM: "Lumen (XLM)",
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function formatAmount(value: string) {
  const [whole, decimals = ""] = value.split(".");
  const grouped = Number(whole).toLocaleString("es-CO");
  const trimmed = decimals.replace(/0+$/, "");
  return trimmed ? `${grouped},${trimmed}` : grouped;
}

export function StellarBalances() {
  const [wallet, setWallet] = useState<StellarWallet>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.stellarWallet().then(
      (data) => { setWallet(data); setLoading(false); },
      (reason: Error) => { setError(reason.message); setLoading(false); },
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="stellar-title" className="stellar-panel">
      <div className="section-title">
        <h2 id="stellar-title">Wallet Stellar · Testnet</h2>
        <button type="button" className="icon-button" onClick={load} disabled={loading} aria-label="Actualizar saldos Stellar">
          <RefreshCw size={18} aria-hidden />
        </button>
      </div>
      {error && <p role="alert" className="debit">{error}</p>}
      {!wallet && !error && <p role="status" className="muted">Consultando Stellar…</p>}
      {wallet && (
        <>
          <p className="muted">
            Dirección{" "}
            <a href={`https://stellar.expert/explorer/testnet/account/${wallet.address}`} target="_blank" rel="noreferrer">
              <span className="money-number">{wallet.address ? shortAddress(wallet.address) : "—"}</span>
            </a>
          </p>
          {!wallet.exists && <p className="muted">La cuenta todavía no existe en Testnet.</p>}
          <ul className="movements">
            {wallet.balances.map((entry) => (
              <li className="movement" key={`${entry.asset}-${entry.issuer ?? "native"}`}>
                <div>
                  <strong>{entry.asset}</strong>
                  <time>{LABELS[entry.asset] ?? entry.asset}</time>
                </div>
                <span className="money-number">{formatAmount(entry.balance)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

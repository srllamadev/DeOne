"use client";

import type { Wallet } from "@deone/contracts";
import { ChevronRight, Copy, Eye, EyeOff, QrCode, ScanLine, UserRound, Wallet as WalletIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Money } from "../lib/money";
import { useWallet } from "./use-wallet";

function MovementList({ wallet, all = false }: { wallet: Wallet; all?: boolean }) {
  const entries = all ? wallet.entries : wallet.entries.slice(0, 5);
  const date = new Intl.DateTimeFormat(wallet.profile.currency === "BOB" ? "es-BO" : "es-CO", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <ul className="movements">
      {entries.map((entry) => (
        <li className="movement" key={entry.id}>
          <div>
            {entry.remittanceId ? <Link href={`/remesas/${entry.remittanceId}`}>{entry.label}</Link> : <strong>{entry.label}</strong>}
            <time dateTime={entry.createdAt}>{date.format(new Date(entry.createdAt))}</time>
          </div>
          <span className={entry.amountMinor > 0 ? "credit" : "debit"}>
            <Money minor={entry.amountMinor} currency={wallet.profile.currency} signed />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Dashboard() {
  const { wallet, error } = useWallet();
  const [hidden, setHidden] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copiado`);
    } catch {
      setCopyStatus(`Copia manualmente ${value}`);
    }
  }

  if (error) return <p role="alert" className="debit">{error}</p>;
  if (!wallet) return <p role="status" className="muted">Cargando wallet…</p>;

  const { profile } = wallet;
  const bolivia = profile.currency === "BOB";
  return (
    <>
      <header className="wallet-header">
        <svg viewBox="0 0 56 56" className="brand" aria-hidden="true">
          <path fill="currentColor" d="M0 0h27a28 28 0 0 1 0 56h1V7L2 27h14v29H0z" />
        </svg>
        <div className="wallet-identity">
          <h1>Hola {profile.name}</h1>
          <div className="account">
            <span className={`flag ${bolivia ? "flag-bo" : "flag-co"}`} role="img" aria-label={bolivia ? "Bolivia" : "Colombia"} />
            <span>Cuenta: <span className="money-number">{profile.accountNumber}</span></span>
            <button className="icon-button copy-account" type="button" aria-label="Copiar número de cuenta" onClick={() => void copy(profile.accountNumber, "Número de cuenta")}>
              <Copy size={17} aria-hidden />
            </button>
          </div>
        </div>
        <Link href="/mas" className="avatar icon-button" aria-label="Cambiar perfil de demo">
          <UserRound size={23} aria-hidden />
        </Link>
      </header>
      <div className="meta-strip">
        <span className="demo-badge">Modo demo</span>
        <span className="copy-feedback" role="status">{copyStatus}</span>
      </div>

      <section className="balance-card" aria-labelledby="balance-title">
        <div className="balance-top">
          <h2 id="balance-title">Saldo disponible</h2>
          <button className="icon-button eye" type="button" onClick={() => setHidden(!hidden)} aria-label={hidden ? "Mostrar saldo" : "Ocultar saldo"}>
            {hidden ? <EyeOff size={23} aria-hidden /> : <Eye size={23} aria-hidden />}
          </button>
        </div>
        <p className="balance-value">{hidden ? <span aria-label="Saldo oculto">••••••</span> : <Money minor={wallet.availableMinor} currency={profile.currency} />}</p>
      </section>

      <div className="wallet-actions" aria-label="Acciones de la wallet">
        <button type="button" className="wallet-action" onClick={() => void copy(profile.alias, profile.alias)}>
          <QrCode aria-hidden /><span>Cobro</span>
        </button>
        <Link href="/pago" className="wallet-action">
          <ScanLine aria-hidden /><span>Pago</span>
        </Link>
        <button type="button" className="wallet-action" disabled>
          <WalletIcon aria-hidden /><span>Retiro</span><small>Próximamente</small>
        </button>
      </div>

      <section aria-labelledby="movements-title">
        <div className="section-title">
          <h2 id="movements-title">Últimos movimientos</h2>
          <Link href="/movimientos">Ver todos <ChevronRight size={19} aria-hidden /></Link>
        </div>
        <MovementList wallet={wallet} />
      </section>
    </>
  );
}

export function ActivityPage() {
  const { wallet, error } = useWallet();
  return (
    <>
      <h1 className="page-title">Movimientos</h1>
      {error && <p role="alert" className="debit">{error}</p>}
      {!wallet && !error && <p role="status" className="muted">Cargando movimientos…</p>}
      {wallet && <MovementList wallet={wallet} all />}
    </>
  );
}

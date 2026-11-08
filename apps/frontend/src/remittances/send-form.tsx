"use client";

import type { Quote } from "@deone/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "../lib/api";
import { Money } from "../lib/money";
import { useWallet } from "../wallet/use-wallet";

function toMinorUnits(value: string) {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Ingresa el monto sin separador de miles, por ejemplo 10,00.");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function SendForm() {
  const router = useRouter();
  const { wallet, error: walletError } = useWallet();
  const [alias, setAlias] = useState("@martha");
  const [amount, setAmount] = useState("10,00");
  const [quote, setQuote] = useState<Quote>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function getQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setQuote(await api.quote({ recipientAlias: alias, sendAmountMinor: toMinorUnits(amount) }));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(current: Quote) {
    setBusy(true);
    setError("");
    try {
      const remittance = await api.confirm(current.id);
      router.push(`/remesas/${remittance.id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <span className="demo-badge">Modo demo</span>
      <h1 className="page-title">Enviar remesa</h1>
      {walletError && <p role="alert" className="debit">{walletError}</p>}
      {!wallet && !walletError && <p role="status" className="muted">Cargando wallet…</p>}
      {wallet?.profile.id === "martha" && (
        <div className="panel stack">
          <p>La demo envía desde la wallet de Lidia.</p>
          <Link className="text-link" href="/mas">Cambiar de perfil</Link>
        </div>
      )}
      {wallet?.profile.id === "lidia" && (
        quote ? (
          <section className="panel stack" aria-labelledby="quote-title">
            <h2 id="quote-title">Revisa la cotización</h2>
            <p>Martha · {quote.recipient.alias}</p>
            <dl className="summary">
              <div><dt>Envías</dt><dd><Money currency="BOB" minor={quote.sendAmountMinor} /></dd></div>
              <div><dt>Comisión incluida</dt><dd><Money currency="BOB" minor={quote.feeMinor} /></dd></div>
              <div><dt>Martha recibe</dt><dd className="credit"><Money currency="COP" minor={quote.receiveAmountMinor} /></dd></div>
            </dl>
            <p className="muted">Cotización de prueba. Vence a las {new Date(quote.expiresAt).toLocaleTimeString("es-BO")}.</p>
            <button className="primary-button" type="button" onClick={() => void confirm(quote)} disabled={busy}>
              {busy ? "Confirmando…" : "Confirmar envío"}
            </button>
            <button className="text-link" type="button" onClick={() => { setQuote(undefined); setError(""); }} disabled={busy}>Volver a cotizar</button>
          </section>
        ) : (
          <form className="panel stack" onSubmit={getQuote}>
            <label htmlFor="recipient">Alias de la destinataria</label>
            <input id="recipient" value={alias} onChange={(event) => setAlias(event.target.value)} autoCapitalize="none" required />
            <label htmlFor="amount">Monto en Bs</label>
            <input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required />
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Cotizando…" : "Ver cotización"}</button>
          </form>
        )
      )}
      {error && <p role="alert" className="debit form-feedback">{error}</p>}
    </>
  );
}

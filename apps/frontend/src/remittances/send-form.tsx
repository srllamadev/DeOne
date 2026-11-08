"use client";

import type { Quote } from "@deone/contracts";
import { ArrowRight, ChevronRight, Clock3, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "../lib/api";
import { Money } from "../lib/money";
import { useWallet } from "../wallet/use-wallet";
import { RemittanceHeader } from "./remittance-header";
import styles from "./remittance.module.css";

function toMinorUnits(value: string) {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Escribe el monto con hasta dos decimales, por ejemplo 10,00.");
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (minor < 100 || minor > 10_000) throw new Error("Ingresa un monto entre Bs 1,00 y Bs 100,00.");
  return minor;
}

export function SendForm() {
  const router = useRouter();
  const { wallet, error: walletError } = useWallet();
  const [alias, setAlias] = useState("@martha");
  const [amount, setAmount] = useState("10,00");
  const [quote, setQuote] = useState<Quote>();
  const [expired, setExpired] = useState(false);
  const [retryConfirmation, setRetryConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const aliasInput = useRef<HTMLInputElement>(null);
  const editing = useRef(false);

  useEffect(() => {
    if (!quote) {
      if (editing.current) aliasInput.current?.focus();
      return;
    }
    reviewHeading.current?.focus();
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(quote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);

  async function getQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const recipientAlias = alias.trim();
      if (!recipientAlias) throw new Error("Escribe el alias de la persona que recibirá la remesa.");
      const data = await api.quote({ recipientAlias, sendAmountMinor: toMinorUnits(amount) });
      setExpired(false);
      setQuote(data);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function confirm(current: Quote) {
    if (submitting.current) return;
    if (!retryConfirmation && Date.parse(current.expiresAt) <= Date.now()) {
      setExpired(true);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const remittance = await api.confirm(current.id);
      router.push(`/remesas/${remittance.id}`);
    } catch (reason) {
      const uncertain = !(reason instanceof ApiRequestError) || reason.status >= 500;
      if (reason instanceof ApiRequestError && reason.code === "QUOTE_EXPIRED") setExpired(true);
      setRetryConfirmation(uncertain);
      setError(uncertain
        ? "No pudimos comprobar si se creó el envío. Reintenta esta confirmación para consultar la misma solicitud."
        : (reason as Error).message);
      submitting.current = false;
      setBusy(false);
    }
  }

  function editQuote() {
    editing.current = true;
    setError("");
    setQuote(undefined);
  }

  return (
    <div className={styles.screen}>
      <RemittanceHeader title="Enviar remesa" subtitle="Envía bolivianos y la destinataria recibe pesos colombianos." />

      <div className={styles.route}>
        <span><span className="flag flag-bo" aria-hidden /> Bolivia</span>
        <ArrowRight size={17} aria-hidden />
        <span><span className="flag flag-co" aria-hidden /> Colombia</span>
      </div>

      {walletError && <p role="alert" className={styles.feedback}>{walletError}</p>}
      {!wallet && !walletError && <p role="status" className="panel muted">Cargando perfil…</p>}
      {wallet?.profile.id === "martha" && (
        <section className="panel stack">
          <h2>Cambia al perfil de Lidia</h2>
          <p className="muted">Estás usando el perfil de Martha, que recibe las remesas de prueba en Colombia.</p>
          <Link className="primary-button" href="/mas">Cambiar de perfil</Link>
        </section>
      )}
      {wallet?.profile.id === "lidia" && (
        <>
          <ol className={styles.steps} aria-label="Pasos del envío">
            <li aria-current={!quote ? "step" : undefined}><span>1</span> Datos</li>
            <li aria-current={quote ? "step" : undefined}><span>2</span> Revisión</li>
            <li><span>3</span> Seguimiento</li>
          </ol>

          {quote ? (
            <section className={`panel ${styles.card}`} aria-labelledby="quote-title">
              <div>
                <h2 id="quote-title" ref={reviewHeading} tabIndex={-1}>Revisa la cotización</h2>
                <p className="muted">{quote.recipient.name} · {quote.recipient.alias}</p>
              </div>
              <div className={styles.total}>
                <p className="muted">{quote.recipient.name} recibe</p>
                <p className={`${styles.totalAmount} credit`}><Money currency="COP" minor={quote.receiveAmountMinor} /></p>
              </div>
              <dl className={styles.details}>
                <div><dt>Total que envías</dt><dd><Money currency="BOB" minor={quote.sendAmountMinor} /></dd></div>
                <div><dt>Comisión incluida</dt><dd><Money currency="BOB" minor={quote.feeMinor} /></dd></div>
              </dl>
              <p className={expired ? styles.feedback : styles.expiry} role="status">
                <Clock3 size={18} aria-hidden />
                {expired ? "La cotización venció." : (
                  <>Vence a las <time dateTime={quote.expiresAt}>{new Date(quote.expiresAt).toLocaleTimeString("es-BO")}</time></>
                )}
              </p>
              {error && <p role="alert" className={styles.feedback}>{error}</p>}
              {expired && !retryConfirmation && !busy ? (
                <button className="primary-button" type="button" onClick={editQuote}>Volver a cotizar</button>
              ) : (
                <>
                  <button className="primary-button" type="button" onClick={() => void confirm(quote)} disabled={busy}>
                    {busy ? "Confirmando…" : retryConfirmation ? "Reintentar confirmación" : "Confirmar envío"}
                  </button>
                  {!retryConfirmation && (
                    <button className={`text-link ${styles.edit}`} type="button" onClick={editQuote} disabled={busy}>
                      Editar datos
                    </button>
                  )}
                </>
              )}
            </section>
          ) : (
            <form className={`panel ${styles.card}`} onSubmit={getQuote} aria-labelledby="send-title">
              <div>
                <h2 id="send-title">Datos del envío</h2>
                <p className="muted">Revisa la comisión y el total antes de confirmar.</p>
              </div>
              <div className={styles.field}>
                <label htmlFor="recipient">Alias de la destinataria</label>
                <div className={styles.input}>
                  <UserRound size={20} aria-hidden />
                  <input id="recipient" ref={aliasInput} value={alias} onChange={(event) => setAlias(event.target.value)}
                    autoCapitalize="none" autoComplete="off" spellCheck={false} aria-describedby="recipient-help" disabled={busy} required />
                </div>
                <small id="recipient-help" className="muted">En la demo puedes enviar a @martha.</small>
              </div>
              <div className={styles.field}>
                <label htmlFor="amount">Monto que envías</label>
                <div className={`${styles.input} ${styles.amountInput}`}>
                  <span className="money-unit" aria-hidden>Bs</span>
                  <input id="amount" className="money-number" value={amount} onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal" aria-describedby="balance-help" disabled={busy} required />
                </div>
                <p id="balance-help" className={styles.balance}>
                  <Wallet size={17} aria-hidden /> Saldo disponible <Money currency="BOB" minor={wallet.availableMinor} />
                </p>
              </div>
              {error && <p role="alert" className={styles.feedback}>{error}</p>}
              <button className={`primary-button ${styles.action}`} type="submit" disabled={busy}>
                {busy ? "Cotizando…" : <>Ver cotización <ChevronRight size={19} aria-hidden /></>}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

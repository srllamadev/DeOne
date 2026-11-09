"use client";

import type { Currency, Quote } from "@deone/contracts";
import { ArrowRight, ChevronRight, Clock3, UserRound, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "../lib/api";
import { COUNTRY, Money } from "../lib/money";
import { useWallet } from "../wallet/use-wallet";
import { RemittanceHeader } from "./remittance-header";
import styles from "./remittance.module.css";

// Mismos límites que el backend (apps/backend/src/remittances/rates.ts), en centavos.
const LIMITS: Record<Currency, { min: number; max: number; label: string }> = {
  BOB: { min: 100, max: 10_000, label: "Bs 1,00 y Bs 100,00" },
  COP: { min: 500_000, max: 10_000_000, label: "$5.000 y $100.000 COP" },
};

function toMinorUnits(value: string, currency: Currency) {
  // En COP se aceptan separadores de miles: 10.000 y 10000 son lo mismo.
  const normalized = currency === "COP" ? value.trim().replace(/\.(?=\d{3}(\D|$))/g, "") : value.trim();
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error("Escribe el monto con hasta dos decimales, por ejemplo 10,00.");
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  const limits = LIMITS[currency];
  if (minor < limits.min || minor > limits.max) throw new Error(`Ingresa un monto entre ${limits.label}.`);
  return minor;
}


export function SendForm() {
  const router = useRouter();
  const { wallet, error: walletError } = useWallet();
  const [alias, setAlias] = useState("");
  const [amount, setAmount] = useState("");
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
    if (!wallet) return;
    // Por defecto, la otra persona de la demo y un monto de ejemplo en la moneda de quien envía.
    setAlias(wallet.profile.id === "lidia" ? "@martha" : "@lidia");
    setAmount(wallet.profile.currency === "BOB" ? "10,00" : "10.000");
  }, [wallet]);

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
      if (!wallet) throw new Error("Espera a que cargue tu perfil.");
      const data = await api.quote({ recipientAlias, sendAmountMinor: toMinorUnits(amount, wallet.profile.currency) });
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
      <RemittanceHeader title="Enviar remesa" subtitle="Envía desde tu saldo y la destinataria recibe en su moneda." />

      {wallet && (
        <div className={styles.route}>
          <span><span className={`flag ${COUNTRY[wallet.profile.currency].flag}`} aria-hidden /> {COUNTRY[wallet.profile.currency].name}</span>
          <ArrowRight size={17} aria-hidden />
          <span><span className={`flag ${COUNTRY[wallet.profile.currency === "BOB" ? "COP" : "BOB"].flag}`} aria-hidden /> {COUNTRY[wallet.profile.currency === "BOB" ? "COP" : "BOB"].name}</span>
        </div>
      )}

      {walletError && <p role="alert" className={styles.feedback}>{walletError}</p>}
      {!wallet && !walletError && <p role="status" className="panel muted">Cargando perfil…</p>}
      {wallet && (
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
                <p className={`${styles.totalAmount} credit`}><Money currency={quote.recipient.currency} minor={quote.receiveAmountMinor} /></p>
              </div>
              <dl className={styles.details}>
                <div><dt>Total que envías</dt><dd><Money currency={quote.sender.currency} minor={quote.sendAmountMinor} /></dd></div>
                <div><dt>Comisión incluida</dt><dd><Money currency={quote.sender.currency} minor={quote.feeMinor} /></dd></div>
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
                <small id="recipient-help" className="muted">En la demo puedes enviar a @lidia o @martha.</small>
              </div>
              <div className={styles.field}>
                <label htmlFor="amount">Monto que envías</label>
                <div className={`${styles.input} ${styles.amountInput}`}>
                  <span className="money-unit" aria-hidden>{wallet && wallet.profile.currency === "BOB" ? "Bs" : "COP"}</span>
                  <input id="amount" className="money-number" value={amount} onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal" aria-describedby="balance-help" disabled={busy} required />
                </div>
                <p id="balance-help" className={styles.balance}>
                  <Wallet size={17} aria-hidden /> Saldo disponible <Money currency={wallet.profile.currency} minor={wallet.availableMinor} />
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

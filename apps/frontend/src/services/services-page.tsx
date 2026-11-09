"use client";

import type { UtilityBill, UtilityId } from "@deone/contracts";
import { Check, Droplets, Flame, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "../lib/api";
import { Money } from "../lib/money";
import { RemittanceHeader } from "../remittances/remittance-header";
import { useWallet } from "../wallet/use-wallet";

const ICONS: Record<UtilityId, typeof Droplets> = { water: Droplets, electricity: Zap, gas: Flame };

export function ServicesPage() {
  const { wallet } = useWallet();
  const [bills, setBills] = useState<UtilityBill[]>();
  const [busy, setBusy] = useState<UtilityId>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.utilityBills().then(
      (data) => setBills(data.bills),
      (reason: Error) => setError(reason.message),
    );
  }, []);

  async function pay(bill: UtilityBill) {
    if (busy) return;
    setBusy(bill.id);
    setError("");
    setNotice("");
    try {
      // Una clave nueva por intento: el reintento de un mismo clic no duplica el cobro.
      const updated = await api.payUtility(bill.id, crypto.randomUUID());
      setBills((current) => current?.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`${bill.name} pagado. Se descontó de tu saldo de demo.`);
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? reason.message : (reason as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <>
      <RemittanceHeader title="Servicios" subtitle="Paga tus servicios de demostración con tu saldo." />
      {wallet && <p className="muted">Saldo disponible <Money currency={wallet.profile.currency} minor={wallet.availableMinor} /></p>}
      {error && <p role="alert" className="debit">{error}</p>}
      {notice && <p role="status" className="credit">{notice}</p>}
      {!bills && !error && <p role="status" className="muted">Cargando servicios…</p>}
      <ul className="movements">
        {bills?.map((bill) => {
          const Icon = ICONS[bill.id];
          return (
            <li className="movement" key={bill.id}>
              <div>
                <strong><Icon size={18} aria-hidden /> {bill.name}</strong>
                <time>{bill.provider}</time>
              </div>
              {bill.paid ? (
                <span className="credit"><Check size={16} aria-hidden /> Pagado</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy !== undefined || !wallet}
                  onClick={() => void pay(bill)}
                  aria-label={`Pagar ${bill.name}`}
                >
                  {busy === bill.id ? "Pagando…" : <Money currency={bill.currency} minor={bill.amountMinor} />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

"use client";

import type { Remittance, RemittanceStatus } from "@deone/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Money } from "../lib/money";

const labels: Record<RemittanceStatus, string> = {
  AWAITING_PAYIN: "Esperando cobro simulado",
  PAYIN_CONFIRMED: "Cobro simulado confirmado",
  STELLAR_PENDING: "Procesando el tramo Stellar",
  STELLAR_CONFIRMED: "Tramo Stellar confirmado",
  PAYOUT_PENDING: "Procesando abono simulado",
  COMPLETED: "Remesa completada",
  FAILED: "El cobro simulado falló",
  REVIEW_REQUIRED: "La remesa requiere revisión",
};
const terminal: RemittanceStatus[] = ["COMPLETED", "FAILED", "REVIEW_REQUIRED"];

export function Receipt({ id }: { id: string }) {
  const [remittance, setRemittance] = useState<Remittance>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await api.remittance(id);
        if (!active) return;
        setRemittance(data);
        setError("");
        if (!terminal.includes(data.status)) timer = setTimeout(poll, 1000);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    }

    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [id]);

  return (
    <>
      <span className="demo-badge">Modo demo</span>
      <h1 className="page-title">Seguimiento</h1>
      {error && <p role="alert" className="debit">{error} <button className="text-link" onClick={() => window.location.reload()}>Actualizar</button></p>}
      {!remittance && !error && <p role="status" className="muted">Buscando remesa…</p>}
      {remittance && (
        <section className="panel stack">
          <h2 aria-live="polite">{labels[remittance.status]}</h2>
          <p className="muted">BOB simulado · {remittance.stellarMode === "testnet" ? "Stellar Testnet" : "Stellar simulado"} · COP simulado</p>
          <dl className="summary">
            <div><dt>Monto de origen</dt><dd><Money currency="BOB" minor={remittance.quote.sendAmountMinor} /></dd></div>
            <div><dt>{remittance.status === "COMPLETED" ? "Abono de prueba" : "Abono previsto"}</dt><dd><Money currency="COP" minor={remittance.quote.receiveAmountMinor} /></dd></div>
          </dl>
          {remittance.txHash && (
            <a className="text-link" href={`https://stellar.expert/explorer/testnet/tx/${remittance.txHash}`} target="_blank" rel="noreferrer">
              Consultar hash en Stellar Testnet
            </a>
          )}
          <p className="receipt-id muted">Referencia {remittance.id}</p>
          <Link className="primary-button" href="/">Volver a inicio</Link>
        </section>
      )}
    </>
  );
}

"use client";

import type { Remittance, RemittanceStatus } from "@deone/contracts";
import { Check, CircleAlert, Clock3, ExternalLink, List, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Money } from "../lib/money";
import { RemittanceHeader } from "./remittance-header";
import styles from "./remittance.module.css";

const tracking: Record<RemittanceStatus, { title: string; stage: number }> = {
  AWAITING_PAYIN: { title: "Esperando el cobro", stage: 0 },
  PAYIN_CONFIRMED: { title: "Cobro confirmado", stage: 1 },
  STELLAR_PENDING: { title: "Procesando el tramo Stellar", stage: 1 },
  STELLAR_CONFIRMED: { title: "Tramo Stellar confirmado", stage: 2 },
  PAYOUT_PENDING: { title: "Procesando el abono", stage: 2 },
  COMPLETED: { title: "Remesa completada", stage: 3 },
  FAILED: { title: "El cobro falló", stage: 0 },
  REVIEW_REQUIRED: { title: "Requiere revisión", stage: 1 },
};

function Timeline({ remittance }: { remittance: Remittance }) {
  const { stage } = tracking[remittance.status];
  const stages = [
    { title: "Cobro en Bolivia", description: "Fiat simulado · BOB" },
    { title: "Transferencia por Stellar", description: remittance.stellarMode === "testnet" ? "Stellar Testnet" : "Stellar simulado" },
    { title: "Abono en Colombia", description: "Fiat simulado · COP" },
  ];

  return (
    <ol className={styles.timeline}>
      {stages.map(({ title, description }, index) => {
        const complete = index < stage;
        const failed = index === 0 && remittance.status === "FAILED";
        const review = !complete && remittance.status === "REVIEW_REQUIRED";
        const current = index === stage && !failed && !review;
        const label = complete ? "Confirmado" : failed ? "Falló" : review ? "Por verificar" : current ? "En curso" : "Pendiente";

        return (
          <li key={title} aria-current={current ? "step" : undefined}>
            <span className={styles.stageIcon} data-complete={complete} aria-hidden="true">
              {complete ? <Check size={17} /> : failed || review ? <CircleAlert size={17} /> : index + 1}
            </span>
            <div><strong>{title}</strong><p className="muted">{description}</p></div>
            <span className={complete ? "credit" : failed ? "debit" : "muted"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Receipt({ id }: { id: string }) {
  const [remittance, setRemittance] = useState<Remittance>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await api.remittance(id);
        if (!active) return;
        setRemittance(data);
        setError("");
        if (data.status !== "COMPLETED" && data.status !== "FAILED" && data.status !== "REVIEW_REQUIRED") {
          timer = setTimeout(poll, 2500);
        }
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    }

    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [id, attempt]);

  const completed = remittance?.status === "COMPLETED";
  const failed = remittance?.status === "FAILED";
  const review = remittance?.status === "REVIEW_REQUIRED";
  const StatusIcon = completed ? Check : failed || review ? CircleAlert : Clock3;

  return (
    <div className={styles.screen}>
      <RemittanceHeader title={completed ? "Comprobante" : "Seguimiento"} subtitle="Remesa de Bolivia a Colombia" />
      {error && (
        <div className="panel stack">
          <p role="alert" className={styles.feedback}>{error}</p>
          <button className="primary-button" type="button" onClick={() => { setError(""); setAttempt(attempt + 1); }}>
            Reintentar consulta
          </button>
        </div>
      )}
      {!remittance && !error && <p role="status" className="panel muted">Buscando remesa…</p>}
      {remittance && (
        <>
          <section className={`panel ${styles.card}`} aria-labelledby="status-title">
            <div className={styles.status} role="status">
              <span className={styles.statusIcon} data-status={remittance.status}><StatusIcon size={22} aria-hidden /></span>
              <div>
                <h2 id="status-title">{tracking[remittance.status].title}</h2>
                <p className="muted">
                  {completed ? "Se confirmó el abono de prueba en Colombia."
                    : failed ? "El cobro falló y el saldo reservado quedó disponible."
                    : review ? "El abono en Colombia sigue sin confirmar. Conserva la referencia para consultar el envío."
                    : "El estado se actualiza automáticamente."}
                </p>
              </div>
            </div>
            <div className={styles.total}>
              <p className="muted">{completed ? "Abono simulado" : "Abono previsto"} · {remittance.quote.recipient.name}</p>
              <p className={`${styles.totalAmount} ${completed ? "credit" : ""}`}><Money currency="COP" minor={remittance.quote.receiveAmountMinor} /></p>
            </div>
            <dl className={styles.details}>
              <div><dt>Monto de origen</dt><dd><Money currency="BOB" minor={remittance.quote.sendAmountMinor} /></dd></div>
              <div><dt>Comisión incluida</dt><dd><Money currency="BOB" minor={remittance.quote.feeMinor} /></dd></div>
            </dl>
          </section>

          <section className={`panel ${styles.card}`} aria-labelledby="timeline-title">
            <h2 id="timeline-title">Etapas de la remesa</h2>
            <Timeline remittance={remittance} />
            {remittance.stellarMode === "testnet" && remittance.txHash && (
              <a className={`text-link ${styles.explorer}`} href={`https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(remittance.txHash)}`} target="_blank" rel="noreferrer">
                Ver transacción en Stellar Testnet <ExternalLink size={17} aria-hidden />
              </a>
            )}
            <dl className={styles.reference}>
              <dt>Referencia de la remesa</dt><dd className="receipt-id">{remittance.id}</dd>
            </dl>
          </section>
          <Link className={`primary-button ${styles.action}`} href={completed ? "/movimientos" : "/"}>
            {completed ? <><List size={19} aria-hidden /> Ver movimientos</> : <><Wallet size={19} aria-hidden /> Volver a inicio</>}
          </Link>
        </>
      )}
    </div>
  );
}

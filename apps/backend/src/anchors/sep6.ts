import type { AnchorEndpoints } from "./sep10.js";

export interface WithdrawKyc {
  first_name: string;
  last_name: string;
  email_address: string;
  id_type: string;
  id_number: string;
  /** Llave Bre-B del beneficiario. Se envía en cada retiro, nunca se hereda. */
  bank_account_number: string;
}

export interface Sep6Transaction {
  id: string;
  kind: string;
  status: string;
  message?: string;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  stellar_transaction_id?: string;
  more_info_url?: string;
}

const POLL_MS = 5_000;
const MAX_WAIT_MS = 4 * 60_000;
const KYC_MAX_SENDS = 2;

async function getJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${url} respondió HTTP ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

/** Inicia un retiro USDC → Bre-B por SEP-6 y espera al estado en que hay que enviar el USDC. */
export async function sep6Withdraw(params: {
  anchor: AnchorEndpoints;
  token: string;
  account: string;
  amount: string;
  kyc: WithdrawKyc;
  log?: (message: string) => void;
}): Promise<Sep6Transaction> {
  const { anchor, token, account, amount, kyc } = params;
  const log = params.log ?? (() => {});

  // SEP-6: funding_method es obligatorio y debe coincidir con /info; "type" está deprecado.
  const query = new URLSearchParams({ asset_code: "USDC", account, amount, funding_method: "breb" });
  const started = await getJson<{ id: string }>(`${anchor.sep6}/withdraw?${query}`, token);
  log(`Retiro creado: ${started.id}`);

  const deadline = Date.now() + MAX_WAIT_MS;
  let kycSends = 0;
  let last = "";

  while (Date.now() < deadline) {
    const { transaction: tx } = await getJson<{ transaction: Sep6Transaction }>(
      `${anchor.sep6}/transaction?id=${encodeURIComponent(started.id)}`,
      token,
    );
    if (tx.status !== last) {
      log(`Estado: ${tx.status}${tx.message ? ` · ${tx.message}` : ""}`);
      last = tx.status;
    }

    if (tx.status === "pending_user_transfer_start" || tx.status === "completed" || tx.status === "error") {
      return tx;
    }

    if (tx.status === "pending_customer_info_update") {
      // Consulta qué falta realmente en SEP-12 antes de reenviar. Si ya está aceptado, solo se espera al motor.
      const kycState = await getJson<{ status?: string; fields?: Record<string, unknown> }>(
        `${anchor.kyc}/customer?account=${account}&transaction_id=${started.id}`,
        token,
      );
      const missing = Object.keys(kycState.fields ?? {});
      if (missing.length > 0 || kycSends === 0) {
        if (kycSends >= KYC_MAX_SENDS) throw new Error(`El ancla sigue pidiendo datos: ${missing.join(", ") || tx.message}`);
        const put = await fetch(`${anchor.kyc}/customer`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ account, transaction_id: started.id, type: "sep6-withdrawal", ...kyc }),
        });
        if (!put.ok) throw new Error(`SEP-12: PUT rechazado (HTTP ${put.status}): ${await put.text()}`);
        kycSends += 1;
        log(`Datos SEP-12 enviados (intento ${kycSends}${missing.length ? `, faltaban: ${missing.join(", ")}` : ""})`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`El retiro ${started.id} no avanzó en ${MAX_WAIT_MS / 1000} s. Último estado: ${last}`);
}

/** Espera un estado final después de enviar el USDC al ancla. */
export async function sep6WaitFinal(anchor: AnchorEndpoints, token: string, id: string, log?: (m: string) => void) {
  const deadline = Date.now() + MAX_WAIT_MS;
  let last = "";
  while (Date.now() < deadline) {
    const { transaction: tx } = await getJson<{ transaction: Sep6Transaction }>(
      `${anchor.sep6}/transaction?id=${encodeURIComponent(id)}`,
      token,
    );
    if (tx.status !== last) {
      log?.(`Estado: ${tx.status}${tx.message ? ` · ${tx.message}` : ""}`);
      last = tx.status;
    }
    if (["completed", "error", "refunded"].includes(tx.status)) return tx;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`El retiro ${id} no llegó a un estado final. Último estado: ${last}`);
}

import type { ApiError, Quote, QuoteRequest, Remittance, StellarWallet, UtilityBill, UtilityId, Wallet } from "@deone/contracts";

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, cache: "no-store" });
  if (!response.ok) {
    const error: Partial<ApiError> = await response.json().catch(() => ({}));
    throw new ApiRequestError(error.message ?? "No pudimos conectar con DeOne.", response.status, error.code);
  }
  return response.json() as Promise<T>;
}

function post<T>(path: string, body: unknown, headers?: Record<string, string>) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export const api = {
  wallet: () => request<Wallet>("/wallet"),
  stellarWallet: () => request<StellarWallet>("/stellar/wallet"),
  login: (input: { username: string; password: string }) => post<Wallet>("/auth/login", input),
  logout: () => post<Record<string, never>>("/auth/logout", {}),
  quote: (input: QuoteRequest) => post<Quote>("/quotes", input),
  confirm: (quoteId: string) => post<Remittance>("/remittances", { quoteId }, { "Idempotency-Key": quoteId }),
  remittance: (id: string) => request<Remittance>(`/remittances/${encodeURIComponent(id)}`),
  utilityBills: () => request<{ bills: UtilityBill[] }>("/services"),
  payUtility: (id: UtilityId, key: string) => post<UtilityBill>(`/services/${id}/pay`, {}, { "Idempotency-Key": key }),
};

import type { ApiError, ProfileId, Quote, QuoteRequest, Remittance, Wallet } from "@deone/contracts";

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
  selectProfile: (id: ProfileId) => post<Wallet>("/demo/profile", { id }),
  quote: (input: QuoteRequest) => post<Quote>("/quotes", input),
  confirm: (quoteId: string) => post<Remittance>("/remittances", { quoteId }, { "Idempotency-Key": quoteId }),
  remittance: (id: string) => request<Remittance>(`/remittances/${encodeURIComponent(id)}`),
};

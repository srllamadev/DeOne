export type Currency = "BOB" | "COP";
export type ProfileId = "lidia" | "martha";

export interface Profile {
  id: ProfileId;
  name: string;
  alias: string;
  accountNumber: string;
  currency: Currency;
}

export interface WalletEntry {
  id: string;
  label: string;
  amountMinor: number;
  createdAt: string;
  remittanceId?: string;
}

export interface Wallet {
  profile: Profile;
  availableMinor: number;
  entries: WalletEntry[];
}

export interface QuoteRequest {
  recipientAlias: string;
  sendAmountMinor: number;
}

export interface Quote {
  id: string;
  sender: Profile;
  recipient: Profile;
  sendAmountMinor: number;
  feeMinor: number;
  receiveAmountMinor: number;
  expiresAt: string;
  mode: "demo";
}

export type RemittanceStatus =
  | "AWAITING_PAYIN"
  | "PAYIN_CONFIRMED"
  | "STELLAR_PENDING"
  | "STELLAR_CONFIRMED"
  | "PAYOUT_PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REVIEW_REQUIRED";

export interface Remittance {
  id: string;
  quote: Quote;
  status: RemittanceStatus;
  stellarMode: "simulated" | "testnet";
  /** Pago del emisor a la tesorería (tramo de cobro). */
  txHash?: string;
  /** Pago de la tesorería al destinatario (tramo de abono). */
  payoutTxHash?: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

/** Códigos que devuelve la API. `ApiError.code` sigue siendo `string` para no estrechar el contrato ya consumido. */
export const API_ERROR_CODES = {
  INVALID_JSON: "INVALID_JSON",
  INVALID_QUOTE: "INVALID_QUOTE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_CONFIRMATION: "INVALID_CONFIRMATION",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  SENDER_REQUIRED: "SENDER_REQUIRED",
  UNSUPPORTED_ROUTE: "UNSUPPORTED_ROUTE",
  QUOTE_EXPIRED: "QUOTE_EXPIRED",
  QUOTE_USED: "QUOTE_USED",
  KEY_REUSED: "KEY_REUSED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ConfirmRemittanceRequest {
  quoteId: string;
}

export interface HealthResponse {
  status: "ok";
  mode: "demo";
  stellarMode: "simulated" | "testnet";
}

/** Cabecera de `POST /api/remittances`. La web envía el `quoteId` como valor. */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
/** Longitud máxima aceptada por la API. Una clave vacía se rechaza. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 100;

export interface StellarBalance {
  asset: string;
  issuer?: string;
  balance: string;
}

export interface StellarWallet {
  profile: ProfileId;
  address?: string;
  exists: boolean;
  balances: StellarBalance[];
  network: "testnet";
}

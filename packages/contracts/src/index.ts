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

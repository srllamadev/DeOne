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
  txHash?: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

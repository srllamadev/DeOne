import { randomUUID } from "node:crypto";
import type { ProfileId, Quote, QuoteRequest, Remittance, Wallet, WalletEntry } from "@deone/contracts";
import type { PayInProvider, PayOutProvider } from "../ramps/demo.js";
import type { SettlementLeg, StellarRail } from "../stellar/rail.js";
import { openingBalances, openingEntries, profiles } from "../wallet/profiles.js";
import { minorToToken, route, RouteError } from "./rates.js";

export class RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

const PROFILE_IDS = Object.keys(profiles) as ProfileId[];

export class DemoRemittances {
  private readonly balances: Record<ProfileId, number> = { ...openingBalances };
  private readonly entries: Record<ProfileId, WalletEntry[]> = {
    lidia: openingEntries("lidia"),
    martha: openingEntries("martha"),
  };
  private readonly quotes = new Map<string, Quote>();
  private readonly usedQuotes = new Set<string>();
  private readonly remittances = new Map<string, Remittance>();
  private readonly idempotency = new Map<string, Remittance>();
  private queue = Promise.resolve();

  constructor(
    private readonly payIn: PayInProvider,
    private readonly stellar: StellarRail,
    private readonly payOut: PayOutProvider,
  ) {}

  wallet(profile: ProfileId): Wallet {
    return { profile: profiles[profile], availableMinor: this.balances[profile], entries: this.entries[profile] };
  }

  quote(profile: ProfileId, input: QuoteRequest): Quote {
    const recipient = PROFILE_IDS
      .map((id) => profiles[id])
      .find((candidate) => candidate.id !== profile && candidate.alias === input.recipientAlias);
    if (!recipient) throw new RequestError(422, "UNSUPPORTED_ROUTE", "No encontramos ese alias como destinatario.");

    let result;
    try {
      result = route(profiles[profile], recipient, input.sendAmountMinor);
    } catch (error) {
      if (error instanceof RouteError) throw new RequestError(error.status, error.code, error.message);
      throw error;
    }

    const quote: Quote = {
      id: randomUUID(),
      sender: profiles[profile],
      recipient,
      sendAmountMinor: input.sendAmountMinor,
      feeMinor: result.feeMinor,
      receiveAmountMinor: result.receiveAmountMinor,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      mode: "demo",
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  send(profile: ProfileId, quoteId: string, key: string): Remittance {
    const previous = this.idempotency.get(key);
    if (previous) {
      if (previous.quote.sender.id !== profile) throw new RequestError(403, "SENDER_REQUIRED", "Esta remesa pertenece a otro usuario.");
      if (previous.quote.id !== quoteId) throw new RequestError(409, "KEY_REUSED", "La clave ya pertenece a otra cotización.");
      return previous;
    }

    const quote = this.quotes.get(quoteId);
    if (quote && quote.sender.id !== profile) {
      throw new RequestError(403, "SENDER_REQUIRED", "Esta cotización pertenece a otro usuario.");
    }
    if (!quote || Date.parse(quote.expiresAt) <= Date.now()) {
      throw new RequestError(409, "QUOTE_EXPIRED", "La cotización venció. Vuelve a cotizar.");
    }
    if (this.usedQuotes.has(quoteId)) throw new RequestError(409, "QUOTE_USED", "La cotización ya fue utilizada.");
    if (this.balances[profile] < quote.sendAmountMinor) {
      throw new RequestError(409, "INSUFFICIENT_BALANCE", "Saldo disponible insuficiente.");
    }

    const remittance: Remittance = {
      id: randomUUID(),
      quote,
      status: "AWAITING_PAYIN",
      stellarMode: this.stellar.mode,
      createdAt: new Date().toISOString(),
    };

    this.balances[profile] -= quote.sendAmountMinor;
    this.usedQuotes.add(quoteId);
    this.idempotency.set(key, remittance);
    this.remittances.set(remittance.id, remittance);
    this.queue = this.queue.then(() => this.process(remittance));
    return remittance;
  }

  get(id: string): Remittance {
    const remittance = this.remittances.get(id);
    if (!remittance) throw new RequestError(404, "NOT_FOUND", "No encontramos esta remesa.");
    return remittance;
  }

  private async process(remittance: Remittance) {
    const { quote } = remittance;
    const sender = quote.sender.id;
    const recipient = quote.recipient.id;
    try {
      await this.payIn.collect(remittance);
    } catch {
      this.balances[sender] += quote.sendAmountMinor;
      remittance.status = "FAILED";
      return;
    }

    remittance.status = "PAYIN_CONFIRMED";
    this.addEntry(sender, "Remesa enviada", -quote.sendAmountMinor, remittance.id);

    try {
      remittance.status = "STELLAR_PENDING";
      const result = await this.stellar.settle(this.legOf(quote), {
        onCollected: (hash) => { remittance.txHash = hash; },
      });
      remittance.payoutTxHash = result.payoutHash;
      remittance.status = "STELLAR_CONFIRMED";
      remittance.status = "PAYOUT_PENDING";
      await this.payOut.disburse(remittance);
      this.balances[recipient] += quote.receiveAmountMinor;
      this.addEntry(recipient, "Remesa recibida", quote.receiveAmountMinor, remittance.id);
      remittance.status = "COMPLETED";
    } catch {
      remittance.status = "REVIEW_REQUIRED";
    }
  }

  private legOf(quote: Quote): SettlementLeg {
    return {
      sender: quote.sender.id,
      recipient: quote.recipient.id,
      sendCurrency: quote.sender.currency,
      sendAmount: minorToToken(quote.sendAmountMinor),
      receiveCurrency: quote.recipient.currency,
      receiveAmount: minorToToken(quote.receiveAmountMinor),
    };
  }

  private addEntry(profile: ProfileId, label: string, amountMinor: number, remittanceId: string) {
    const entry: WalletEntry = {
      id: randomUUID(),
      label,
      amountMinor,
      remittanceId,
      createdAt: new Date().toISOString(),
    };
    this.entries[profile].unshift(entry);
  }
}


import { randomUUID } from "node:crypto";
import type { ProfileId, Quote, QuoteRequest, Remittance, Wallet, WalletEntry } from "@deone/contracts";
import type { PayInProvider, PayOutProvider } from "../ramps/demo.js";
import type { StellarRail } from "../stellar/rail.js";
import { openingBalances, openingEntries, profiles } from "../wallet/profiles.js";

export class RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export class DemoRemittances {
  private readonly balances = { ...openingBalances };
  private readonly entries = { lidia: openingEntries("lidia"), martha: openingEntries("martha") };
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
    if (profile !== "lidia" || input.recipientAlias !== profiles.martha.alias) {
      throw new RequestError(422, "UNSUPPORTED_ROUTE", "En la demo, Lidia envía a @martha.");
    }
    const amount = input.sendAmountMinor;
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 10_000) {
      throw new RequestError(422, "INVALID_AMOUNT", "Ingresa un monto entre Bs 1,00 y Bs 100,00.");
    }
    const feeMinor = 50;
    const quote: Quote = {
      id: randomUUID(),
      recipient: profiles.martha,
      sendAmountMinor: amount,
      feeMinor,
      receiveAmountMinor: Math.floor((amount - feeMinor) * 4_500 / 950) * 100,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      mode: "demo",
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  send(profile: ProfileId, quoteId: string, key: string): Remittance {
    if (profile !== "lidia") throw new RequestError(403, "SENDER_REQUIRED", "Cambia al perfil de Lidia para enviar.");

    const previous = this.idempotency.get(key);
    if (previous) {
      if (previous.quote.id !== quoteId) {
        throw new RequestError(409, "KEY_REUSED", "La clave ya pertenece a otra cotización.");
      }
      return previous;
    }

    const quote = this.quotes.get(quoteId);
    if (!quote || Date.parse(quote.expiresAt) <= Date.now()) {
      throw new RequestError(409, "QUOTE_EXPIRED", "La cotización venció. Vuelve a cotizar.");
    }
    if (this.usedQuotes.has(quoteId)) throw new RequestError(409, "QUOTE_USED", "La cotización ya fue utilizada.");
    if (this.balances.lidia < quote.sendAmountMinor) {
      throw new RequestError(409, "INSUFFICIENT_BALANCE", "Saldo disponible insuficiente.");
    }

    const remittance: Remittance = {
      id: randomUUID(),
      quote,
      status: "AWAITING_PAYIN",
      stellarMode: this.stellar.mode,
      createdAt: new Date().toISOString(),
    };

    this.balances.lidia -= quote.sendAmountMinor;
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
    try {
      await this.payIn.collect(remittance);
    } catch {
      this.balances.lidia += quote.sendAmountMinor;
      remittance.status = "FAILED";
      return;
    }

    remittance.status = "PAYIN_CONFIRMED";
    this.addEntry("lidia", "Remesa enviada", -quote.sendAmountMinor, remittance.id);

    try {
      remittance.status = "STELLAR_PENDING";
      const amount = ((quote.sendAmountMinor - quote.feeMinor) * 1.2 / 950).toFixed(7);
      await this.stellar.settle(amount, (hash) => { remittance.txHash = hash; });
      remittance.status = "STELLAR_CONFIRMED";
      remittance.status = "PAYOUT_PENDING";
      await this.payOut.disburse(remittance);
      this.balances.martha += quote.receiveAmountMinor;
      this.addEntry("martha", "Remesa recibida", quote.receiveAmountMinor, remittance.id);
      remittance.status = "COMPLETED";
    } catch {
      remittance.status = "REVIEW_REQUIRED";
    }
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

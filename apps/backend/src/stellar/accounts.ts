import { Asset, BASE_FEE, Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

export const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";
// Emisor de USDC de prueba publicado por el ancla de referencia de SDF (ver testanchor.stellar.org/.well-known/stellar.toml).
export const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const testnetServer = new Horizon.Server(TESTNET_HORIZON);

export function createAccount(): Keypair {
  return Keypair.random();
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/** Valida un importe en XLM o USDC: positivo, con hasta 7 decimales. */
export function assertStellarAmount(amount: string): string {
  if (!/^(?!0+(\.0+)?$)\d+(\.\d{1,7})?$/.test(amount)) {
    throw new Error(`Importe inválido: ${amount}. Usa un número positivo con hasta 7 decimales.`);
  }
  return amount;
}

export async function fundWithFriendbot(publicKey: string) {
  const response = await fetch(`${FRIENDBOT}/?addr=${encodeURIComponent(publicKey)}`);
  if (response.ok) return;
  // Friendbot responde error si la cuenta ya fue fondeada. Se verifica que exista en Horizon.
  const exists = await testnetServer.loadAccount(publicKey).then(() => true, () => false);
  if (!exists) throw new Error(`Friendbot no fondeó ${publicKey} (HTTP ${response.status}).`);
}

export async function balances(publicKey: string) {
  const account = await testnetServer.loadAccount(publicKey);
  return account.balances.map((balance) => {
    if (balance.asset_type === "native") return { asset: "XLM", balance: balance.balance };
    if (balance.asset_type === "liquidity_pool_shares") return undefined;
    return { asset: balance.asset_code, issuer: balance.asset_issuer, balance: balance.balance };
  }).filter((entry) => entry !== undefined);
}

export function usdcAsset() {
  return new Asset("USDC", TESTNET_USDC_ISSUER);
}

export async function ensureTrustline(signer: Keypair, asset: Asset) {
  const account = await testnetServer.loadAccount(signer.publicKey());
  const existing = account.balances.some(
    (balance) => balance.asset_type !== "native" && balance.asset_type !== "liquidity_pool_shares"
      && balance.asset_code === asset.getCode() && balance.asset_issuer === asset.getIssuer(),
  );
  if (existing) return undefined;
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(60)
    .build();
  tx.sign(signer);
  const result = await testnetServer.submitTransaction(tx);
  return result.hash;
}

export async function sendPayment(params: {
  from: Keypair;
  to: string;
  asset: Asset;
  amount: string;
  memo: string;
  /** Los anclas como VANK exigen memo de tipo id para identificar el retiro. */
  memoType?: "text" | "id";
}): Promise<string> {
  assertStellarAmount(params.amount);
  const account = await testnetServer.loadAccount(params.from.publicKey());
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: params.to, asset: params.asset, amount: params.amount }))
    .addMemo(params.memoType === "id" ? Memo.id(params.memo) : Memo.text(params.memo.slice(0, 28)))
    .setTimeout(60)
    .build();
  tx.sign(params.from);
  const result = await testnetServer.submitTransaction(tx);
  return result.hash;
}

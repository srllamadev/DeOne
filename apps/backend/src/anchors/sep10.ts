import { Keypair, StellarToml, WebAuth } from "@stellar/stellar-sdk";

export interface AnchorEndpoints {
  domain: string;
  passphrase: string;
  signingKey: string;
  webAuth: string;
  sep6: string;
  sep24Base: string;
  kyc: string;
}

/** Lee el stellar.toml del ancla. Nunca se hardcodean endpoints ni llaves de firma. */
export async function resolveAnchor(domain: string): Promise<AnchorEndpoints> {
  const toml = await StellarToml.Resolver.resolve(domain);
  const required = {
    NETWORK_PASSPHRASE: toml.NETWORK_PASSPHRASE,
    SIGNING_KEY: toml.SIGNING_KEY,
    WEB_AUTH_ENDPOINT: toml.WEB_AUTH_ENDPOINT,
    TRANSFER_SERVER: toml.TRANSFER_SERVER,
    KYC_SERVER: toml.KYC_SERVER,
    TRANSFER_SERVER_SEP0024: toml.TRANSFER_SERVER_SEP0024,
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value) throw new Error(`El stellar.toml de ${domain} no publica ${key}.`);
  }
  return {
    domain,
    passphrase: required.NETWORK_PASSPHRASE as string,
    signingKey: required.SIGNING_KEY as string,
    webAuth: required.WEB_AUTH_ENDPOINT as string,
    sep6: required.TRANSFER_SERVER as string,
    sep24Base: (required.TRANSFER_SERVER_SEP0024 ?? "") as string,
    kyc: required.KYC_SERVER as string,
  };
}

/** SEP-10: firma el desafío con la llave de la cuenta y devuelve el JWT del ancla. */
export async function sep10Token(anchor: AnchorEndpoints, account: Keypair): Promise<string> {
  const challengeResponse = await fetch(`${anchor.webAuth}?account=${account.publicKey()}`);
  if (!challengeResponse.ok) throw new Error(`SEP-10: desafío rechazado (HTTP ${challengeResponse.status}).`);
  const challenge = await challengeResponse.json() as { transaction: string; network_passphrase: string };
  if (challenge.network_passphrase !== anchor.passphrase) {
    throw new Error("SEP-10: el ancla respondió con otra red que la del stellar.toml.");
  }

  // Verifica que el desafío sea del ancla antes de firmarlo.
  const { tx } = WebAuth.readChallengeTx(
    challenge.transaction,
    anchor.signingKey,
    anchor.passphrase,
    anchor.domain,
    anchor.domain,
  );
  tx.sign(account);

  const tokenResponse = await fetch(anchor.webAuth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });
  if (!tokenResponse.ok) throw new Error(`SEP-10: firma rechazada (HTTP ${tokenResponse.status}).`);
  const { token } = await tokenResponse.json() as { token: string };
  return token;
}

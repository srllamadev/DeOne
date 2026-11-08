import type { ProfileId } from "@deone/contracts";
import express, { type ErrorRequestHandler, type Request } from "express";
import { authenticate } from "./auth/users.js";
import { createSession, endSession, SESSION_COOKIE, SESSION_TTL_MS, sessionProfile } from "./auth/sessions.js";
import { demoRamps } from "./ramps/demo.js";
import { DemoRemittances, RequestError } from "./remittances/service.js";
import { simulatedRail } from "./stellar/rail.js";
import { createTestnetRail } from "./stellar/testnet.js";

const mode = process.env.STELLAR_MODE ?? "simulated";
if (mode !== "simulated" && mode !== "testnet") throw new Error("STELLAR_MODE debe ser simulated o testnet");
const payoutResult = process.env.DEMO_PAYOUT_RESULT ?? "success";
if (payoutResult !== "success" && payoutResult !== "failed") throw new Error("DEMO_PAYOUT_RESULT debe ser success o failed");

const { payIn, payOut } = demoRamps(payoutResult);
const service = new DemoRemittances(payIn, mode === "testnet" ? createTestnetRail(process.env) : simulatedRail, payOut);

const app = express();
app.disable("x-powered-by");
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "8kb" }));

function profile(req: Request): ProfileId {
  const id = sessionProfile(req.headers.cookie);
  if (!id) throw new RequestError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
  return id;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: "demo", stellarMode: mode });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const id = typeof username === "string" && typeof password === "string"
    ? authenticate(username.trim().toLowerCase(), password)
    : undefined;
  if (!id) throw new RequestError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.");
  res
    .cookie(SESSION_COOKIE, createSession(id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS })
    .json(service.wallet(id));
});

app.post("/api/auth/logout", (req, res) => {
  endSession(req.headers.cookie);
  res.clearCookie(SESSION_COOKIE, { path: "/" }).json({});
});

app.get("/api/wallet", (req, res) => {
  res.json(service.wallet(profile(req)));
});

app.post("/api/quotes", (req, res) => {
  const { recipientAlias, sendAmountMinor } = req.body ?? {};
  if (typeof recipientAlias !== "string" || typeof sendAmountMinor !== "number") {
    throw new RequestError(400, "INVALID_QUOTE", "Revisa el alias y el monto.");
  }
  res.json(service.quote(profile(req), { recipientAlias: recipientAlias.trim().toLowerCase(), sendAmountMinor }));
});

app.post("/api/remittances", (req, res) => {
  const key = req.get("Idempotency-Key");
  const quoteId = req.body?.quoteId;
  if (!key || key.length > 100 || typeof quoteId !== "string") {
    throw new RequestError(400, "INVALID_CONFIRMATION", "Faltan datos de la confirmación.");
  }
  res.json(service.send(profile(req), quoteId, key));
});

app.get("/api/remittances/:id", (req, res) => {
  res.json(service.get(req.params.id));
});

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof RequestError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ code: "INVALID_JSON", message: "El cuerpo debe ser JSON válido." });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR", message: "No pudimos procesar la solicitud." });
};
app.use(handleError);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";
app.listen(port, host, () => console.log(`DeOne API en http://${host}:${port} · fiat simulado · Stellar ${mode}`));

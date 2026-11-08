import { randomBytes } from "node:crypto";
import type { ProfileId } from "@deone/contracts";

export const SESSION_COOKIE = "deone_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface Session {
  profile: ProfileId;
  expiresAt: number;
}

// Sesiones en memoria: se pierden al reiniciar el backend, igual que el resto de la demo.
const sessions = new Map<string, Session>();

function readCookie(header: string | undefined, name: string) {
  return new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(header ?? "")?.[1];
}

export function createSession(profile: ProfileId) {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { profile, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function sessionProfile(cookieHeader: string | undefined): ProfileId | undefined {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return undefined;
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  return session.profile;
}

export function endSession(cookieHeader: string | undefined) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (token) sessions.delete(token);
}

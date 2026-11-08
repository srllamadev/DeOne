import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { ProfileId } from "@deone/contracts";

interface DemoUser {
  username: string;
  profile: ProfileId;
  salt: Buffer;
  hash: Buffer;
}

const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer) {
  return scryptSync(password, salt, KEY_LENGTH);
}

function createUser(username: string, password: string, profile: ProfileId): DemoUser {
  const salt = randomBytes(16);
  return { username, profile, salt, hash: derive(password, salt) };
}

// Usuarios de demo locales. Las contraseñas no son para producción.
const users: DemoUser[] = [
  createUser("user1", "user1pass", "lidia"),
  createUser("user2", "user2pass", "martha"),
];

export function authenticate(username: string, password: string): ProfileId | undefined {
  const user = users.find((candidate) => candidate.username === username);
  if (!user) {
    // Igualar el tiempo de respuesta para no revelar qué usuarios existen.
    derive(password, Buffer.alloc(16));
    return undefined;
  }
  const attempt = derive(password, user.salt);
  return timingSafeEqual(attempt, user.hash) ? user.profile : undefined;
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { createSession, endSession, sessionProfile } from "./sessions.js";
import { authenticate } from "./users.js";

test("user1 y user2 entran con su contraseña y reciben su perfil", () => {
  assert.equal(authenticate("user1", "user1pass"), "lidia");
  assert.equal(authenticate("user2", "user2pass"), "martha");
});

test("credenciales incorrectas o usuarios inexistentes no abren sesión", () => {
  assert.equal(authenticate("user1", "incorrecta"), undefined);
  assert.equal(authenticate("user1", "user2pass"), undefined);
  assert.equal(authenticate("nadie", "user1pass"), undefined);
});

test("la sesión identifica al perfil y deja de valer al cerrarla", () => {
  const cookie = `deone_session=${createSession("lidia")}`;
  assert.equal(sessionProfile(cookie), "lidia");
  endSession(cookie);
  assert.equal(sessionProfile(cookie), undefined);
  assert.equal(sessionProfile(undefined), undefined);
});

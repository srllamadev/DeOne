"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "../lib/api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login({ username: username.trim(), password });
      router.replace("/");
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Iniciar sesión</h1>
      <form className="panel stack" onSubmit={(event) => void submit(event)}>
        <label>
          Usuario
          <input name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        {error && <p role="alert" className="debit">{error}</p>}
      </form>
    </>
  );
}

"use client";

import type { ProfileId } from "@deone/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../lib/api";

export function ProfilePicker() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(id: ProfileId) {
    setBusy(true);
    setError("");
    try {
      await api.selectProfile(id);
      router.push("/");
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Perfiles de demo</h1>
      <div className="panel stack">
        <p className="muted">Cambia de perfil para seguir la remesa desde los dos lados.</p>
        <button className="primary-button" disabled={busy} onClick={() => void choose("lidia")}>Lidia · Bolivia</button>
        <button className="primary-button" disabled={busy} onClick={() => void choose("martha")}>Martha · Colombia</button>
        {error && <p role="alert" className="debit">{error}</p>}
      </div>
    </>
  );
}

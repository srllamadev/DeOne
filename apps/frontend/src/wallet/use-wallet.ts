"use client";

import { useEffect, useState } from "react";
import type { Wallet } from "@deone/contracts";
import { api } from "../lib/api";

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.wallet().then(
      (data) => { if (active) setWallet(data); },
      (reason: Error) => { if (active) setError(reason.message); },
    );
    return () => { active = false; };
  }, []);

  return { wallet, error };
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Wallet } from "@deone/contracts";
import { api, ApiRequestError } from "../lib/api";

export function useWallet() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.wallet().then(
      (data) => { if (active) setWallet(data); },
      (reason: Error) => {
        if (!active) return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          router.replace("/login");
          return;
        }
        setError(reason.message);
      },
    );
    return () => { active = false; };
  }, [router]);

  return { wallet, error };
}

"use client";

import { useState, useEffect } from "react";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/accounting/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(
            (data || []).map((a: any) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
            }))
          );
        } else {
          setError("Error loading accounts");
        }
      } catch (e) {
        setError("Error fetching accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return { accounts, isLoading, error };
}

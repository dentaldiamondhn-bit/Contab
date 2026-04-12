"use client";

import { useMemo } from "react";

// Mock account data - in a real app, this would come from your database/API
const mockAccounts = [
  { id: "1010", name: "Cash in Bank", type: "ASSET" },
  { id: "1200", name: "Accounts Receivable", type: "ASSET" },
  { id: "1500", name: "Dental Equipment", type: "ASSET" },
  { id: "1600", name: "Clinical Supplies Inventory", type: "ASSET" },
  { id: "2010", name: "Accounts Payable", type: "LIABILITY" },
  { id: "2500", name: "Medical Equipment Loans", type: "LIABILITY" },
  { id: "3010", name: "Owner Investment", type: "EQUITY" },
  { id: "3900", name: "Retained Earnings", type: "EQUITY" },
  { id: "4010", name: "Patient Service Revenue", type: "REVENUE" },
  { id: "4020", name: "Laboratory Fees Revenue", type: "REVENUE" },
  { id: "5010", name: "Dental Supplies Expense", type: "EXPENSE" },
  { id: "5020", name: "Rent Expense", type: "EXPENSE" },
  { id: "5030", name: "Staff Salaries", type: "EXPENSE" },
  { id: "5040", name: "Software/SaaS Subscriptions", type: "EXPENSE" },
];

export interface Account {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
}

export function useAccounts() {
  // In a real application, you would fetch this from your API
  // const { data: accounts, isLoading, error } = useSWRAccounts();
  
  const accounts = useMemo(() => mockAccounts, []);
  
  return {
    accounts,
    isLoading: false,
    error: null,
  };
}

// Future implementation for real data fetching:
/*
export function useAccounts() {
  const { data, error, isLoading } = useSWRAccounts();
  
  return {
    accounts: data || [],
    isLoading,
    error,
  };
}
*/

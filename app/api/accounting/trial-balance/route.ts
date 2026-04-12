import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    
    const supabase = createSupabaseClient();
    
    // Obtener transacciones con sus JournalEntries y Accounts
    let query = supabase
      .from("Transaction")
      .select(`
        *,
        JournalEntry (
          *,
          Account (
            id,
            code,
            name,
            type
          )
        )
      `)
      .in("tenantId", ['1', 'tenant_001']);
    
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }
    
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Error fetching transactions" },
        { status: 500 }
      );
    }
    
    console.log("🔍 Trial Balance - Transactions fetched:", transactions?.length || 0);
    
    // Agrupar por cuenta
    const accountBalances = new Map<string, {
      account: any;
      debit: number;
      credit: number;
      balance: number;
    }>();
    
    transactions?.forEach((transaction: any) => {
      transaction.JournalEntry?.forEach((entry: any) => {
        if (!entry.Account) return;
        
        const accountId = entry.Account.id;
        const existing = accountBalances.get(accountId);
        
        // En JournalEntry, los montos positivos son débitos, negativos créditos
        // O podría ser al revés dependiendo de la convención
        const amount = parseFloat(entry.amount) || 0;
        const isDebit = entry.type === 'DEBIT' || amount > 0;
        const absAmount = Math.abs(amount);
        
        if (existing) {
          if (isDebit) {
            existing.debit += absAmount;
          } else {
            existing.credit += absAmount;
          }
          existing.balance = existing.debit - existing.credit;
        } else {
          accountBalances.set(accountId, {
            account: entry.Account,
            debit: isDebit ? absAmount : 0,
            credit: isDebit ? 0 : absAmount,
            balance: isDebit ? absAmount : -absAmount,
          });
        }
      });
    });
    
    // Convertir a array y filtrar solo cuentas con movimientos
    const result = Array.from(accountBalances.values())
      .filter(item => item.debit > 0 || item.credit > 0)
      .map(item => ({
        account: item.account,
        debit: item.debit,
        credit: item.credit,
        balance: item.balance,
      }))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));
    
    console.log("🔍 Trial Balance - Result:", result.length, "accounts with movements");
    console.log("🔍 Sample:", result[0]);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching trial balance:", error);
    return NextResponse.json(
      { error: "Error fetching trial balance" },
      { status: 500 }
    );
  }
}

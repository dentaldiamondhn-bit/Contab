import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Contexto validado. Antes tomaba `?tenantId`/`?companyId` sin comprobar
    // pertenencia y, sin ellos, caia a un `.in("tenantId", ['1','tenant_001'])`
    // que mezclaba empresas.
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);

    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    // Usar service_role para bypass RLS y soportar ANGELOH7
    const supabase = supabaseService;

    // Obtener transacciones con sus JournalEntries y Accounts — filtrado por empresa/tenant
    let query: any = supabase
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
      .match(scope);

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
      lastDate: string;
    }>();
    
    transactions?.forEach((transaction: any) => {
      const txDate = transaction.date || '';
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
          if (String(txDate) > String(existing.lastDate)) existing.lastDate = txDate;
        } else {
          accountBalances.set(accountId, {
            account: entry.Account,
            debit: isDebit ? absAmount : 0,
            credit: isDebit ? 0 : absAmount,
            balance: isDebit ? absAmount : -absAmount,
            lastDate: txDate,
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
        date: item.lastDate,
      }))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));
    
    console.log("🔍 Trial Balance - Result:", result.length, "accounts with movements");
    console.log("🔍 Sample:", result[0]);
    
    return NextResponse.json(result);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching trial balance:", error);
    return NextResponse.json(
      { error: "Error fetching trial balance" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

async function fetchDetailed(
  scope: Record<string, string>,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<any[]> {
  let q: any = supabaseService
    .from("Transaction")
    .select(`*, JournalEntry (*, Account (id, code, name, type))`);
  if (startDate) q = q.gte("date", startDate.toISOString());
  if (endDate) q = q.lte("date", endDate.toISOString());
  q = q.match(scope);
  q = q.order("date", { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(error.message || "Error al consultar las transacciones");
  return data || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Contexto validado: antes tomaba `?tenantId`/`?companyId` de la query sin
    // comprobar pertenencia.
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const transactions = await fetchDetailed(scope, startDate, endDate);

    const items: any[] = [];
    (transactions || []).forEach((tx: any) => {
      const txDate = tx.date || "";
      if (!Array.isArray(tx.JournalEntry)) return;
      tx.JournalEntry.forEach((entry: any) => {
        if (!entry.Account) return;
        const amount = parseFloat(entry.amount ?? 0) || 0;
        const isDebit = entry.type === "DEBIT" || amount > 0;
        const absAmount = Math.abs(amount);
        items.push({
          accountId: entry.accountId || entry.Account.id,
          account: entry.Account,
          code: entry.Account.code,
          name: entry.Account.name,
          type: entry.Account.type,
          debit: isDebit ? absAmount : 0,
          credit: isDebit ? 0 : absAmount,
          balance: isDebit ? absAmount : -absAmount,
          date: txDate,
          reference: tx.voucherNumber,
          journalEntry: {
            ...entry,
            transaction: {
              id: tx.id,
              date: tx.date,
              voucherNumber: tx.voucherNumber,
              voucherType: tx.voucherType,
            },
          },
        });
      });
    });

    items.sort(
      (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.code).localeCompare(String(b.code))
    );

    return NextResponse.json(items);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching detailed trial balance:", error);
    return NextResponse.json(
      { error: "Error fetching detailed trial balance" },
      { status: 500 }
    );
  }
}

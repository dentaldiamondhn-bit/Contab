import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

function toTenantId(
  request: NextRequest
): string | null {
  const { searchParams } = new URL(request.url);
  return (
    searchParams.get("tenantId") ||
    searchParams.get("companyId") ||
    request.headers.get("x-tenant-id")
  );
}

async function fetchDetailed(
  tenantId: string,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<any[]> {
  const attempt = async (col: string): Promise<{ data: any[]; error: any }> => {
    let q: any = supabaseService
      .from("Transaction")
      .select(
        `*, JournalEntry (*, Account (id, code, name, type))`
      );
    if (startDate) q = q.gte("date", startDate.toISOString());
    if (endDate) q = q.lte("date", endDate.toISOString());
    q = q.eq(col, tenantId).order("date", { ascending: true });
    return await q;
  };

  const camel = await attempt("tenantId");
  if (!camel.error || (camel.data && camel.data.length > 0)) return camel.data || [];
  const snake = await attempt("tenant_id");
  return snake.data || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = toTenantId(request);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 400 }
      );
    }

    const transactions = await fetchDetailed(tenantId, startDate, endDate);

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
    console.error("Error fetching detailed trial balance:", error);
    return NextResponse.json(
      { error: "Error fetching detailed trial balance" },
      { status: 500 }
    );
  }
}
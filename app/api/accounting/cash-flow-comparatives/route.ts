import { NextRequest, NextResponse } from "next/server";
import { readFileSync, unlinkSync } from "fs";
import { supabase as supabaseService } from "@/lib/supabase-db";
import {
  buildCashFlowComparatives,
  exportCashFlowComparativesToExcel,
  buildCashFlowComparativesFileName,
} from "@/lib/reports/cash-flow-comparatives";
import type { TrialBalanceItem } from "@/lib/reports/cash-flow-comparatives";

async function fetchTrialItems(tenantId: string, fiscalYear: number): Promise<TrialBalanceItem[]> {
  const startDate = new Date(`${fiscalYear}-01-01T00:00:00Z`).toISOString();
  const endDate = new Date(`${fiscalYear}-12-31T23:59:59Z`).toISOString();
  const query: any = supabaseService
    .from("Transaction")
    .select(`*, JournalEntry (*, Account (id, code, name, type))`)
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("tenantId", tenantId);
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Error al consultar las transacciones contables");
  }
  const items: TrialBalanceItem[] = [];
  (data || []).forEach((tx: any) => {
    const txDate = tx.date || "";
    tx.JournalEntry?.forEach((entry: any) => {
      if (!entry.Account) return;
      const amount = parseFloat(entry.amount ?? 0) || 0;
      const isDebit = entry.type === 'DEBIT' || amount > 0;
      const absAmount = Math.abs(amount);
      items.push({
        accountId: entry.accountId || entry.Account.id,
        code: entry.Account.code,
        name: entry.Account.name,
        type: entry.Account.type,
        debit: isDebit ? absAmount : 0,
        credit: isDebit ? 0 : absAmount,
        balance: isDebit ? absAmount : -absAmount,
        date: txDate,
        journalEntry: entry,
      });
    });
  });
  return items;
}

function quarterHasData(quarter: { sections: { operation: any[]; investing: any[]; financing: any[] } }): boolean {
  return (
    quarter.sections.operation.length > 0 ||
    quarter.sections.investing.length > 0 ||
    quarter.sections.financiacion.length > 0
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get("tenantId") ||
      searchParams.get("companyId") ||
      request.headers.get("x-tenant-id");
    const fiscalYear = searchParams.get("fiscalYear")
      ? Number(searchParams.get("fiscalYear"))
      : NaN;

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, errorHint: "FALTAN_PARAMETROS" },
        { status: 400 }
      );
    }
    if (!fiscalYear || isNaN(fiscalYear) || fiscalYear < 2000) {
      return NextResponse.json(
        { ok: false, errorHint: "FALTAN_PARAMETROS" },
        { status: 400 }
      );
    }

    const trials = await fetchTrialItems(tenantId, fiscalYear);
    const comparatives = buildCashFlowComparatives(trials, fiscalYear);

    const warning =
      comparatives.hasData && comparatives.quarters.some((q) => !quarterHasData(q))
        ? "TRIMESTRES_SIN_DATOS"
        : null;

    return NextResponse.json({
      ok: true,
      fiscalYear,
      quarters: comparatives.quarters,
      totals: {
        totalNetChange: comparatives.totalNetChange,
        totalOperations: comparatives.totalOperations,
        totalInvesting: comparatives.totalInvesting,
        totalFinancing: comparatives.totalFinancing,
        totalOpening: comparatives.totalOpening,
        totalClosing: comparatives.totalClosing,
      },
      bestQuarter: comparatives.bestQuarter,
      worstQuarter: comparatives.worstQuarter,
      hasData: comparatives.hasData,
      warning,
      samples: trials.length,
    });
  } catch (error) {
    console.error("Error in cash-flow-comparatives GET:", error);
    return NextResponse.json(
      { ok: false, errorHint: "ERROR_INTERNO" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const tenantId =
      body?.tenantId || request.headers.get("x-tenant-id");
    const fiscalYear = body?.fiscalYear ? Number(body.fiscalYear) : NaN;
    const companyName = body?.companyName || "empresa";

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, errorHint: "FALTAN_PARAMETROS" },
        { status: 400 }
      );
    }
    if (!fiscalYear || isNaN(fiscalYear) || fiscalYear < 2000) {
      return NextResponse.json(
        { ok: false, errorHint: "FALTAN_PARAMETROS" },
        { status: 400 }
      );
    }

    const trials = await fetchTrialItems(tenantId, fiscalYear);
    const comparatives = buildCashFlowComparatives(trials, fiscalYear);

    if (!comparatives.hasData) {
      return NextResponse.json({
        ok: true,
        fileName: null,
        warning: "SIN_MOVIMIENTOS",
      });
    }

    const filePath = await exportCashFlowComparativesToExcel(
      comparatives.quarters,
      fiscalYear,
      companyName
    );
    const fileBuffer = readFileSync(filePath);
    try {
      unlinkSync(filePath);
    } catch {
      // archivo temporal: la limpieza es best-effort
    }
    const fileName = buildCashFlowComparativesFileName(fiscalYear, companyName);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error in cash-flow-comparatives POST:", error);
    return NextResponse.json(
      { ok: false, errorHint: "ERROR_INTERNO" },
      { status: 500 }
    );
  }
}
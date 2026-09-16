import { NextRequest, NextResponse } from "next/server";
import { supabase as sb } from "@/lib/supabase-db";

interface PeriodLock {
  tenant_id: string; year: number; month: number; status: string;
  closed_by: string | null; closed_at: string | null; notes: string | null;
}

interface ClosingDetail {
  period: { year: number; month: number; status: string; closed_by: string | null; closed_at: string | null; notes: string | null };
  totalDebits: number; totalCredits: number; difference: number; isBalanced: boolean;
  transactions: any[]; pendingTransactions: any[];
  asientosPendientesCount: number; asientosPublicadosCount: number;
  accounts: any[]; txCount: number;
}

// Normaliza una fila de Transaction+JournalEntry+Account al formato de la vista
function normalizeRow(t: any, je: any, pending: boolean): any {
  const amount = je ? Number(je.amount) || 0 : Number(t.totalAmount) || 0;
  const isDraft = (t.voucher_type === "BORRADOR" || t.voucherType === "BORRADOR");
  return {
    id_transaccion: t.id,
    fecha: t.date,
    concepto: t.description,
    origen: t.voucher_type || t.voucherType || "OTRO",
    estado: pending ? "PENDIENTE" : isDraft ? "BORRADOR" : "PUBLICADO",
    cuenta_id: je?.accountId || je?.account_id || null,
    cuenta_codigo: je?.Account?.code || je?.account_code || "",
    cuenta_nombre: je?.Account?.name || je?.account_name || "",
    debito: amount > 0 ? amount : 0,
    credito: amount < 0 ? Math.abs(amount) : 0,
    tenant_id: t.tenantId || t.tenant_id,
  };
}

// Obtiene las filas consolidadas de un tenant en un rango de fechas.
// Primero intenta la vista v_transacciones_cierre (tenant_id físico); si el
// tenant no tiene datos ahí (tenants legacy cuya columna física tenant_id no
// coincide con el tenant lógico "tenantId"), hace fallback directo sobre
// Transaction + JournalEntry + Account usando tenantId (camelCase).
async function fetchRowsForTenant(tenantId: string, start: string, end: string): Promise<any[]> {
  // 1) Vista consolidada por tenant_id
  try {
    const { data, error } = await sb.from("v_transacciones_cierre")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("fecha", start)
      .lt("fecha", end);
    if (!error && data && data.length > 0) return data;
  } catch {}

  // 2) Fallback directo por tenantId (camelCase) — replica la vista en JS
  try {
    const { data, error } = await sb.from("Transaction")
      .select(`*, JournalEntry (*, Account (code, name))`)
      .eq("tenantId", tenantId)
      .gte("date", start)
      .lt("date", end);
    if (error || !data) return [];

    const rows: any[] = [];
    const withEntries = new Set<string>();
    for (const t of data) {
      const jes = Array.isArray(t.JournalEntry) ? t.JournalEntry : [];
      if (jes.length === 0) {
        rows.push(normalizeRow(t, null, true));
        continue;
      }
      withEntries.add(t.id);
      for (const je of jes) {
        rows.push(normalizeRow(t, je, false));
      }
    }
    // Líneas de JournalEntry cuya transacción quedó fuera del filtro (duplicados por tenant_id)
    return rows;
  } catch {
    return [];
  }
}

// Helper: fetch consolidated view data for a period
async function getPeriodDetailFromView(tenantId: string, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const em = month === 12 ? 1 : month + 1;
  const ey = month === 12 ? year + 1 : year;
  const end = `${ey}-${String(em).padStart(2, "0")}-01`;

  // Get period lock status
  let periodLock: PeriodLock | null = null;
  try {
    const { data } = await sb.from("period_locks").select("*").eq("tenant_id", tenantId).eq("year", year).eq("month", month).single();
    if (data) periodLock = data as PeriodLock;
  } catch {}

  const rows = await fetchRowsForTenant(tenantId, start, end);

  // Build transactions and accounts
  const transactions: any[] = [];
  const pendingTransactions: any[] = [];
  const txIds = new Set<string>();
  const accountMap = new Map<string, { name: string; code: string; type: string; debit: number; credit: number; balance: number }>();

  for (const row of rows) {
    if (row.estado === "BORRADOR" || row.estado === "PENDIENTE") {
      pendingTransactions.push(row);
    } else {
      transactions.push(row);
      txIds.add(row.id_transaccion);
    }
    if (row.cuenta_codigo && row.cuenta_nombre) {
      const existing = accountMap.get(row.cuenta_codigo) || { name: row.cuenta_nombre, code: row.cuenta_codigo, type: row.origen || "OTRO", debit: 0, credit: 0, balance: 0 };
      existing.debit += Number(row.debito) || 0;
      existing.credit += Number(row.credito) || 0;
      existing.balance += Number(row.debito) - Number(row.credito);
      accountMap.set(row.cuenta_codigo, existing);
    }
  }

  const accounts = Array.from(accountMap.values()).map(a => ({
    account_code: a.code, account_name: a.name, account_type: a.type,
    debit: a.debit, credit: a.credit, balance: a.balance,
  }));

  const totalDebits = rows.reduce((s: number, r: any) => s + (Number(r.debito) || 0), 0);
  const totalCredits = rows.reduce((s: number, r: any) => s + (Number(r.credito) || 0), 0);
  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 1;

  const period = {
    year, month,
    status: periodLock?.status || "open",
    closed_by: periodLock?.closed_by || null,
    closed_at: periodLock?.closed_at || null,
    notes: periodLock?.notes || null,
  };

  return {
    period,
    totalDebits, totalCredits, difference, isBalanced,
    transactions, pendingTransactions,
    asientosPendientesCount: pendingTransactions.length,
    asientosPublicadosCount: transactions.length,
    accounts,
    txCount: rows.length,
  };
}

// ============ API ROUTES ============

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month");
    if (!tenantId) return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });

    // Get all period locks
    let locks: PeriodLock[] = [];
    try {
      const { data, error } = await sb.from("period_locks").select("*").eq("tenant_id", tenantId).order("year", { ascending: false }).order("month", { ascending: false });
      if (!error && data) locks = data as PeriodLock[];
    } catch {}

    // Get years from transactions (vista o fallback por tenantId)
    const yearsSet = new Set<number>();
    try {
      const { data } = await sb.from("v_transacciones_cierre").select("fecha").eq("tenant_id", tenantId).limit(5000);
      if (data && data.length > 0) {
        for (const r of data) { const d = new Date(String((r as any).fecha)); const y = d.getFullYear(); if (y > 0) yearsSet.add(y); }
      } else {
        const alt = await sb.from("Transaction").select("date").eq("tenantId", tenantId).limit(5000);
        if (alt.data && alt.data.length > 0) {
          for (const r of alt.data) { const d = new Date(String((r as any).date)); const y = d.getFullYear(); if (y > 0) yearsSet.add(y); }
        }
      }
    } catch {}

    const currentYear = new Date().getFullYear();
    const yearsArray = yearsSet.size > 0 ? [...yearsSet].sort((a: number, b: number) => b - a) : [currentYear];
    const targetYears = yearParam ? [parseInt(yearParam)] : yearsArray;

    // Count real transactions per (year, month) for the tenant
    const monthCounts = new Map<string, number>();
    for (const y of targetYears) {
      const start = `${y}-01-01`;
      const end = `${y + 1}-01-01`;
      const rows = await fetchRowsForTenant(tenantId, start, end);
      const seen = new Set<string>();
      for (const r of rows) {
        const d = new Date(String(r.fecha));
        const m = d.getMonth() + 1;
        const key = `${y}-${m}`;
        if (!seen.has(r.id_transaccion)) {
          seen.add(r.id_transaccion);
          monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
        }
      }
    }

    const periods: any[] = [];
    for (const y of targetYears) {
      for (let m = 1; m <= 12; m++) {
        const lock = locks.find((l: any) => l.year === y && l.month === m);
        const status = lock?.status || "open";
        periods.push({ year: y, month: m, status, closed_by: lock?.closed_by || null, closed_at: lock?.closed_at || null, notes: lock?.notes || null, transaction_count: monthCounts.get(`${y}-${m}`) || 0, prev_month_closed: true, can_close: true });
      }
    }

    // If specific month requested, return full details
    let details: ClosingDetail | null = null;
    if (monthParam && yearParam) {
      details = await getPeriodDetailFromView(tenantId, parseInt(yearParam), parseInt(monthParam));
    }

    return NextResponse.json({ periods, years: yearsArray, details });
  } catch (error) {
    console.error("[period-closing] GET error:", error);
    return NextResponse.json({ error: String((error as any)?.message || error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    const body = await request.json();
    const { year, month, notes, action } = body;
    if (!year || !month) return NextResponse.json({ error: "Año y mes requeridos" }, { status: 400 });
    const userId = request.headers.get("x-user-email") || "system";

    const result = await cerrarPeriodoContable(tenantId, year, month, userId, notes || "");
    if (result.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    const body = await request.json();
    const { year, month, reason } = body;
    if (!year || !month) return NextResponse.json({ error: "Año y mes requeridos" }, { status: 400 });
    const userId = request.headers.get("x-user-email") || "system";
    const result = await reabrirPeriodoContable(tenantId, year, month, userId, reason || "");
    if (result.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}

// ============ HELPER FUNCTIONS ============

async function cerrarPeriodoContable(tenantId: string, year: number, month: number, userId: string, notes: string) {
  let periodLock: PeriodLock | null = null;
  try {
    const { data } = await sb.from("period_locks").select("*").eq("tenant_id", tenantId).eq("year", year).eq("month", month).single();
    if (data) periodLock = data as PeriodLock;
  } catch {}

  if (periodLock && (periodLock.status === "closed" || periodLock.status === "locked")) return { error: `Período ya ${periodLock.status}` };

  const detalle = await getPeriodDetailFromView(tenantId, year, month);
  if (!detalle.isBalanced) return { error: `Balanza no cuadra: diferencia ${detalle.difference.toFixed(2)}`, details: detalle };
  if (detalle.asientosPendientesCount > 0) return { error: `Hay ${detalle.asientosPendientesCount} asientos pendientes/borrador`, details: detalle };

  try {
    await sb.from("period_locks").upsert({
      tenant_id: tenantId, year, month, status: "closed", closed_by: userId,
      closed_at: new Date().toISOString(), notes: notes || null,
      trial_balance_snapshot: { totalDebits: detalle.totalDebits, totalCredits: detalle.totalCredits, difference: detalle.difference, accounts: detalle.accounts },
      transaction_count: detalle.txCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,year,month" });
  } catch (e) { return { error: String(e) }; }

  try {
    await sb.from("account_audit_log").insert({
      id: crypto.randomUUID(), tenant_id: tenantId, account_code: "CLOSING", action: "PERIOD_CLOSED",
      old_values: { year, month, status: "open" }, new_values: { year, month, status: "closed", notes },
      performed_by: userId, performed_at: new Date().toISOString(),
    });
  } catch {}

  return { success: true, year, month, closed_by: userId, totalDebits: detalle.totalDebits, totalCredits: detalle.totalCredits, difference: detalle.difference, transaction_count: detalle.txCount };
}

async function reabrirPeriodoContable(tenantId: string, year: number, month: number, userId: string, reason: string) {
  let periodLock: PeriodLock | null = null;
  try {
    const { data } = await sb.from("period_locks").select("*").eq("tenant_id", tenantId).eq("year", year).eq("month", month).single();
    if (data) periodLock = data as PeriodLock;
  } catch {}

  if (!periodLock) return { error: "Período no encontrado" };
  if (periodLock.status !== "closed" && periodLock.status !== "locked") return { error: `Período no está cerrado (estado: ${periodLock.status})` };

  try {
    await sb.from("period_locks").update({ status: "open", reopened_by: userId, reopened_at: new Date().toISOString(), reopen_reason: reason || null, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId).eq("year", year).eq("month", month);
  } catch (e) { return { error: String(e) }; }
  try {
    await sb.from("account_audit_log").insert({
      id: crypto.randomUUID(), tenant_id: tenantId, account_code: "CLOSING", action: "PERIOD_REOPENED",
      old_values: { year, month, status: periodLock.status }, new_values: { year, month, status: "open", reason },
      performed_by: userId, performed_at: new Date().toISOString(),
    });
  } catch {}

  return { success: true, year, month, status: "open", reopened_by: userId, reason };
}
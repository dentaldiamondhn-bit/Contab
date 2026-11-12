// Servicio de presupuestos y control presupuestario (server-side).
// Tablas: budgets + budget_lines (supabase/BUDGET_TABLES.sql).
// Reales: Transaction + JournalEntry + Account (igual que trial-balance).

import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  buildAlerts,
  computeLineComparison,
  computeTotals,
  isValidPeriod,
  num,
  periodRange,
} from '@/lib/services/budget-calc';
import type {
  BudgetAlert,
  BudgetCategory,
  CategoryTotals,
  LineComparison,
} from '@/lib/services/budget-calc';

export type { BudgetAlert, BudgetCategory, CategoryTotals, LineComparison };
export { isValidPeriod };

export interface Budget {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  year: number;
  period_type: 'annual' | 'monthly';
  status: 'draft' | 'active' | 'closed';
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  account_code: string;
  account_name: string;
  category: BudgetCategory;
  period: string | null;
  amount: number;
}

export interface BudgetWithLines extends Budget {
  lines: BudgetLine[];
}

export interface BudgetComparison {
  budget: Budget;
  period: string;
  start: string;
  end: string;
  lines: LineComparison[];
  totals: { gasto: CategoryTotals; ingreso: CategoryTotals };
  alerts: BudgetAlert[];
  generatedAt: string;
}

export interface BudgetTrendMonth {
  period: string;
  gasto: CategoryTotals;
  ingreso: CategoryTotals;
}

export interface BudgetTrend {
  budget: Budget;
  year: number;
  months: BudgetTrendMonth[];
  generatedAt: string;
}

export interface CreateBudgetInput {
  name: string;
  year: number;
  period_type?: 'annual' | 'monthly';
  status?: 'draft' | 'active' | 'closed';
  notes?: string;
  created_by?: string;
  lines: Array<{
    account_code: string;
    account_name?: string;
    category: BudgetCategory;
    period?: string | null;
    amount: number;
  }>;
}

const MISSING_TABLE_HINT =
  'Tablas budgets/budget_lines no encontradas. Ejecute supabase/BUDGET_TABLES.sql en el SQL Editor de Supabase.';

export function isMissingTableError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  const code = String((err as { code?: string })?.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

function missingTableError(): Error {
  const err = new Error(MISSING_TABLE_HINT);
  (err as { code?: string }).code = 'BUDGET_TABLES_MISSING';
  return err;
}

// Resuelve el tenant efectivo: hint explícito (header x-tenant-id / ?tenantId),
// si no, busca la empresa en `companies` (por tenant_id o id), si no, usa companyId.
export async function resolveTenant(companyId: string, hint?: string | null): Promise<string> {
  if (hint && hint.trim()) return hint.trim();
  try {
    const supabase = getSupabaseServer();
    const byTenant = await supabase
      .from('companies')
      .select('tenant_id')
      .eq('tenant_id', companyId)
      .limit(1)
      .maybeSingle();
    if (!byTenant.error && byTenant.data) {
      return String((byTenant.data as { tenant_id?: string }).tenant_id || companyId);
    }
    const byId = await supabase
      .from('companies')
      .select('tenant_id')
      .eq('id', companyId)
      .limit(1)
      .maybeSingle();
    if (!byId.error && byId.data) {
      return String((byId.data as { tenant_id?: string }).tenant_id || companyId);
    }
  } catch {
    // Sin acceso a companies: asumir companyId como tenant.
  }
  return companyId;
}

function validateLineInput(
  l: CreateBudgetInput['lines'][number],
  index: number,
): string | null {
  if (!l || typeof l !== 'object') return `lines[${index}]: objeto inválido`;
  if (!l.account_code || typeof l.account_code !== 'string') {
    return `lines[${index}]: account_code es requerido`;
  }
  if (l.category !== 'ingreso' && l.category !== 'gasto') {
    return `lines[${index}]: category debe ser 'ingreso' o 'gasto'`;
  }
  if (l.period !== undefined && l.period !== null && !isValidPeriod(l.period)) {
    return `lines[${index}]: period debe tener formato YYYY-MM o null`;
  }
  if (!Number.isFinite(Number(l.amount)) || Number(l.amount) < 0) {
    return `lines[${index}]: amount debe ser un número >= 0`;
  }
  return null;
}

export async function listBudgets(
  companyId: string,
  tenantHint?: string | null,
  opts?: { year?: number; status?: string },
): Promise<Budget[]> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let query = supabase
    .from('budgets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('name', { ascending: true });
  if (opts?.year) query = query.eq('year', opts.year);
  if (opts?.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) throw missingTableError();
    throw error;
  }
  return (data || []) as Budget[];
}

export async function getBudget(
  companyId: string,
  budgetId: string,
  tenantHint?: string | null,
): Promise<BudgetWithLines | null> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) throw missingTableError();
    throw error;
  }
  if (!budget) return null;
  const { data: lines, error: linesError } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('budget_id', budgetId)
    .order('category', { ascending: true })
    .order('account_code', { ascending: true });
  if (linesError) throw linesError;
  return { ...(budget as Budget), lines: ((lines || []) as BudgetLine[]) };
}

export async function createBudget(
  companyId: string,
  input: CreateBudgetInput,
  tenantHint?: string | null,
): Promise<BudgetWithLines> {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('name es requerido');
  }
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('year debe ser un entero entre 2000 y 2100');
  }
  if (input.period_type && input.period_type !== 'annual' && input.period_type !== 'monthly') {
    throw new Error("period_type debe ser 'annual' o 'monthly'");
  }
  if (input.status && !['draft', 'active', 'closed'].includes(input.status)) {
    throw new Error("status debe ser 'draft', 'active' o 'closed'");
  }
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0) throw new Error('lines debe contener al menos una línea');
  for (let i = 0; i < lines.length; i++) {
    const err = validateLineInput(lines[i], i);
    if (err) throw new Error(err);
  }

  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const now = new Date().toISOString();
  const { data: budget, error } = await supabase
    .from('budgets')
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      name: input.name.trim(),
      year,
      period_type: input.period_type || 'annual',
      status: input.status || 'draft',
      notes: input.notes || '',
      created_by: input.created_by || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) {
    if (isMissingTableError(error)) throw missingTableError();
    throw error;
  }

  const rows = lines.map((l) => ({
    budget_id: (budget as Budget).id,
    account_code: l.account_code.trim(),
    account_name: (l.account_name || l.account_code).trim(),
    category: l.category,
    period: l.period || null,
    amount: Number(l.amount),
    created_at: now,
    updated_at: now,
  }));
  const { data: inserted, error: linesError } = await supabase
    .from('budget_lines')
    .insert(rows)
    .select();
  if (linesError) {
    await supabase.from('budgets').delete().eq('id', (budget as Budget).id);
    throw linesError;
  }
  return { ...(budget as Budget), lines: (inserted || []) as BudgetLine[] };
}

export async function updateBudget(
  companyId: string,
  budgetId: string,
  patch: Partial<Pick<Budget, 'name' | 'status' | 'notes' | 'period_type'>> & {
    lines?: CreateBudgetInput['lines'];
  },
  tenantHint?: string | null,
): Promise<BudgetWithLines | null> {
  const existing = await getBudget(companyId, budgetId, tenantHint);
  if (!existing) return null;
  if (existing.status === 'closed' && patch.status !== 'closed') {
    throw new Error('Un presupuesto cerrado no puede reabrirse');
  }

  const supabase = getSupabaseServer();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || !patch.name.trim()) throw new Error('name inválido');
    updates.name = patch.name.trim();
  }
  if (patch.status !== undefined) {
    if (!['draft', 'active', 'closed'].includes(patch.status)) throw new Error('status inválido');
    updates.status = patch.status;
  }
  if (patch.notes !== undefined) updates.notes = String(patch.notes || '');
  if (patch.period_type !== undefined) {
    if (patch.period_type !== 'annual' && patch.period_type !== 'monthly') {
      throw new Error("period_type debe ser 'annual' o 'monthly'");
    }
    updates.period_type = patch.period_type;
  }
  const { error } = await supabase.from('budgets').update(updates).eq('id', budgetId);
  if (error) throw error;

  if (patch.lines !== undefined) {
    const lines = Array.isArray(patch.lines) ? patch.lines : [];
    for (let i = 0; i < lines.length; i++) {
      const err = validateLineInput(lines[i], i);
      if (err) throw new Error(err);
    }
    const del = await supabase.from('budget_lines').delete().eq('budget_id', budgetId);
    if (del.error) throw del.error;
    if (lines.length > 0) {
      const now = new Date().toISOString();
      const ins = await supabase
        .from('budget_lines')
        .insert(
          lines.map((l) => ({
            budget_id: budgetId,
            account_code: l.account_code.trim(),
            account_name: (l.account_name || l.account_code).trim(),
            category: l.category,
            period: l.period || null,
            amount: Number(l.amount),
            created_at: now,
            updated_at: now,
          })),
        );
      if (ins.error) throw ins.error;
    }
  }
  return getBudget(companyId, budgetId, tenantHint);
}

export async function deleteBudget(
  companyId: string,
  budgetId: string,
  tenantHint?: string | null,
): Promise<boolean> {
  const existing = await getBudget(companyId, budgetId, tenantHint);
  if (!existing) return false;
  const supabase = getSupabaseServer();
  await supabase.from('budget_lines').delete().eq('budget_id', budgetId);
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
  if (error) throw error;
  return true;
}

// Reales por cuenta contable en el rango [start, end] para el tenant.
// Devuelve mapa account_code -> { debit, credit } (misma convención que trial-balance).
async function fetchActualsByAccount(
  tenantId: string,
  start: string,
  end: string,
): Promise<Map<string, { debit: number; credit: number }>> {
  const supabase = getSupabaseServer();
  const byAccount = new Map<string, { debit: number; credit: number }>();

  const accumulate = (transactions: unknown[] | null | undefined) => {
    for (const t of transactions || []) {
      const entries = (t as { JournalEntry?: unknown[] }).JournalEntry || [];
      for (const e of entries) {
        const entry = e as {
          amount?: unknown;
          type?: string;
          Account?: { code?: string } | null;
        };
        const code = entry?.Account?.code;
        if (!code) continue;
        const amount = num(entry.amount);
        const isDebit = entry.type === 'DEBIT' || amount > 0;
        const abs = Math.abs(amount);
        const cur = byAccount.get(code) || { debit: 0, credit: 0 };
        if (isDebit) cur.debit += abs;
        else cur.credit += abs;
        byAccount.set(code, cur);
      }
    }
  };

  const select = '*, JournalEntry (*, Account (code, name))';
  let data: unknown[] | null = null;

  const first = await supabase
    .from('Transaction')
    .select(select)
    .eq('tenant_id', tenantId)
    .gte('date', start)
    .lte('date', end);
  if (!first.error && first.data) {
    data = first.data as unknown[];
  } else {
    const alt = await supabase
      .from('Transaction')
      .select(select)
      .eq('tenantId', tenantId)
      .gte('date', start)
      .lte('date', end);
    if (!alt.error && alt.data) data = alt.data as unknown[];
  }
  accumulate(data);
  return byAccount;
}

export async function getBudgetComparison(
  companyId: string,
  budgetId: string,
  period: string,
  tenantHint?: string | null,
): Promise<BudgetComparison | null> {
  if (!isValidPeriod(period)) {
    throw new Error('period debe tener el formato YYYY-MM (mes 01-12)');
  }
  const budget = await getBudget(companyId, budgetId, tenantHint);
  if (!budget) return null;
  if (Number(period.slice(0, 4)) !== budget.year) {
    throw new Error(`period ${period} no pertenece al año del presupuesto (${budget.year})`);
  }

  const { start, end } = periodRange(period);
  const tenantId = await resolveTenant(companyId, tenantHint);
  const actuals = await fetchActualsByAccount(tenantId, start, end);

  const lines: LineComparison[] = budget.lines.map((l) => {
    const acc = actuals.get(l.account_code) || { debit: 0, credit: 0 };
    return computeLineComparison(
      {
        id: l.id,
        account_code: l.account_code,
        account_name: l.account_name,
        category: l.category,
        period: l.period,
        amount: l.amount,
      },
      period,
      acc.debit,
      acc.credit,
    );
  });

  const { lines: _omitLines, ...budgetOnly } = budget;
  return {
    budget: budgetOnly,
    period,
    start,
    end,
    lines,
    totals: computeTotals(lines),
    alerts: buildAlerts(lines),
    generatedAt: new Date().toISOString(),
  };
}

// Tendencia anual: presupuestado vs real por mes para las 12 períodos del año.
// Reutiliza la misma matemática que getBudgetComparison (prorrateo + mayor).
export async function getBudgetTrend(
  companyId: string,
  budgetId: string,
  tenantHint?: string | null,
): Promise<BudgetTrend | null> {
  const budget = await getBudget(companyId, budgetId, tenantHint);
  if (!budget) return null;
  const tenantId = await resolveTenant(companyId, tenantHint);
  const pad = (n: number) => String(n).padStart(2, '0');
  const months: BudgetTrendMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${budget.year}-${pad(m)}`;
    const { start, end } = periodRange(period);
    const actuals = await fetchActualsByAccount(tenantId, start, end);
    const lines: LineComparison[] = budget.lines.map((l) => {
      const acc = actuals.get(l.account_code) || { debit: 0, credit: 0 };
      return computeLineComparison(
        {
          id: l.id,
          account_code: l.account_code,
          account_name: l.account_name,
          category: l.category,
          period: l.period,
          amount: l.amount,
        },
        period,
        acc.debit,
        acc.credit,
      );
    });
    const totals = computeTotals(lines);
    months.push({ period, gasto: totals.gasto, ingreso: totals.ingreso });
  }
  const { lines: _omit, ...budgetOnly } = budget;
  return { budget: budgetOnly, year: budget.year, months, generatedAt: new Date().toISOString() };
}

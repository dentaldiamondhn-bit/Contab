// Reporte de variaciones entre períodos (server-side, sin dependencias).
// Compara debe/haber/saldo por cuenta entre dos meses (YYYY-MM) con
// variación absoluta, porcentual y tendencia. Testeable directo en node.
import type { SupaClient } from '@/lib/services/journal-service';

export interface PeriodBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export type Trend = 'up' | 'down' | 'same' | 'new' | 'gone';

export interface VariationRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  fromDebit: number;
  fromCredit: number;
  fromBalance: number;
  toDebit: number;
  toCredit: number;
  toBalance: number;
  varAbs: number;
  varPct: number | null;
  trend: Trend;
}

export interface VariationsReport {
  from: string;
  to: string;
  rows: VariationRow[];
  totals: {
    fromBalance: number;
    toBalance: number;
    varAbs: number;
    varPct: number | null;
  };
  counts: { accounts: number; up: number; down: number; same: number; new: number; gone: number };
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

/**
 * Obtiene el año de un período YYYY-MM
 */
export function getYearFromPeriod(period: string): number {
  const [year] = period.split('-').map(Number);
  return year;
}

/**
 * Obtiene el mes de un período YYYY-MM
 */
export function getMonthFromPeriod(period: string): number {
  const [, month] = period.split('-').map(Number);
  return month;
}

/**
 * Genera períodos para comparación año-año.
 * Dado un período base y un número de años hacia atrás,
 * retorna el período del año anterior con el mismo mes.
 * 
 * Ejemplos:
 * - getYoYPeriod('2026-09', 1) → '2025-09' (mismo mes del año anterior)
 * - getYoYPeriod('2026-09', 2) → '2024-09' (mismo mes hace 2 años)
 */
export function getYoYPeriod(period: string, yearsAgo: number): string {
  const [year, month] = period.split('-').map(Number);
  const targetYear = year - yearsAgo;
  return `${targetYear}-${month.toString().padStart(2, '0')}`;
}

/**
 * Verifica si dos períodos son del mismo mes pero diferente año
 */
export function isSameMonthDifferentYear(period1: string, period2: string): boolean {
  const [year1, month1] = period1.split('-').map(Number);
  const [year2, month2] = period2.split('-').map(Number);
  return month1 === month2 && year1 !== year2;
}

/**
 * Obtiene todos los años anteriores para un período dado,
 * hasta un máximo de años especificados.
 */
export function getAllYoYPeriods(period: string, maxYears: number = 5): string[] {
  const periods: string[] = [];
  for (let i = 1; i <= maxYears; i++) {
    periods.push(getYoYPeriod(period, i));
  }
  return periods;
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: `${y}-${pad(m)}-01`, end: `${nextY}-${pad(nextM)}-01` };
}

function varPct(from: number, to: number): number | null {
  if (from === 0) return null;
  return round2(((to - from) / Math.abs(from)) * 100);
}

// Agrega movimientos del mayor por cuenta para un rango (puro).
export function aggregatePeriodBalances(
  movements: Array<{
    accountId: string;
    code?: string;
    name?: string;
    type?: string;
    debit: number;
    credit: number;
  }>,
): Map<string, PeriodBalance> {
  const map = new Map<string, PeriodBalance>();
  for (const m of movements || []) {
    if (!m || !m.accountId) continue;
    const cur = map.get(m.accountId) || {
      accountId: m.accountId,
      code: String(m.code || ''),
      name: String(m.name || m.accountId),
      type: String(m.type || ''),
      debit: 0,
      credit: 0,
      balance: 0,
    };
    cur.debit = round2(cur.debit + num(m.debit));
    cur.credit = round2(cur.credit + num(m.credit));
    if (m.code && !cur.code) cur.code = String(m.code);
    if (m.name && (cur.name === cur.accountId || !cur.name)) cur.name = String(m.name);
    if (m.type && !cur.type) cur.type = String(m.type);
    map.set(m.accountId, cur);
  }
  for (const b of map.values()) b.balance = round2(b.debit - b.credit);
  return map;
}

export function computeVariations(
  fromBal: Map<string, PeriodBalance>,
  toBal: Map<string, PeriodBalance>,
): VariationRow[] {
  const ids = new Set<string>([...fromBal.keys(), ...toBal.keys()]);
  const rows: VariationRow[] = [];
  for (const id of ids) {
    const f = fromBal.get(id);
    const t = toBal.get(id);
    const fromBalance = f ? f.balance : 0;
    const toBalance = t ? t.balance : 0;
    const varAbs = round2(toBalance - fromBalance);
    let trend: Trend = 'same';
    if (!f) trend = 'new';
    else if (!t) trend = 'gone';
    else if (varAbs > 0) trend = 'up';
    else if (varAbs < 0) trend = 'down';
    rows.push({
      accountId: id,
      code: (t || f)!.code,
      name: (t || f)!.name,
      type: (t || f)!.type,
      fromDebit: f ? f.debit : 0,
      fromCredit: f ? f.credit : 0,
      fromBalance,
      toDebit: t ? t.debit : 0,
      toCredit: t ? t.credit : 0,
      toBalance,
      varAbs,
      varPct: varPct(fromBalance, toBalance),
      trend,
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

async function fetchPeriodBalances(
  client: SupaClient,
  tenantId: string,
  start: string,
  end: string,
): Promise<Map<string, PeriodBalance>> {
  const select = '*, JournalEntry (*, Account (id, code, name, type))';
  const collect = (transactions: unknown[] | null | undefined) => {
    const movements: Array<{
      accountId: string;
      code?: string;
      name?: string;
      type?: string;
      debit: number;
      credit: number;
    }> = [];
    for (const t of transactions || []) {
      const entries = (t as { JournalEntry?: unknown[] }).JournalEntry || [];
      for (const e of entries) {
        const entry = e as {
          amount?: unknown;
          type?: string;
          accountId?: string;
          account_id?: string;
          Account?: { id?: string; code?: string; name?: string; type?: string } | null;
        };
        const amount = num(entry.amount);
        const isDebit = entry.type === 'DEBIT' || amount > 0;
        const abs = Math.abs(amount);
        const acc = entry.Account || {};
        const accountId = String(entry.accountId || entry.account_id || acc.id || '');
        if (!accountId) continue;
        movements.push({
          accountId,
          code: String(acc.code || ''),
          name: String(acc.name || ''),
          type: String(acc.type || ''),
          debit: isDebit ? abs : 0,
          credit: isDebit ? 0 : abs,
        });
      }
    }
    return aggregatePeriodBalances(movements);
  };

  // tenantId primero, fallback tenant_id (mismo patrón del resto del módulo).
  const first = await (async () => {
    const qq = client.from('Transaction').select(select) as unknown as {
      eq(c: string, v: unknown): {
        gte(c: string, v: unknown): {
          lt(c: string, v: unknown): Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
    return qq.eq('tenantId', tenantId).gte('date', start).lt('date', end);
  })();
  if (!first.error && first.data) {
    const rows = collect(first.data as unknown[]);
    if (rows.size > 0) return rows;
  }
  const alt = await (async () => {
    const qq = client.from('Transaction').select(select) as unknown as {
      eq(c: string, v: unknown): {
        gte(c: string, v: unknown): {
          lt(c: string, v: unknown): Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
    return qq.eq('tenant_id', tenantId).gte('date', start).lt('date', end);
  })();
  if (!alt.error && alt.data) return collect(alt.data as unknown[]);
  return new Map();
}

export async function getVariationsReport(
  client: SupaClient,
  tenantId: string,
  from: string,
  to: string,
  options?: { yoy?: boolean; yoyYears?: number }
): Promise<VariationsReport> {
  if (!tenantId) throw new Error('Tenant ID requerido');
  if (!isValidPeriod(from) || !isValidPeriod(to)) {
    throw new Error('from y to deben tener formato YYYY-MM (mes 01-12)');
  }
  if (from === to) {
    throw new Error('from y to deben ser períodos diferentes');
  }
  
  // Modo año-año (comparación del mismo mes en diferentes años)
  if (options?.yoy) {
    // Si no se especifica el número de años, usar 1 ( año inmediatamente anterior)
    const yoyYears = options.yoyYears || 1;
    const basePeriod = getYoYPeriod(from, yoyYears);
    const comparePeriod = getYoYPeriod(to, yoyYears);
    
    // Si los períodos originales ya son años diferentes, usarlos directamente
    if (isSameMonthDifferentYear(from, to)) {
      // Ya son comparaciones año-año, usar como está
    } else {
      // Cambiar a comparación año-año del mismo mes
      return getVariationsReport(client, tenantId, basePeriod, comparePeriod, options);
    }
  }
  
  const fb = periodBounds(from);
  const tb = periodBounds(to);
  const [fromBal, toBal] = await Promise.all([
    fetchPeriodBalances(client, tenantId, fb.start, fb.end),
    fetchPeriodBalances(client, tenantId, tb.start, tb.end),
  ]);
  const rows = computeVariations(fromBal, toBal);
  const fromBalance = round2(rows.reduce((s, r) => s + r.fromBalance, 0));
  const toBalance = round2(rows.reduce((s, r) => s + r.toBalance, 0));
  const varAbs = round2(toBalance - fromBalance);
  return {
    from,
    to,
    rows,
    totals: { fromBalance, toBalance, varAbs, varPct: varPct(fromBalance, toBalance) },
    counts: {
      accounts: rows.length,
      up: rows.filter((r) => r.trend === 'up').length,
      down: rows.filter((r) => r.trend === 'down').length,
      same: rows.filter((r) => r.trend === 'same').length,
      new: rows.filter((r) => r.trend === 'new').length,
      gone: rows.filter((r) => r.trend === 'gone').length,
    },
  };
}

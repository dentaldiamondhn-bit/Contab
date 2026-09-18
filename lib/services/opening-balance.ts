// Balance de apertura automático (server-side).
// La apertura del año Y = saldos al 31-dic del año Y-1 por cuenta
// (débitos − créditos del mayor), guardados en centavos en
// chart_of_accounts.opening_balance (misma unidad que la UI manual).

import { assertPeriodOpen } from '@/lib/services/period-lock';
import type { SupaClient } from '@/lib/services/journal-service';

export interface ClosingLine {
  accountId: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
  net: number;
  openingCents: number;
}

export interface OpeningPreview {
  year: number;
  sourceEnd: string;
  asOf: string;
  lines: ClosingLine[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  balanced: boolean;
  nonZeroCount: number;
}

export interface ApplyResult extends OpeningPreview {
  applied: number;
  skippedNoChart: string[];
  skippedZero: number;
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Agrega movimientos del mayor por cuenta (puro, testeable).
export function aggregateClosing(
  movements: Array<{ accountId: string; code?: string; name?: string; debit: number; credit: number }>,
): ClosingLine[] {
  const map = new Map<string, ClosingLine>();
  for (const m of movements || []) {
    if (!m || !m.accountId) continue;
    const debit = num(m.debit);
    const credit = num(m.credit);
    const cur = map.get(m.accountId) || {
      accountId: m.accountId,
      code: String(m.code || ''),
      name: String(m.name || m.accountId),
      debit: 0,
      credit: 0,
      net: 0,
      openingCents: 0,
    };
    cur.debit = round2(cur.debit + debit);
    cur.credit = round2(cur.credit + credit);
    if (m.code && !cur.code) cur.code = String(m.code);
    if (m.name && (cur.name === cur.accountId || !cur.name)) cur.name = String(m.name);
    map.set(m.accountId, cur);
  }
  const lines = Array.from(map.values()).map((l) => ({
    ...l,
    net: round2(l.debit - l.credit),
    openingCents: Math.round((l.debit - l.credit) * 100),
  }));
  return lines.sort((a, b) => a.code.localeCompare(b.code));
}

type Chain = {
  eq(col: string, val: unknown): Chain;
  lt(col: string, val: unknown): Chain;
  order(col: string, opts: unknown): Chain;
  limit(n: number): Promise<{ data: unknown; error: unknown }>;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
  update(obj: unknown): { eq(col: string, val: unknown): Promise<{ data: unknown; error: unknown }> };
};

async function fetchClosingMovements(
  client: SupaClient,
  tenantId: string,
  before: string,
): Promise<Array<{ accountId: string; code: string; name: string; debit: number; credit: number }>> {
  const select = '*, JournalEntry (*, Account (id, code, name))';
  const collect = (transactions: unknown[] | null | undefined) => {
    const out: Array<{ accountId: string; code: string; name: string; debit: number; credit: number }> = [];
    for (const t of transactions || []) {
      const entries = (t as { JournalEntry?: unknown[] }).JournalEntry || [];
      for (const e of entries) {
        const entry = e as {
          amount?: unknown;
          type?: string;
          accountId?: string;
          account_id?: string;
          Account?: { id?: string; code?: string; name?: string } | null;
        };
        const amount = num(entry.amount);
        const isDebit = entry.type === 'DEBIT' || amount > 0;
        const abs = Math.abs(amount);
        const acc = entry.Account || {};
        const accountId = String(entry.accountId || entry.account_id || acc.id || '');
        if (!accountId) continue;
        out.push({
          accountId,
          code: String(acc.code || ''),
          name: String(acc.name || ''),
          debit: isDebit ? abs : 0,
          credit: isDebit ? 0 : abs,
        });
      }
    }
    return out;
  };

  const run = async (col: string) => {
    // Límite alto para cubrir años completos de movimientos.
    const q = (client.from('Transaction').select(select) as unknown as Chain)
      .eq(col, tenantId)
      .lt('date', before);
    return q.limit(10000);
  };

  const first = await run('tenantId');
  if (!first.error && first.data) {
    const rows = collect(first.data as unknown[]);
    if (rows.length > 0) return rows;
  }
  const alt = await run('tenant_id');
  if (!alt.error && alt.data) return collect(alt.data as unknown[]);
  return [];
}

export function validateYear(year: number): void {
  if (!Number.isInteger(year) || year < 2001 || year > 2100) {
    throw new Error('year debe ser un entero entre 2001 y 2100');
  }
}

export async function computeOpeningBalances(
  client: SupaClient,
  tenantId: string,
  year: number,
): Promise<OpeningPreview> {
  if (!tenantId) throw new Error('Tenant ID requerido');
  validateYear(year);
  const sourceEnd = `${year - 1}-12-31`;
  const asOf = `${year}-01-01`;
  const movements = await fetchClosingMovements(client, tenantId, `${year}-01-01`);
  const lines = aggregateClosing(movements);
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  const difference = round2(totalDebit - totalCredit);
  return {
    year,
    sourceEnd,
    asOf,
    lines,
    totalDebit,
    totalCredit,
    difference,
    balanced: Math.abs(difference) < 0.01,
    nonZeroCount: lines.filter((l) => l.openingCents !== 0).length,
  };
}

export async function applyOpeningBalances(
  client: SupaClient,
  tenantId: string,
  year: number,
  opts?: { overwrite?: boolean; by?: string },
): Promise<ApplyResult> {
  const preview = await computeOpeningBalances(client, tenantId, year);
  if (preview.nonZeroCount === 0) {
    throw new Error(`Sin movimientos al ${preview.sourceEnd}: no hay saldos que trasladar`);
  }
  // Candado: si enero del año ya está cerrado, la apertura es definitiva.
  await assertPeriodOpen(client, tenantId, preview.asOf);

  const { data: chart } = (await (client.from('chart_of_accounts').select('id, code') as unknown as Chain)
    .eq('tenant_id', tenantId)
    .limit(10000)) as { data: unknown };
  const byCode = new Map(
    ((chart || []) as Array<{ id: string; code: string }>).map((c) => [String(c.code), String(c.id)]),
  );

  const now = new Date().toISOString();
  let applied = 0;
  let skippedZero = 0;
  const skippedNoChart: string[] = [];
  const auditRows: Record<string, unknown>[] = [];

  for (const line of preview.lines) {
    if (line.openingCents === 0) {
      skippedZero++;
      continue;
    }
    const chartId =
      byCode.get(line.code) ||
      [...byCode.entries()].find(([code]) => code.replace('.', '-') === line.code.replace('.', '-'))?.[1];
    if (!chartId) {
      skippedNoChart.push(`${line.code} ${line.name}`.trim());
      continue;
    }
    if (!opts?.overwrite) {
      const cur = (await (client.from('chart_of_accounts').select('opening_balance') as unknown as Chain)
        .eq('id', chartId)
        .maybeSingle()) as { data: unknown };
      const existing = num((cur.data as { opening_balance?: unknown } | null)?.opening_balance);
      if (existing !== 0) {
        skippedNoChart.push(`${line.code} ${line.name} (ya tiene apertura)`.trim());
        continue;
      }
    }
    const { error } = await (client.from('chart_of_accounts') as unknown as Chain)
      .update({
        opening_balance: line.openingCents,
        opening_balance_date: preview.asOf,
        updated_at: now,
      })
      .eq('id', chartId);
    if (error) {
      throw new Error(
        `No se pudo aplicar ${line.code}: ${(error as { message?: string }).message || 'error desconocido'}`,
      );
    }
    applied++;
    auditRows.push({
      tenant_id: tenantId,
      account_id: chartId,
      account_code: line.code,
      action: 'OPENING_BALANCE_AUTO',
      old_values: { year },
      new_values: { opening_balance: line.openingCents, opening_balance_date: preview.asOf },
      performed_by: opts?.by || 'system',
      performed_at: now,
    });
  }

  if (auditRows.length > 0) {
    try {
      await (client.from('account_audit_log').insert(auditRows) as unknown as Promise<unknown>);
    } catch {
      // Auditoría best-effort, no bloquea la aplicación.
    }
  }

  return { ...preview, applied, skippedNoChart, skippedZero };
}

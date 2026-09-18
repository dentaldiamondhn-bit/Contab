// Servicio de pólizas contables (server-side, Supabase service_role).
// Reemplaza la vía Prisma (DATABASE_URL no disponible en runtime).
// Convención (igual que trial-balance): JournalEntry.amount con signo
// (débito +, crédito −) + type DEBIT/CREDIT. Tablas en camelCase
// (Transaction/JournalEntry), columna tenant dual con fallback.

import type { VoucherType, JournalEntryInput, CreateJournalInput } from '@/types/accounting';
export type { VoucherType, JournalEntryInput, CreateJournalInput };

const VOUCHER_TYPES: VoucherType[] = ['INGRESO', 'EGRESO', 'DIARIO', 'AJUSTE'];
const BALANCE_TOLERANCE = 0.01;

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

import { assertPeriodOpen, assertPeriodOpenUnified } from '@/lib/services/period-lock';
import { writeAccountAudits } from '@/lib/services/account-audit';

export { assertPeriodOpen, assertPeriodOpenUnified };

// Mínimo necesario del cliente Supabase (real o falso en tests).
export interface SupaChain {
  eq(col: string, val: unknown): SupaChain;
  in(col: string, vals: unknown[]): Promise<{ data: unknown; error: unknown }>;
  order(col: string, opts: unknown): SupaChain;
  limit(n: number): Promise<{ data: unknown; error: unknown }>;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
  single(): Promise<{ data: unknown; error: unknown }>;
  select(): Promise<{ data: unknown; error: unknown }>;
}

export interface SupaClient {
  from(table: string): {
    select(cols?: string): SupaChain;
    insert(rows: unknown): {
      select(): Promise<{ data: unknown; error: unknown }>;
    };
  };
}

export function validateJournalInput(input: CreateJournalInput): {
  voucherType: VoucherType;
  lines: Array<{ accountId: string; debit: number; credit: number; description: string }>;
  totalDebit: number;
  totalCredit: number;
} {
  if (!input || typeof input !== 'object') throw new Error('Datos de la póliza inválidos');
  if (typeof input.description !== 'string' || !input.description.trim()) {
    throw new Error('description es requerida');
  }
  const voucherType = input.voucherType || 'DIARIO';
  if (!VOUCHER_TYPES.includes(voucherType as VoucherType)) {
    throw new Error('voucherType debe ser INGRESO, EGRESO, DIARIO o AJUSTE');
  }
  const entries = Array.isArray(input.entries) ? input.entries : [];
  if (entries.length < 2) {
    throw new Error('La transacción debe tener al menos 2 líneas');
  }
  const lines = entries.map((e, i) => {
    if (!e || typeof e.accountId !== 'string' || !e.accountId) {
      throw new Error(`Línea ${i + 1}: accountId es requerido`);
    }
    // Dos convenciones: formulario {amount > 0, isDebit} y notas/servicios
    // {amount con signo: + débito, − crédito} (isDebit opcional y coherente).
    const raw = num((e as { amount?: unknown }).amount);
    const flag = (e as { isDebit?: unknown }).isDebit;
    let debit = 0;
    let credit = 0;
    if (typeof flag === 'boolean') {
      const abs = Math.abs(raw);
      if (!(abs > 0)) {
        throw new Error(`Línea ${i + 1}: amount debe ser distinto de cero`);
      }
      debit = flag ? abs : 0;
      credit = flag ? 0 : abs;
    } else {
      if (raw === 0 || !Number.isFinite(raw)) {
        throw new Error(`Línea ${i + 1}: amount debe ser distinto de cero`);
      }
      debit = raw > 0 ? raw : 0;
      credit = raw < 0 ? -raw : 0;
    }
    return {
      accountId: e.accountId,
      debit,
      credit,
      description: typeof (e as { description?: unknown }).description === 'string'
        ? String((e as { description?: unknown }).description)
        : input.description.trim(),
    };
  });
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
    throw new Error(
      `La póliza no está balanceada: débito ${totalDebit.toFixed(2)} vs crédito ${totalCredit.toFixed(2)}`,
    );
  }
  if (totalDebit <= 0) throw new Error('La póliza debe tener un monto mayor a cero');
  return { voucherType: voucherType as VoucherType, lines, totalDebit, totalCredit };
}

export async function getNextVoucherNumber(
  client: SupaClient,
  tenantId: string,
  voucherType: VoucherType,
): Promise<number> {
  // tenantId camelCase primero (canónico Prisma), fallback tenant_id.
  const attempt = async (col: string): Promise<number | null> => {
    const q = (client.from('Transaction').select('voucherNumber') as unknown as {
      eq(c: string, v: unknown): {
        eq(c: string, v: unknown): {
          order(c: string, o: unknown): { limit(n: number): Promise<{ data: unknown; error: unknown }> };
        };
      };
    })
      .eq(col, tenantId)
      .eq('voucherType', voucherType)
      .order('voucherNumber', { ascending: false })
      .limit(1);
    const { data, error } = await q;
    if (error || !data) return null;
    const rows = data as Array<{ voucherNumber?: unknown }>;
    if (rows.length === 0) return 1;
    return num(rows[0].voucherNumber) + 1;
  };
  const camel = await attempt('tenantId');
  if (camel !== null) return camel;
  const snake = await attempt('tenant_id');
  return snake === null ? 1 : snake;
}

export async function createJournalTransaction(
  client: SupaClient,
  tenantId: string,
  input: CreateJournalInput,
  opts?: { performedBy?: string },
): Promise<{ transaction: Record<string, unknown>; entries: Record<string, unknown>[] }> {
  if (!tenantId) throw new Error('Tenant no encontrado o no especificado');
  const { voucherType, lines, totalDebit } = validateJournalInput(input);

  // Verificar que las cuentas existan para el tenant.
  const ids = [...new Set(lines.map((l) => l.accountId))];
  const accQuery = (client.from('Account').select('id') as unknown as {
    eq(c: string, v: unknown): { in(c: string, v: unknown[]): Promise<{ data: unknown; error: unknown }> };
  })
    .eq('tenantId', tenantId)
    .in('id', ids);
  const { data: accData, error: accError } = await accQuery;
  let found = new Set<string>();
  if (!accError && accData) {
    found = new Set((accData as Array<{ id: string }>).map((a) => String(a.id)));
  } else {
    const alt = (client.from('Account').select('id') as unknown as {
      eq(c: string, v: unknown): { in(c: string, v: unknown[]): Promise<{ data: unknown; error: unknown }> };
    })
      .eq('tenant_id', tenantId)
      .in('id', ids);
    const altRes = await alt;
    if (!altRes.error && altRes.data) {
      found = new Set((altRes.data as Array<{ id: string }>).map((a) => String(a.id)));
    }
  }
  const missing = ids.filter((id) => !found.has(String(id)));
  if (missing.length > 0) {
    throw new Error(`Cuentas no existen para el tenant: ${missing.join(', ')}`);
  }

  const now = new Date();
  const parsed = input.date ? new Date(input.date) : now;
  if (Number.isNaN(parsed.getTime())) throw new Error('date inválida');
  const dateIso = parsed.toISOString();

  // Candado unificado: mes cerrado/bloqueado o año cerrado (month=0) rechaza movimientos.
  await assertPeriodOpenUnified(client, tenantId, dateIso);

  const voucherNumber = await getNextVoucherNumber(client, tenantId, voucherType);
  const currency = input.currency || 'HNL';
  const exchangeRate = input.exchangeRate !== undefined ? num(input.exchangeRate) : 24.7;

  const txInsert = (client.from('Transaction').insert({
    tenantId,
    date: dateIso,
    description: input.description.trim(),
    voucherType,
    voucherNumber,
    currency,
    exchangeRate,
    totalAmount: totalDebit,
  }) as unknown as {
    select(): { single(): Promise<{ data: unknown; error: unknown }> };
  })
    .select()
    .single();
  const { data: transaction, error: txError } = await txInsert;
  if (txError || !transaction) {
    throw new Error(
      `No se pudo crear la transacción: ${(txError as { message?: string })?.message || 'error desconocido'}`,
    );
  }
  const txId = (transaction as { id: string }).id;

  const rows = lines.map((l) => ({
    transactionId: txId,
    accountId: l.accountId,
    tenantId,
    amount: l.debit > 0 ? l.debit : -l.credit,
    originalAmount: l.debit > 0 ? l.debit : l.credit,
    type: l.debit > 0 ? 'DEBIT' : 'CREDIT',
    currency,
    exchangeRate,
    description: l.description,
  }));
  const jeInsert = (client.from('JournalEntry').insert(rows) as unknown as {
    select(): Promise<{ data: unknown; error: unknown }>;
  }).select();
  const { data: entries, error: jeError } = await jeInsert;
  if (jeError) {
    throw new Error(
      `Transacción creada (${txId}) pero fallaron las líneas: ${(jeError as { message?: string })?.message || 'error desconocido'}`,
    );
  }

  // Auditoría inmutable por cuenta (account_audit_log): una fila por línea
  // con el asiento y la transacción. Best-effort: no bloquea el guardado.
  try {
    // Resolver códigos de cuenta para la auditoría (best-effort)
    const codeById = new Map<string, string>();
    try {
      const codeQuery = (client.from('Account').select('id, code') as unknown as {
        in(c: string, v: unknown[]): Promise<{ data: unknown; error: unknown }>;
      }).in('id', ids);
      const codeRes = await codeQuery;
      if (!codeRes.error && codeRes.data) {
        for (const a of codeRes.data as Array<{ id: string; code?: string }>) {
          codeById.set(String(a.id), String(a.code || a.id));
        }
      }
    } catch {
      // Sin códigos: se usa el id como fallback.
    }
    const auditRows = lines.map((l) => ({
      tenant_id: tenantId,
      account_id: l.accountId,
      account_code: codeById.get(l.accountId) || l.accountId,
      action: 'JOURNAL_CREATE' as const,
      old_values: null,
      new_values: {
        transactionId: txId,
        voucherType,
        voucherNumber,
        date: dateIso,
        description: l.description,
        amount: l.debit > 0 ? l.debit : -l.credit,
        currency,
      },
      performed_by: opts?.performedBy || 'system',
    }));
    await writeAccountAudits(client as unknown as Parameters<typeof writeAccountAudits>[0], auditRows);
  } catch (e) {
    console.warn('[journal-service] No se pudo escribir auditoría de asiento:', e);
  }

  return {
    transaction: transaction as Record<string, unknown>,
    entries: (entries || []) as Record<string, unknown>[],
  };
}

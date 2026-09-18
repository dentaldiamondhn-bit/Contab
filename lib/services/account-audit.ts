// Helper de auditoría contable (Supabase account_audit_log).
// Best-effort: un fallo de auditoría no bloquea la operación contable.

export type AccountAuditAction =
  | 'OPENING_BALANCE_UPDATE'
  | 'OPENING_BALANCE_AUTO'
  | 'PERIOD_CLOSED'
  | 'PERIOD_REOPENED'
  | 'JOURNAL_CREATE'
  | 'JOURNAL_ENTRY_CREATE'
  | 'JOURNAL_UPDATE'
  | 'JOURNAL_DELETE';

export interface AccountAuditRow {
  id?: string;
  tenant_id: string;
  account_id: string | null;
  account_code: string;
  action: AccountAuditAction | string;
  old_values?: unknown;
  new_values?: unknown;
  performed_by: string;
  performed_at?: string;
}

export interface AuditClient {
  from(table: string): {
    insert(rows: unknown): Promise<{ data: unknown; error: unknown }>;
  };
}

export async function writeAccountAudits(
  client: AuditClient,
  rows: AccountAuditRow[],
): Promise<void> {
  if (!rows || rows.length === 0) return;
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    id: r.id || crypto.randomUUID(),
    tenant_id: r.tenant_id,
    account_id: r.account_id || null,
    account_code: r.account_code || '',
    action: r.action,
    old_values: r.old_values ?? null,
    new_values: r.new_values ?? null,
    performed_by: r.performed_by || 'system',
    performed_at: r.performed_at || now,
  }));
  try {
    const { error } = await client.from('account_audit_log').insert(payload);
    if (error) console.warn('[account-audit] No se pudo escribir auditoría:', (error as { message?: string }).message);
  } catch (e) {
    console.warn('[account-audit] Excepción en auditoría:', e);
  }
}

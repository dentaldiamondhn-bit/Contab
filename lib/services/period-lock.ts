// Candado de período contable unificado (mensual + anual).
// Fuente única: tabla `period_locks` (Supabase). Sin fila = abierto.
// Mensual: (empresa, year, month 1-12). Anual: (empresa, year, month=0).
// Reutilizado por period-lock-middleware.ts, journal-service y period-closing.
//
// AISLAMIENTO: filtra por `company_id`, no por `tenant_id`. TEST1DS tiene dos
// empresas (test 1 y test 2) que comparten tenant: filtrar por tenant hace que
// el cierre de una bloquee a la hermana. La migración 029 pone
// UNIQUE (company_id, year, month) por lo mismo. Sin `companyId` se degrada a
// tenant, que es el comportamiento legacy: NO es equivalente, es la fuga.

export interface LockClient {
  from(table: string): {
    select(cols?: string): {
      eq(col: string, val: unknown): {
        eq(col: string, val: unknown): {
          eq(col: string, val: unknown): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };
  };
}

export interface LockScope {
  /** `companies.id`. El isolation key real. Sin esto solo queda el tenant. */
  companyId?: string | null;
}

// Mensual: bloquea el mes de la empresa. `companyId` presente => filtra por
// empresa; ausente => por tenant (legacy, y es una fuga entre empresas sisters).
export async function assertPeriodOpen(
  client: LockClient,
  tenantId: string,
  dateIso: string,
  scope: LockScope = {},
): Promise<void> {
  const d = new Date(dateIso);
  const m = /^(\d{4})-(\d{2})/.exec(String(dateIso));
  const year = m ? Number(m[1]) : NaN;
  const month = m ? Number(m[2]) : NaN;
  if (Number.isNaN(d.getTime()) || !Number.isInteger(year) || month < 1 || month > 12) {
    throw new Error('date inválida');
  }
  const base = client
    .from('period_locks')
    .select('status')
    .eq(scope.companyId ? 'company_id' : 'tenant_id', scope.companyId ?? tenantId)
    .eq('year', year)
    .eq('month', month);
  const { data, error } = await base.maybeSingle();
  if (error || !data) return;
  const status = String((data as { status?: unknown }).status || 'open');
  if (status === 'closed' || status === 'locked') {
    const mm = String(month).padStart(2, '0');
    throw new Error(
      `Período ${year}-${mm} está ${status === 'closed' ? 'cerrado' : 'bloqueado'}: no se aceptan movimientos. Reábralo para registrar.`,
    );
  }
}

// Anual: bloquea todo el año si existe fila month=0 cerrada/bloqueada.
// Mantiene compatibilidad con el candado mensual ya en period_locks.
export async function assertYearOpen(
  client: LockClient,
  tenantId: string,
  year: number,
  scope: LockScope = {},
): Promise<void> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('year inválido');
  const { data, error } = await client
    .from('period_locks')
    .select('status')
    .eq(scope.companyId ? 'company_id' : 'tenant_id', scope.companyId ?? tenantId)
    .eq('year', year)
    .eq('month', 0)
    .maybeSingle();
  if (error || !data) return;
  const status = String((data as { status?: unknown }).status || 'open');
  if (status === 'closed' || status === 'locked') {
    throw new Error(
      `Ejercicio ${year} está ${status === 'closed' ? 'cerrado' : 'bloqueado'}: no se aceptan movimientos. Reábralo para registrar.`,
    );
  }
}

// Unificado: mensual + anual (un año cerrado bloquea cualquier mes del año).
export async function assertPeriodOpenUnified(
  client: LockClient,
  tenantId: string,
  dateIso: string,
  scope: LockScope = {},
): Promise<void> {
  await assertYearOpen(client, tenantId, new Date(dateIso).getFullYear(), scope);
  await assertPeriodOpen(client, tenantId, dateIso, scope);
}

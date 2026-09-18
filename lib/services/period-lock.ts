// Candado de período contable unificado (mensual + anual).
// Fuente única: tabla `period_locks` (Supabase). Sin fila = abierto.
// Mensual: (tenant_id, year, month 1-12). Anual: (tenant_id, year, month=0).
// Reutilizado por period-lock-middleware.ts, journal-service y period-closing.

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

// Rechaza fechas en un período cerrado/bloqueado.
// Año/mes se extraen del texto ISO (no de getFullYear/getMonth locales:
// '2026-01-01' en UTC-6 caería en diciembre con getters locales).
export async function assertPeriodOpen(
  client: LockClient,
  tenantId: string,
  dateIso: string,
): Promise<void> {
  const d = new Date(dateIso);
  const m = /^(\d{4})-(\d{2})/.exec(String(dateIso));
  const year = m ? Number(m[1]) : NaN;
  const month = m ? Number(m[2]) : NaN;
  if (Number.isNaN(d.getTime()) || !Number.isInteger(year) || month < 1 || month > 12) {
    throw new Error('date inválida');
  }
  const { data, error } = await client
    .from('period_locks')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
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
): Promise<void> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('year inválido');
  const { data, error } = await client
    .from('period_locks')
    .select('status')
    .eq('tenant_id', tenantId)
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
): Promise<void> {
  await assertYearOpen(client, tenantId, new Date(dateIso).getFullYear());
  await assertPeriodOpen(client, tenantId, dateIso);
}

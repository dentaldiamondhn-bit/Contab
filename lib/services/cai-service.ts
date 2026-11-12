// CAI server-side functions
// These functions require database access and should only be used in server components or API routes

import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import type { CAI, CAIStatus, CAIAlert, CAIStatistics } from './cai-types';
import { formatCAIDisplay, getCAIExpirationText, computeCAIStatus, getRangeUsagePercentage } from './cai-utils';

/**
 * La tabla `cai` real (verificada contra Supabase) es plana y en ingles:
 *
 *   id, tenant_id, company_id, cai_number, start_number, end_number,
 *   current_number, issue_date, expiration_date, status, created_at, updated_at
 *
 * Este modulo usaba Prisma (`db.cAI` / `db.cAIAlert`) con un modelo que no
 * corresponde a esa tabla y, ademas, `DATABASE_URL` no resuelve en este
 * entorno. Resultado: /api/cai-alerts y la validacion fiscal devolvian 500.
 * Ahora se lee con el cliente Supabase y se mapea al tipo `CAI`.
 */

const COLUMNAS =
  'id, tenant_id, company_id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, created_at, updated_at';

type CaiRow = {
  id: string;
  tenant_id: string | null;
  company_id: string | null;
  cai_number: string | null;
  start_number: number | string | null;
  end_number: number | string | null;
  current_number: number | string | null;
  issue_date: string | null;
  expiration_date: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fecha(value: unknown): Date {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/** Fila de Supabase -> `CAI` del dominio. */
function aCai(row: CaiRow): CAI {
  const cai: CAI = {
    id: row.id,
    caiCode: String(row.cai_number ?? ''),
    establishmentCode: '',
    emissionPointCode: '',
    rangeStart: numero(row.start_number),
    rangeEnd: numero(row.end_number),
    currentNumber: numero(row.current_number),
    expirationDate: fecha(row.expiration_date),
    status: 'ACTIVE',
    companyId: row.company_id ?? undefined,
    createdAt: row.created_at ? fecha(row.created_at) : undefined,
    updatedAt: row.updated_at ? fecha(row.updated_at) : undefined,
  } as CAI;

  // El estado se recalcula: la columna `status` no distingue EXPIRING ni
  // EXHAUSTED, y la UI espera esos valores.
  cai.status = computeCAIStatus(cai);
  return cai;
}

function cliente() {
  return getSupabaseServer() as any;
}

/**
 * Get all CAIs with filters
 */
export async function getCAIs(filters?: {
  status?: CAIStatus;
  companyId?: string;
}): Promise<CAI[]> {
  let query = cliente().from('cai').select(COLUMNAS).order('expiration_date', { ascending: true });
  if (filters?.companyId) query = query.eq('company_id', filters.companyId);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudo leer cai: ${error.message}`);

  const cais = ((data || []) as CaiRow[]).map(aCai);
  return filters?.status ? cais.filter((c) => c.status === filters.status) : cais;
}

/**
 * Get CAI statistics
 */
export async function getCAIStatistics(): Promise<CAIStatistics> {
  const cais = await getCAIs();

  let totalRangeAvailable = 0;
  let totalRangeUsed = 0;

  for (const cai of cais) {
    totalRangeAvailable += cai.rangeEnd - cai.rangeStart + 1;
    totalRangeUsed += cai.currentNumber - cai.rangeStart + 1;
  }

  const stats: CAIStatistics = {
    totalCAIs: cais.length,
    activeCAIs: 0,
    expiringCAIs: 0,
    expiredCAIs: 0,
    exhaustedCAIs: 0,
    totalRangeAvailable,
    totalRangeUsed,
    usagePercentage: totalRangeAvailable > 0 ? (totalRangeUsed / totalRangeAvailable) * 100 : 0,
  };

  for (const cai of cais) {
    switch (cai.status) {
      case 'ACTIVE':
        stats.activeCAIs++;
        break;
      case 'EXPIRING':
        stats.expiringCAIs++;
        break;
      case 'EXPIRED':
        stats.expiredCAIs++;
        break;
      case 'EXHAUSTED':
        stats.exhaustedCAIs++;
        break;
    }
  }

  return stats;
}

/**
 * Get unread alerts.
 *
 * No existe tabla de alertas en el esquema real (`cai_alerts` no aparece), asi
 * que se devuelve una lista vacia en lugar de fallar. Las alertas de la UI se
 * derivan del estado de cada CAI (getCAIStatistics).
 */
export async function getUnreadAlerts(_companyId?: string): Promise<CAIAlert[]> {
  return [];
}

/**
 * Mark all alerts as read. Sin tabla de alertas no hay nada que actualizar.
 */
export async function markAllAlertsAsRead(_companyId?: string): Promise<number> {
  return 0;
}

/**
 * Create a new CAI
 */
export async function createCAI(data: {
  caiCode: string;
  establishmentCode: string;
  emissionPointCode: string;
  rangeStart: number;
  rangeEnd: number;
  expirationDate: Date;
  tenantId?: string;
  companyId?: string;
}): Promise<CAI> {
  const { data: inserted, error } = await cliente()
    .from('cai')
    .insert({
      tenant_id: data.tenantId ?? null,
      company_id: data.companyId ?? null,
      cai_number: data.caiCode,
      start_number: data.rangeStart,
      end_number: data.rangeEnd,
      current_number: data.rangeStart,
      issue_date: new Date().toISOString().slice(0, 10),
      expiration_date: data.expirationDate.toISOString().slice(0, 10),
      status: 'active',
    })
    .select(COLUMNAS)
    .single();

  if (error) throw new Error(`No se pudo crear el CAI: ${error.message}`);
  return aCai(inserted as CaiRow);
}

/**
 * Update CAI current number (when invoice is generated)
 */
export async function updateCAICurrentNumber(caiId: string, newNumber: number): Promise<CAI> {
  const actual = await getCAIById(caiId);
  if (!actual) throw new Error('CAI not found');
  if (newNumber > actual.rangeEnd) throw new Error('Cannot exceed range end');

  const { data, error } = await cliente()
    .from('cai')
    .update({ current_number: newNumber, updated_at: new Date().toISOString() })
    .eq('id', caiId)
    .select(COLUMNAS)
    .single();

  if (error) throw new Error(`No se pudo actualizar el CAI: ${error.message}`);
  return aCai(data as CaiRow);
}

/**
 * Check if can generate invoice with this CAI
 */
export async function canGenerateInvoice(caiId: string): Promise<{ can: boolean; reason?: string }> {
  const cai = await getCAIById(caiId);
  if (!cai) return { can: false, reason: 'CAI not found' };

  if (cai.status === 'EXPIRED') return { can: false, reason: 'CAI expired' };
  if (cai.status === 'EXHAUSTED') return { can: false, reason: 'CAI range exhausted' };

  return { can: true };
}

/**
 * Get CAI by ID
 */
export async function getCAIById(id: string): Promise<CAI | null> {
  const { data, error } = await cliente()
    .from('cai')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el CAI: ${error.message}`);
  return data ? aCai(data as CaiRow) : null;
}

/**
 * Delete a CAI
 */
export async function deleteCAI(id: string): Promise<void> {
  const { error } = await cliente().from('cai').delete().eq('id', id);
  if (error) throw new Error(`No se pudo eliminar el CAI: ${error.message}`);
}

// Re-export utilities and types
export { formatCAIDisplay, getCAIExpirationText, computeCAIStatus, getRangeUsagePercentage } from './cai-utils';
export type { CAI, CAIStatus, CAIAlert, CAIStatistics } from './cai-types';

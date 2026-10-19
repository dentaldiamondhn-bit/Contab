// Servicio de tabla maestra de ubicaciones del inventario (server-side).
// Tabla: product_location. Migracion: prisma/migrations/017_location_master.sql
// + supabase/LOCATION_MASTER.sql (RLS). Alcance por tenant + company.

import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';

export interface ProductLocation {
  id: string;
  tenant_id: string;
  company_id: string | null;
  code: string | null;
  name: string;
  aisle: string | null;
  shelf: string | null;
  description: string | null;
  is_active: boolean;
  image_url?: string | null;
  warehouse_id?: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
  warehouse?: { id: string; code: string | null; name: string } | null;
}

const MIGRATION_HINT =
  'Faltan columnas/tablas de ubicaciones. Ejecute prisma/migrations/017_location_master.sql en el SQL Editor de Supabase.';

export function isLocationMigrationMissingError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  const code = String((err as { code?: string })?.code || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /column .* does not exist/i.test(msg)
  );
}

function locationMigrationError(): Error {
  const err = new Error(MIGRATION_HINT);
  (err as { code?: string }).code = 'LOCATION_MIGRATION_MISSING';
  return err;
}

function companyScope(query: unknown, companyId: string) {
  return (query as { or: (cond: string) => unknown }).or(
    `company_id.eq.${companyId},company_id.is.null`,
  );
}

export async function listLocations(
  companyId: string,
  tenantHint?: string | null,
  opts?: { activeOnly?: boolean; includeCount?: boolean },
): Promise<ProductLocation[]> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let query = supabase
    .from('product_location')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  query = companyScope(query, companyId) as typeof query;
  if (opts?.activeOnly !== false) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    if (isLocationMigrationMissingError(error)) throw locationMigrationError();
    throw error;
  }

  let locations = (data || []) as ProductLocation[];

  // Cargar almacenes del tenant+company para resolver el nombre
  const { data: warehouses } = await supabase
    .from('warehouse')
    .select('id, code, name')
    .eq('tenant_id', tenantId);
  const warehouseMap = new Map<string, { id: string; code: string | null; name: string }>();
  if (warehouses) {
    for (const w of warehouses as { id: string; code: string | null; name: string }[]) {
      warehouseMap.set(w.id, w);
    }
  }
  locations = locations.map((l) => ({
    ...l,
    warehouse: l.warehouse_id ? warehouseMap.get(l.warehouse_id) || null : null,
  }));

  if (opts?.includeCount) {
    const { data: counts, error: countError } = await supabase
      .from('product')
      .select('location_id')
      .not('location_id', 'is', null)
      .eq('tenant_id', tenantId);
    if (countError) {
      if (isLocationMigrationMissingError(countError)) throw locationMigrationError();
      throw countError;
    }
    const map = new Map<string, number>();
    for (const p of counts || []) {
      const key = (p as { location_id?: string }).location_id;
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
    locations = locations.map((l) => ({ ...l, product_count: map.get(l.id) || 0 }));
  }

  return locations;
}

// Siguiente numero de la serie de codigos UB-### de la empresa, mirando solo
// las filas de ESA empresa (no las de la hermana del mismo tenant, ni las
// company_id NULL). Mismo patron que la serie PROD-### de productos
// (`app/api/inventory/products/route.ts:231`), pero midiendo el maximo de la
// serie en vez del ultimo por created_at, que se salta numeros si un codigo
// mayor se creo antes. `product_location` NO tiene UNIQUE en `code` (017), asi
// que dos creaciones simultaneas podrian repetir el numero: mismo limite que la
// serie de productos.
export async function proximoNumeroCodigoUbicacion(
  companyId: string,
  tenantHint?: string | null,
): Promise<number> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const { data } = await supabase
    .from('product_location')
    .select('code')
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId);
  let max = 0;
  for (const row of (data || []) as { code?: string | null }[]) {
    const match = /^UB-(\d+)$/.exec(String(row.code || ''));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

export async function createLocation(
  companyId: string,
  input: {
    code?: string;
    name: string;
    aisle?: string;
    shelf?: string;
    description?: string;
    image_url?: string | null;
    warehouse_id?: string | null;
  },
  tenantHint?: string | null,
): Promise<ProductLocation> {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('name es requerido');
  }
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const now = new Date().toISOString();
  // El cliente nunca decide el codigo: si no viene, lo genera el servidor
  // (UB-001, UB-002...) en la serie de la propia empresa. Un codigo explicito
  // se respeta (la importacion y la API pueden traer uno propio).
  const codePropio = (input.code || '').trim();
  const code =
    codePropio ||
    `UB-${String(await proximoNumeroCodigoUbicacion(companyId, tenantId)).padStart(3, '0')}`;
  const { data, error } = await supabase
    .from('product_location')
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      code,
      name: input.name.trim(),
      aisle: (input.aisle || '').trim() || null,
      shelf: (input.shelf || '').trim() || null,
      description: (input.description || '').trim() || null,
      is_active: true,
      image_url: input.image_url || null,
      warehouse_id: input.warehouse_id || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) {
    if (isLocationMigrationMissingError(error)) throw locationMigrationError();
    throw error;
  }
  return data as ProductLocation;
}

export async function updateLocation(
  companyId: string,
  locationId: string,
  patch: Partial<Pick<ProductLocation, 'code' | 'name' | 'aisle' | 'shelf' | 'description' | 'is_active' | 'image_url' | 'warehouse_id'>>,
  tenantHint?: string | null,
): Promise<ProductLocation | null> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  // OJO: dentro de un tenant compartido (`TEST1DS`) un `id` + `tenant_id` a solas
  // es un IDOR: alcanza la fila de la empresa hermana. El scope de empresa es
  // imprescindible (`.or('company_id.eq.X,company_id.is.null')`, las filas NULL
  // son validas y visibles para todas las empresas del tenant).
  let findQuery = supabase
    .from('product_location')
    .select('id')
    .eq('id', locationId)
    .eq('tenant_id', tenantId);
  findQuery = companyScope(findQuery, companyId) as typeof findQuery;
  const { data: existing } = await findQuery.maybeSingle();
  if (!existing) return null;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || !patch.name.trim()) throw new Error('name inválido');
    updates.name = patch.name.trim();
  }
  if (patch.code !== undefined) updates.code = String(patch.code || '').trim() || null;
  if (patch.aisle !== undefined) updates.aisle = String(patch.aisle || '').trim() || null;
  if (patch.shelf !== undefined) updates.shelf = String(patch.shelf || '').trim() || null;
  if (patch.description !== undefined) updates.description = String(patch.description || '').trim() || null;
  if (patch.is_active !== undefined) updates.is_active = !!patch.is_active;
  if (patch.image_url !== undefined) updates.image_url = String(patch.image_url || '').trim() || null;
  if (patch.warehouse_id !== undefined) updates.warehouse_id = String(patch.warehouse_id || '').trim() || null;

  let updateQuery = supabase
    .from('product_location')
    .update(updates)
    .eq('id', locationId)
    .eq('tenant_id', tenantId);
  updateQuery = companyScope(updateQuery, companyId) as typeof updateQuery;
  const { data, error } = await updateQuery.select().single();
  if (error) {
    if (isLocationMigrationMissingError(error)) throw locationMigrationError();
    throw error;
  }
  return data as ProductLocation;
}

export async function deleteLocation(
  companyId: string,
  locationId: string,
  tenantHint?: string | null,
): Promise<boolean> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let findQuery = supabase
    .from('product_location')
    .select('id')
    .eq('id', locationId)
    .eq('tenant_id', tenantId);
  findQuery = companyScope(findQuery, companyId) as typeof findQuery;
  const { data: existing } = await findQuery.maybeSingle();
  if (!existing) return false;

  // Desvincular productos antes de eliminar (si existiera la columna location_id)
  const { data: locationsColumn } = await supabase.from('product').select('id').eq('location_id', locationId);
  if (locationsColumn && locationsColumn.length > 0) {
    await supabase.from('product').update({ location_id: null }).eq('location_id', locationId);
  }

  let deleteQuery = supabase
    .from('product_location')
    .delete()
    .eq('id', locationId)
    .eq('tenant_id', tenantId);
  deleteQuery = companyScope(deleteQuery, companyId) as typeof deleteQuery;
  const { error } = await deleteQuery;
  if (error) {
    if (isLocationMigrationMissingError(error)) throw locationMigrationError();
    throw error;
  }
  return true;
}
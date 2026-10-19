// Servicio de medidas por producto (`product_measure`).
//
// Una medida ("Caja", "Docena") es un empaque con factor entero >= 1 sobre la
// UNIDAD BASE del producto: `base = factor x cantidad` (ver measure-calc.ts).
// Sin medidas, el producto se vende en su unidad base y eso es valido.
//
// AISLAMIENTO (AGENTS.md §1): test 1 y test 2 comparten tenant `TEST1DS`, asi
// que filtrar por `product_id` a secas alcanzaria la medida de la empresa
// hermana (mismo IDOR que `location-service`). Todo delete/insert/select va por
// `company_id` ADEMAS de `tenant_id`; el delete filtra por `product_id` y
// `company_id`, nunca por solo `id`.
//
// MIGRACION AUSENTE: si la 074 no esta aplicada, la lectura devuelve un Map
// vacio (el producto sigue vendiendose en base) y la escritura lanza un Error
// claro. La deteccion reutiliza `isMigrationMissingError` de warehouse-service,
// que es el unico sitio donde vive ese helper; no se reimplementa.
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import { exigirFactor } from '@/lib/services/measure-calc';
import { isMigrationMissingError } from '@/lib/services/warehouse-service';

export interface MedidaEntrada {
  name?: string;
  factor?: number | string;
  cost?: number | string | null;
  sale_price?: number | string | null;
  price_includes_tax?: boolean;
  is_active?: boolean;
}

export interface Medida {
  id?: string;
  tenant_id: string;
  company_id: string;
  product_id: string;
  name: string;
  factor: number;
  cost: number | null;
  sale_price: number | null;
  price_includes_tax: boolean;
  is_active: boolean;
}

export interface AlcanceEmpresa {
  tenantId: string;
  companyId: string;
}

const MIGRATION_HINT =
  'Falta la tabla product_measure. Ejecute prisma/migrations/074_product_measure.sql en el SQL Editor de Supabase.';

// Un cost/sale_price vacio es "sin dato" (null); un numero (o su texto) no puede
// ser negativo ni no-numerico. Importes en LEMPIRAS, sin /100 (AGENTS.md §2).
function opcionalNoNegativo(value: number | string | null | undefined, campo: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) throw new Error(`${campo} invalido: ${value}`);
  if (n < 0) throw new Error(`${campo} no puede ser negativo`);
  return n;
}

// Valida el lote y devuelve las entradas normalizadas (nombre recortado, factor
// y montos numericos). `unidadBase` puede ir vacia cuando el llamador (el
// reemplazo) no la conoce y solo necesita el resto de comprobaciones.
export function validarMedidas(
  medidas: MedidaEntrada[] | undefined | null,
  unidadBase: string,
): MedidaEntrada[] {
  if (!medidas || medidas.length === 0) return [];
  const base = String(unidadBase ?? '').trim().toLowerCase();
  const vistos = new Set<string>();
  return medidas.map((entrada, i) => {
    const name = String(entrada?.name ?? '').trim();
    if (!name) throw new Error(`medida ${i + 1}: nombre requerido`);
    const clave = name.toLowerCase();
    if (base && clave === base) {
      throw new Error(`la medida "${name}" no puede llamarse igual que la unidad base`);
    }
    if (vistos.has(clave)) throw new Error(`medida repetida: ${name}`);
    vistos.add(clave);
    return {
      name,
      factor: exigirFactor(entrada.factor ?? 1),
      cost: opcionalNoNegativo(entrada.cost, 'cost'),
      sale_price: opcionalNoNegativo(entrada.sale_price, 'sale_price'),
      price_includes_tax: !!entrada.price_includes_tax,
      is_active: entrada.is_active !== false,
    };
  });
}

export async function reemplazarMedidasCon(
  supabase: unknown,
  alcance: AlcanceEmpresa,
  productId: string,
  medidas: MedidaEntrada[],
): Promise<Medida[]> {
  const sb = supabase as ReturnType<typeof getSupabaseServer>;
  const normalizadas = validarMedidas(medidas, '');

  // Transaccion logica: primero borra las medidas del producto EN ESA empresa,
  // luego inserta el lote. El filtro por `company_id` es lo que impide tocar la
  // medida de la empresa hermana del mismo tenant.
  const { error: delError } = await sb
    .from('product_measure')
    .delete()
    .eq('product_id', productId)
    .eq('tenant_id', alcance.tenantId)
    .eq('company_id', alcance.companyId);
  if (delError) {
    if (isMigrationMissingError(delError)) {
      throw Object.assign(new Error(MIGRATION_HINT), { code: 'PRODUCT_MEASURE_MISSING' });
    }
    throw delError;
  }
  if (normalizadas.length === 0) return [];

  const { data, error } = await sb
    .from('product_measure')
    .insert(
      normalizadas.map((m) => ({
        tenant_id: alcance.tenantId,
        company_id: alcance.companyId,
        product_id: productId,
        name: m.name,
        factor: m.factor,
        cost: m.cost ?? null,
        sale_price: m.sale_price ?? null,
        price_includes_tax: !!m.price_includes_tax,
        is_active: m.is_active !== false,
      })),
    )
    .select();
  if (error) {
    if (isMigrationMissingError(error)) {
      throw Object.assign(new Error(MIGRATION_HINT), { code: 'PRODUCT_MEASURE_MISSING' });
    }
    throw error;
  }
  return (data || []) as Medida[];
}

export async function medidasDeProductosCon(
  supabase: unknown,
  alcance: AlcanceEmpresa,
  productIds: string[],
): Promise<Map<string, Medida[]>> {
  const mapa = new Map<string, Medida[]>();
  // Sin productos no hay nada que consultar: se devuelve el Map vacio antes de
  // tocar la red (comprobado por el test con `consultas`).
  if (!productIds || productIds.length === 0) return mapa;

  const sb = supabase as ReturnType<typeof getSupabaseServer>;
  const { data, error } = await sb
    .from('product_measure')
    .select('*')
    .in('product_id', productIds)
    .eq('tenant_id', alcance.tenantId)
    .eq('company_id', alcance.companyId);
  if (error) {
    // Sin la tabla (074 sin aplicar) el producto se vende en base: Map vacio,
    // sin lanzar, para no tumbar la pantalla de productos.
    if (isMigrationMissingError(error)) return mapa;
    throw error;
  }

  for (const row of (data || []) as Medida[]) {
    const pid = row.product_id;
    const lista = mapa.get(pid);
    if (lista) lista.push(row);
    else mapa.set(pid, [row]);
  }
  return mapa;
}

export async function reemplazarMedidas(
  companyId: string,
  tenantHint: string | null | undefined,
  productId: string,
  medidas: MedidaEntrada[],
): Promise<Medida[]> {
  const tenantId = await resolveTenant(companyId, tenantHint);
  return reemplazarMedidasCon(getSupabaseServer(), { tenantId, companyId }, productId, medidas);
}

export async function medidasDeProductos(
  companyId: string,
  tenantHint: string | null | undefined,
  productIds: string[],
): Promise<Map<string, Medida[]>> {
  const tenantId = await resolveTenant(companyId, tenantHint);
  return medidasDeProductosCon(getSupabaseServer(), { tenantId, companyId }, productIds);
}

import { ErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * Conciliacion bancaria de PAGOS a proveedores (modulo de Compras).
 *
 * Un pago (`SupplierPayment`) ya genera su asiento (debe CxP / haber Banco, ver
 * `crearAsientoPago`). Aqui solo se marca ese pago como conciliado contra la
 * cuenta bancaria del extracto (`bankaccount`), o se desmarca. NO se crean ni se
 * tocan asientos: la conciliacion es evidencia, no contabilidad.
 *
 * Todo se filtra por `company_id` (`companies.id`): `TEST1DS` tiene dos empresas
 * (test 1 y test 2) y `tenant_id` NO las separa. La empresa llega YA VALIDADA por
 * `contextoDeEmpresa` (ver AGENTS.md seccion 1).
 */

type Empresa = { tenantId: string; companyId: string };

export type PagoConciliable = {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  purchase_id: string | null;
  invoice_number: string | null;
  amount: number;
  payment_date: string | null;
  payment_method: string | null;
  reference: string | null;
  journal_entry_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  bank_account_id: string | null;
  reconciliation_reference: string | null;
};

export type CuentaBancaria = {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  account_type: string | null;
  currency: string | null;
};

export type ResumenConciliacion = {
  /** Cantidad de pagos considerados. */
  totalPagos: number;
  conciliados: number;
  pendientes: number;
  /** Suma en moneda (lempiras), no centavos: `SupplierPayment.amount` va en lempiras. */
  montoTotal: number;
  montoConciliado: number;
  montoPendiente: number;
};

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v) || 0);
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/**
 * Pagos de la empresa, con el nombre del proveedor y el numero de factura
 * resueltos en consultas aparte (nada de embeds de PostgREST: un embed a una
 * relacion inexistente aborta el SELECT con `PGRST200`, leccion de la 052).
 */
export async function fetchPagosParaConciliar(
  supabase: any,
  empresa: Empresa,
  opts: { bankAccountId?: string | null } = {}
): Promise<PagoConciliable[]> {
  let query = supabase
    .from('SupplierPayment')
    .select('*')
    .eq('company_id', empresa.companyId)
    .order('payment_date', { ascending: false });

  const bancoId = str(opts.bankAccountId);
  if (bancoId) {
    query = query.eq('bank_account_id', bancoId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const filas = (data || []) as any[];
  if (filas.length === 0) return [];

  const supplierIds = Array.from(
    new Set(filas.map((f) => str(f.supplier_id)).filter((x): x is string => !!x))
  );
  const purchaseIds = Array.from(
    new Set(filas.map((f) => str(f.purchase_id)).filter((x): x is string => !!x))
  );

  const [proveedores, compras] = await Promise.all([
    cargarMapa(supabase, 'Supplier', 'id, name', empresa.companyId, supplierIds),
    cargarMapa(supabase, 'Purchase', 'id, invoice_number', empresa.companyId, purchaseIds),
  ]);

  return filas.map((f) => ({
    id: String(f.id),
    supplier_id: str(f.supplier_id),
    supplier_name: f.supplier_id ? proveedores.get(String(f.supplier_id)) ?? null : null,
    purchase_id: str(f.purchase_id),
    invoice_number: f.purchase_id ? compras.get(String(f.purchase_id)) ?? null : null,
    amount: num(f.amount),
    payment_date: f.payment_date ?? null,
    payment_method: f.payment_method ?? null,
    reference: str(f.reference_number),
    journal_entry_id: str(f.journal_entry_id),
    is_reconciled: Boolean(f.is_reconciled),
    reconciled_at: f.reconciled_at ?? null,
    bank_account_id: str(f.bank_account_id),
    reconciliation_reference: str(f.reconciliation_reference),
  }));
}

export function resumenConciliacion(pagos: PagoConciliable[]): ResumenConciliacion {
  let conciliados = 0;
  let montoTotal = 0;
  let montoConciliado = 0;
  for (const p of pagos) {
    montoTotal += p.amount;
    if (p.is_reconciled) {
      conciliados += 1;
      montoConciliado += p.amount;
    }
  }
  return {
    totalPagos: pagos.length,
    conciliados,
    pendientes: pagos.length - conciliados,
    montoTotal,
    montoConciliado,
    montoPendiente: montoTotal - montoConciliado,
  };
}

export async function fetchCuentasBancarias(
  supabase: any,
  empresa: Empresa
): Promise<CuentaBancaria[]> {
  const { data, error } = await supabase
    .from('bankaccount')
    .select('id, bank_name, account_number, account_type, currency')
    .eq('company_id', empresa.companyId)
    .eq('is_active', true)
    .order('bank_name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((c) => ({
    id: String(c.id),
    bank_name: c.bank_name ?? null,
    account_number: c.account_number ?? null,
    account_type: c.account_type ?? null,
    currency: c.currency ?? null,
  }));
}

/**
 * Marca un lote de pagos como conciliados contra una cuenta bancaria.
 *
 * Valida ANTES de escribir y devuelve `notFound` (404, no 403) cuando la cuenta
 * o algun pago es de otra empresa: con solo `.eq('company_id')` en el UPDATE, un
 * id ajeno no encuentra fila, o sea 0 afectadas sin error y el cliente veria un
 * exito silencioso. Mismo contrato que `purchase-returns-db.ts`.
 */
export async function marcarPagosConciliados(
  supabase: any,
  empresa: Empresa,
  args: { paymentIds: string[]; bankAccountId: string; date?: string | null; reference?: string | null }
): Promise<{ actualizados: number } | { notFound: true }> {
  const ids = normalizarIds(args.paymentIds);
  if (ids.length === 0) throw new ErrorDeEmpresa(400, 'Selecciona al menos un pago para conciliar.');
  const bankAccountId = str(args.bankAccountId);
  if (!bankAccountId) throw new ErrorDeEmpresa(400, 'Selecciona la cuenta bancaria de la conciliación.');

  const { data: cuenta } = await supabase
    .from('bankaccount')
    .select('id')
    .eq('id', bankAccountId)
    .eq('company_id', empresa.companyId)
    .maybeSingle();
  if (!cuenta) return { notFound: true };

  const propios = await idsDeLaEmpresa(supabase, empresa, ids);
  if (!propios) return { notFound: true };

  const { data, error } = await supabase
    .from('SupplierPayment')
    .update({
      is_reconciled: true,
      reconciled_at: str(args.date) || new Date().toISOString(),
      bank_account_id: bankAccountId,
      reconciliation_reference: str(args.reference),
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', empresa.companyId)
    .in('id', propios)
    .select();
  if (error) throw new Error(error.message);

  return { actualizados: (data || []).length };
}

/** Quita la conciliacion de un lote de pagos (los devuelve a pendientes). */
export async function desmarcarPagosConciliados(
  supabase: any,
  empresa: Empresa,
  paymentIds: string[]
): Promise<{ actualizados: number } | { notFound: true }> {
  const ids = normalizarIds(paymentIds);
  if (ids.length === 0) {
    throw new ErrorDeEmpresa(400, 'Selecciona al menos un pago para quitar la conciliación.');
  }

  const propios = await idsDeLaEmpresa(supabase, empresa, ids);
  if (!propios) return { notFound: true };

  const { data, error } = await supabase
    .from('SupplierPayment')
    .update({
      is_reconciled: false,
      reconciled_at: null,
      bank_account_id: null,
      reconciliation_reference: null,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', empresa.companyId)
    .in('id', propios)
    .select();
  if (error) throw new Error(error.message);

  return { actualizados: (data || []).length };
}

/** Ids validos (strings no vacios, sin repetir) desde un arreglo o un CSV. */
export function normalizarIds(entrada: unknown): string[] {
  if (Array.isArray(entrada)) {
    return Array.from(new Set(entrada.filter((x): x is string => typeof x === 'string' && x.length > 0)));
  }
  if (typeof entrada === 'string') {
    return Array.from(new Set(entrada.split(',').map((s) => s.trim()).filter(Boolean)));
  }
  return [];
}

// ---------------------------------------------------------------------------

/** Ids de la empresa; `null` si algun id no le pertenece (para responder 404). */
async function idsDeLaEmpresa(supabase: any, empresa: Empresa, ids: string[]): Promise<string[] | null> {
  const { data } = await supabase
    .from('SupplierPayment')
    .select('id')
    .eq('company_id', empresa.companyId)
    .in('id', ids);
  const propios = new Set(((data || []) as any[]).map((f) => String(f.id)));
  for (const id of ids) {
    if (!propios.has(id)) return null;
  }
  return ids;
}

async function cargarMapa(
  supabase: any,
  tabla: string,
  cols: string,
  companyId: string,
  ids: string[]
): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  if (ids.length === 0) return mapa;
  const { data } = await supabase.from(tabla).select(cols).eq('company_id', companyId).in('id', ids);
  for (const f of (data || []) as any[]) {
    if (tabla === 'Supplier') mapa.set(String(f.id), (f.name as string) ?? null);
    else mapa.set(String(f.id), (f.invoice_number as string) ?? null);
  }
  return mapa;
}

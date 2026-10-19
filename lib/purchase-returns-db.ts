import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirFactor, factorValido, unidadesBase } from '@/lib/services/measure-calc';
import type { EmpresaCompra } from '@/lib/purchase-db';

/**
 * Devoluciones a proveedores (migracion 060).
 *
 * Una devolucion es un documento propio, ligado a la COMPRA de origen. Cada
 * linea se casa con una linea de `PurchaseItem` (por `purchase_item_id`, o por
 * `product_id`, o por nombre) y no puede exceder lo disponible (lo comprado
 * menos lo ya devuelto de esa misma linea).
 *
 * Efectos laterales, best-effort igual que `createPurchase` en `purchase-db.ts`:
 *   - BAJA stock del producto (inverso del alta de la compra), por nombre dentro
 *     de la empresa.
 *   - Crea un asiento de reversa (nota de credito): debita CxP/banco y acredita
 *     inventario/gasto + ISV credito fiscal.
 *
 * Aislamiento: SIEMPRE por `company_id` (nunca `tenant_id`); la empresa viene ya
 * validada en `empresa`. La compra de origen se comprueba contra la empresa
 * ANTES de escribir: si es de otra, se devuelve `notFound` (404), no 403, para
 * no confirmar que existe.
 */

export interface ReturnFilters {
  purchaseId?: string | null;
  supplierId?: string | null;
  search?: string | null;
}

interface LineaCompra {
  id?: string;
  product_id?: string | null;
  product_code?: string | null;
  product_name?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  tax_rate?: number | string | null;
  unit?: string | null;
  unit_factor?: number | string | null;
}

const numero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function sumarPorClave(previos: Array<{ purchase_item_id?: string | null; quantity?: number | string | null }>) {
  const mapa = new Map<string, number>();
  for (const fila of previos) {
    const clave = String(fila.purchase_item_id || '');
    if (!clave) continue;
    mapa.set(clave, (mapa.get(clave) || 0) + numero(fila.quantity));
  }
  return mapa;
}

export function transformReturn(r: any, items: any[], supplier?: any): any {
  const { Supplier, PurchaseReturnItem, ...rest } = r || {};
  return {
    ...rest,
    companyId: r?.company_id,
    supplier: supplier || Supplier || null,
    supplier_id: supplier?.id || r?.supplier_id || null,
    supplier_name: supplier?.name || '',
    items: items || [],
  };
}

/**
 * Devuelve la compra de origen dentro de la empresa, o `null`. Se usa antes de
 * escribir nada, para responder 404 si es de otra empresa.
 */
async function compraDeLaEmpresa(supabase: SupabaseClient, empresa: EmpresaCompra, purchaseId: string) {
  const { data, error } = await supabase
    .from('Purchase')
    .select('*')
    .eq('id', purchaseId)
    .eq('company_id', empresa.companyId)
    .maybeSingle();
  if (error) return { purchase: null, error };
  return { purchase: data, error: null };
}

async function itemsDeCompra(supabase: SupabaseClient, empresa: EmpresaCompra, purchaseId: string): Promise<LineaCompra[]> {
  const { data } = await supabase
    .from('PurchaseItem')
    .select('*')
    .eq('purchase_id', purchaseId)
    .eq('company_id', empresa.companyId);
  return data || [];
}

/** Cuanto se ha devuelto ya de cada linea de compra (por `purchase_item_id`). */
async function devueltoPorLinea(supabase: SupabaseClient, empresa: EmpresaCompra, purchaseItemIds: string[]) {
  const ids = Array.from(new Set(purchaseItemIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, number>();
  const { data } = await supabase
    .from('PurchaseReturnItem')
    .select('purchase_item_id, quantity')
    .eq('company_id', empresa.companyId)
    .in('purchase_item_id', ids);
  return sumarPorClave(data || []);
}

function casarLinea(item: any, lineasCompra: LineaCompra[]): LineaCompra | undefined {
  if (item.purchase_item_id) {
    const porId = lineasCompra.find((l) => String(l.id) === String(item.purchase_item_id));
    if (porId) return porId;
  }
  if (item.product_id) {
    const porProducto = lineasCompra.find((l) => l.product_id && String(l.product_id) === String(item.product_id));
    if (porProducto) return porProducto;
  }
  const nombre = String(item.product_name || item.description || '').trim().toLowerCase();
  if (nombre) {
    return lineasCompra.find((l) => String(l.product_name || l.description || '').trim().toLowerCase() === nombre);
  }
  return undefined;
}

export async function fetchPurchaseReturns(supabase: SupabaseClient, empresa: EmpresaCompra, filters: ReturnFilters = {}) {
  let query = supabase
    .from('PurchaseReturn')
    .select('*')
    .eq('company_id', empresa.companyId)
    .order('return_date', { ascending: false });

  if (filters.purchaseId) query = query.eq('purchase_id', filters.purchaseId);
  if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);

  const { data, error } = await query;
  if (error) return { data: null, error };

  const rows = data || [];
  const ids = rows.map((r: any) => String(r.id));

  // Sin embeds: se resuelven lineas y proveedor con consultas aparte (patron
  // `paymentlink`). Un embed a una relacion que no exista aborta el SELECT.
  let items: any[] = [];
  if (ids.length > 0) {
    const { data: lineas } = await supabase
      .from('PurchaseReturnItem')
      .select('*')
      .eq('company_id', empresa.companyId)
      .in('return_id', ids);
    items = lineas || [];
  }

  const itemsPorReturn = new Map<string, any[]>();
  for (const it of items) {
    const clave = String(it.return_id);
    const arr = itemsPorReturn.get(clave) || [];
    arr.push(it);
    itemsPorReturn.set(clave, arr);
  }

  const supplierIds = Array.from(new Set(rows.map((r: any) => r.supplier_id).filter(Boolean).map(String)));
  const proveedores = new Map<string, any>();
  if (supplierIds.length > 0) {
    const { data: sups } = await supabase
      .from('Supplier')
      .select('id, name, rtn')
      .eq('company_id', empresa.companyId)
      .in('id', supplierIds);
    for (const s of sups || []) proveedores.set(String(s.id), s);
  }

  let resultados = rows.map((r: any) =>
    transformReturn(r, itemsPorReturn.get(String(r.id)) || [], r.supplier_id ? proveedores.get(String(r.supplier_id)) : null)
  );

  if (filters.search) {
    const term = filters.search.toLowerCase();
    resultados = resultados.filter(
      (r: any) =>
        String(r.return_number || '').toLowerCase().includes(term) ||
        String(r.invoice_number || '').toLowerCase().includes(term) ||
        String(r.supplier_name || '').toLowerCase().includes(term) ||
        String(r.reason || '').toLowerCase().includes(term)
    );
  }

  return { data: resultados, error: null };
}

export async function fetchPurchaseReturn(supabase: SupabaseClient, empresa: EmpresaCompra, id: string) {
  const { data: header, error } = await supabase
    .from('PurchaseReturn')
    .select('*')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();
  if (error) return { data: null, error };
  if (!header) return { data: null, error: null, notFound: true as const };

  const { data: items } = await supabase
    .from('PurchaseReturnItem')
    .select('*')
    .eq('return_id', id)
    .eq('company_id', empresa.companyId);

  let supplier: any = null;
  if (header.supplier_id) {
    const { data: sups } = await supabase
      .from('Supplier')
      .select('id, name, rtn')
      .eq('id', header.supplier_id)
      .eq('company_id', empresa.companyId)
      .limit(1);
    supplier = sups?.[0] || null;
  }

  return { data: transformReturn(header, items || [], supplier), error: null };
}

export async function createPurchaseReturn(supabase: SupabaseClient, empresa: EmpresaCompra, body: any) {
  const purchaseId = typeof body?.purchase_id === 'string' ? body.purchase_id : '';
  if (!purchaseId) {
    throw new ErrorDeEmpresa(400, 'La devolucion necesita una compra de origen (purchase_id).');
  }

  const { purchase, error: compraError } = await compraDeLaEmpresa(supabase, empresa, purchaseId);
  if (compraError) return { data: null, error: compraError };
  if (!purchase) return { data: null, error: null, notFound: true as const };

  const lineasCompra = await itemsDeCompra(supabase, empresa, purchaseId);
  if (lineasCompra.length === 0) {
    throw new ErrorDeEmpresa(400, 'La compra de origen no tiene articulos que devolver.');
  }

  const itemIdsCompra = lineasCompra.map((l) => String(l.id)).filter(Boolean);
  const yaDevuelto = await devueltoPorLinea(supabase, empresa, itemIdsCompra);

  const entradas: any[] = Array.isArray(body.items) && body.items.length > 0 ? body.items : lineasCompra.map((l) => ({ purchase_item_id: l.id }));

  // Se agrupa por cantidad pedida antes de validar: dos lineas del cuerpo que
  // apunten al mismo articulo no pueden, juntas, pasar de lo disponible.
  const pedido = new Map<string, number>();
  const detalle: Array<{ compra: LineaCompra; cantidad: number }> = [];

  for (const entrada of entradas) {
    const lineaCompra = casarLinea(entrada, lineasCompra);
    if (!lineaCompra) {
      throw new ErrorDeEmpresa(400, 'Una linea de la devolucion no corresponde a ningun articulo de la compra.');
    }
    const cantidad = numero(entrada.quantity);
    if (cantidad <= 0) {
      throw new ErrorDeEmpresa(400, 'Cada linea de la devolucion necesita una cantidad mayor que cero.');
    }
    const clave = String(lineaCompra.id || '');
    const acumulado = (pedido.get(clave) || 0) + cantidad;
    const disponible = numero(lineaCompra.quantity) - (yaDevuelto.get(clave) || 0);
    if (acumulado > disponible) {
      throw new ErrorDeEmpresa(
        400,
        `No se puede devolver mas de lo disponible en "${lineaCompra.product_name || lineaCompra.description || 'articulo'}" (disponible ${disponible}).`
      );
    }
    pedido.set(clave, acumulado);
    detalle.push({ compra: lineaCompra, cantidad });
  }

  // Dos pasadas: aqui (ANTES del insert de cabecera) se normaliza la medida y se
  // calcula la base de stock, para que una cantidad que no da base entera lance
  // sin haber escrito ni la cabecera ni las lineas.
  const lineas = detalle.map(({ compra, cantidad }) => {
    const unitPrice = Math.round(numero(compra.unit_price));
    const taxRate = numero(compra.tax_rate) || 15;
    const subtotal = Math.round(cantidad * unitPrice);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const factor = exigirFactor(compra.unit_factor ?? 1);
    const cantidadBase = unidadesBase(cantidad, factor);
    return {
      purchase_item_id: compra.id ? String(compra.id) : null,
      product_id: compra.product_id || null,
      product_name: compra.product_name || compra.description || '',
      quantity: cantidad,
      unit: compra.unit || null,
      unit_factor: factor,
      cantidadBase,
      unit_price: unitPrice,
      tax_rate: taxRate,
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
    };
  });

  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
  const taxAmount = lineas.reduce((s, l) => s + l.tax_amount, 0);
  const total = lineas.reduce((s, l) => s + l.total, 0);

  const returnType = body.return_type === 'cash' ? 'cash' : 'credit';
  const returnNumber = body.return_number || `DEV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const returnDate = body.return_date || new Date().toISOString().split('T')[0];

  const { data: header, error: headerError } = await supabase
    .from('PurchaseReturn')
    .insert({
      purchase_id: String(purchaseId),
      company_id: empresa.companyId,
      tenant_id: empresa.tenantId,
      supplier_id: purchase.supplier_id || null,
      invoice_number: purchase.invoice_number || null,
      return_number: returnNumber,
      return_date: returnDate,
      return_type: returnType,
      reason: body.reason || null,
      notes: body.notes || null,
      subtotal,
      tax_amount: taxAmount,
      total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (headerError) return { data: null, error: headerError };

  const filas = lineas.map((l) => ({
    return_id: header.id,
    company_id: empresa.companyId,
    tenant_id: empresa.tenantId,
    purchase_item_id: l.purchase_item_id,
    product_id: l.product_id,
    product_name: l.product_name,
    quantity: l.quantity,
    unit: l.unit,
    unit_factor: l.unit_factor,
    unit_price: l.unit_price,
    tax_rate: l.tax_rate,
    subtotal: l.subtotal,
    tax_amount: l.tax_amount,
    total: l.total,
    created_at: new Date().toISOString(),
  }));

  const { error: lineasError } = await supabase.from('PurchaseReturnItem').insert(filas);
  if (lineasError) console.error('Error creating purchase return items:', lineasError);

  // Baja de stock (inverso de createPurchase). Best-effort: nunca bloquea.
  for (const l of lineas) {
    if (!l.product_name) continue;
    const { data: existente } = await supabase
      .from('product')
      .select('id, current_stock')
      .eq('company_id', empresa.companyId)
      .ilike('name', l.product_name)
      .limit(1);
    if (existente && existente.length > 0) {
      const row = existente[0];
      const nuevoStock = (numero(row.current_stock) || 0) - l.cantidadBase;
      await supabase
        .from('product')
        .update({ current_stock: nuevoStock, stock_quantity: nuevoStock })
        .eq('id', row.id)
        .eq('company_id', empresa.companyId);
    }
  }

  // Asiento de reversa (best-effort, nunca bloquea).
  const asiento = await createReturnJournalEntry(supabase, empresa, header, purchase, lineas);
  if (asiento) {
    await supabase
      .from('PurchaseReturn')
      .update({ journal_entry_id: asiento.id })
      .eq('id', header.id)
      .eq('company_id', empresa.companyId);
  }

  const supplier = purchase.supplier_id
    ? (await supabase.from('Supplier').select('id, name, rtn').eq('id', purchase.supplier_id).eq('company_id', empresa.companyId).limit(1)).data?.[0] || null
    : null;

  return { data: transformReturn({ ...header, journal_entry_id: asiento?.id || null }, filas, supplier), error: null };
}

async function createReturnJournalEntry(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  ret: any,
  purchase: any,
  lineas: Array<{ subtotal: number; tax_amount: number }>
) {
  try {
    const companyId = empresa.companyId;
    const cuenta = async (code: string): Promise<string | undefined> => {
      const { data } = await supabase.from('Account').select('id').eq('code', code).eq('company_id', companyId).limit(1);
      return data?.[0]?.id;
    };

    // La contrapartida del asiento de compra: inventario (mercaderia) o gasto.
    let cuentaContrapartida: string | undefined;
    if (purchase.purchase_type === 'merchandise') {
      cuentaContrapartida = await cuenta('1105');
    } else if (purchase.expense_category === 'administrative') {
      cuentaContrapartida = await cuenta('4101');
    } else {
      cuentaContrapartida = await cuenta('4100');
    }

    const isvAccountId = await cuenta('1110');
    // Si el reembolso es en efectivo entra al banco (1101); si es a cuenta,
    // reduce las cuentas por pagar (2101).
    const cuentaPago = ret.return_type === 'cash' ? await cuenta('1101') : await cuenta('2101');

    if (!cuentaContrapartida || !cuentaPago) {
      console.error('Missing accounts for return journal entry');
      return null;
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from('JournalEntry')
      .insert({
        date: ret.return_date,
        reference: `DEV-${ret.return_number}`,
        description: `Devolucion a proveedor - Compra ${ret.invoice_number || ret.purchase_id}`,
        is_posted: true,
        total_debit: ret.total,
        total_credit: ret.total,
        tenant_id: empresa.tenantId,
        company_id: companyId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jeError) {
      console.error('Error creating return journal entry:', jeError);
      return null;
    }

    const lines: any[] = [];
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: cuentaPago,
      description: ret.return_type === 'cash' ? 'Reembolso de proveedor' : 'Cuentas por Pagar',
      debit_amount: ret.total,
      credit_amount: 0,
      tenant_id: empresa.tenantId,
    });

    const subtotalTotal = lineas.reduce((s, l) => s + l.subtotal, 0);
    if (subtotalTotal > 0) {
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: cuentaContrapartida,
        description: purchase.purchase_type === 'merchandise' ? 'Devolucion de mercaderia' : 'Devolucion de gasto',
        debit_amount: 0,
        credit_amount: subtotalTotal,
        tenant_id: empresa.tenantId,
      });
    }

    const isvTotal = lineas.reduce((s, l) => s + l.tax_amount, 0);
    if (isvTotal > 0 && isvAccountId) {
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: isvAccountId,
        description: 'Reversa ISV Credito Fiscal',
        debit_amount: 0,
        credit_amount: isvTotal,
        tenant_id: empresa.tenantId,
      });
    }

    const { error: linesError } = await supabase.from('JournalEntryLine').insert(lines);
    if (linesError) console.error('Error creating return journal entry lines:', linesError);

    return journalEntry;
  } catch (error) {
    console.error('Error in createReturnJournalEntry:', error);
    return null;
  }
}

export async function deletePurchaseReturn(supabase: SupabaseClient, empresa: EmpresaCompra, id: string) {
  const { data: header } = await supabase
    .from('PurchaseReturn')
    .select('id, journal_entry_id')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();
  if (!header) return { error: null, notFound: true as const };

  const { data: items } = await supabase
    .from('PurchaseReturnItem')
    .select('product_name, quantity, unit_factor')
    .eq('return_id', id)
    .eq('company_id', empresa.companyId);

  // Reponer el stock que la devolucion habia bajado (best-effort, inverso).
  // `factorValido` (no `exigirFactor`): una devolucion vieja (pre-074) tiene
  // `unit_factor` NULL y debe reponer su `quantity` con factor 1, no lanzar.
  for (const l of items || []) {
    if (!l.product_name) continue;
    const { data: existente } = await supabase
      .from('product')
      .select('id, current_stock')
      .eq('company_id', empresa.companyId)
      .ilike('name', l.product_name)
      .limit(1);
    if (existente && existente.length > 0) {
      const row = existente[0];
      const nuevoStock = (numero(row.current_stock) || 0) + unidadesBase(numero(l.quantity), factorValido(l.unit_factor));
      await supabase
        .from('product')
        .update({ current_stock: nuevoStock, stock_quantity: nuevoStock })
        .eq('id', row.id)
        .eq('company_id', empresa.companyId);
    }
  }

  if (header.journal_entry_id) {
    await supabase.from('JournalEntryLine').delete().eq('journal_entry_id', header.journal_entry_id);
    await supabase.from('JournalEntry').delete().eq('id', header.journal_entry_id).eq('company_id', empresa.companyId);
  }

  await supabase.from('PurchaseReturnItem').delete().eq('return_id', id).eq('company_id', empresa.companyId);
  const { error } = await supabase.from('PurchaseReturn').delete().eq('id', id).eq('company_id', empresa.companyId);
  if (error) return { error };
  return { error: null };
}

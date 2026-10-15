import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorDeEmpresa } from '@/lib/tenant-resolver';
import { idsDeEstaEmpresa, idValidoDe, createPurchase, type EmpresaCompra } from '@/lib/purchase-db';

/**
 * Órdenes de Compra: aislamiento real y flujo O.C. → Compra (8 Oct 2026).
 *
 * Antes `/api/purchase-orders` iba clavado en `tenantId = '1'` y aceptaba el
 * `companyId` del cliente sin validar; PATCH/DELETE filtraban solo por `id`, o
 * sea que cualquier UUID de otra empresa servía para editarla o borrarla
 * (IDOR). Además "Recibir" solo marcaba `status = 'RECEIVED'`: la factura había
 * que teclearla a mano en Compras y no quedaba ningún enlace entre la orden y
 * la compra.
 *
 * El módulo entero sigue el patrón de Compras/Proveedores:
 * `company_id` es la frontera (no `tenant_id`), la empresa sale del contexto
 * validado (`exigirEmpresa` en las rutas) y NO del cuerpo, y la pertenencia se
 * comprueba ANTES de escribir y se devuelve 404 (no 403) ante un id ajeno.
 *
 * `recibirPurchaseOrder` hace que "Recibir" registre la **compra real** a través
 * de `createPurchase` (misma tubería que el módulo de Compras: ítems, productos,
 * historial de precios y asiento) y cuelga `PurchaseOrder.purchase_id`. Admite
 * recepción **parcial**: cada entrega es una `PurchaseOrderReceipt` con su propia
 * factura y su propia `Purchase`, y la orden acumula hasta quedar
 * `PARTIALLY_RECEIVED` / `RECEIVED`. La validación va ANTES de escribir y **no**
 * se reserva el estado: si algo falla, la orden queda intacta.
 */

export interface PurchaseOrderFilters {
  supplierId?: string | null;
  search?: string | null;
  status?: string | null;
}

/** Pasa un `PurchaseOrder` de PostgREST a la forma que espera la UI. */
export function transformOrder(o: any): any {
  const supplier = Array.isArray(o.Supplier) ? o.Supplier[0] : o.Supplier;
  const rows = Array.isArray(o.items)
    ? o.items
    : Array.isArray(o.PurchaseOrderItem)
      ? o.PurchaseOrderItem
      : [];
  const { Supplier, PurchaseOrderItem, ...rest } = o;
  return { ...rest, supplier, items: rows.map((i: any) => ({ ...i })) };
}

/**
 * Rellena `Supplier` y `items` SIN usar embeds de PostgREST.
 *
 * MOTIVO (8 Oct 2026, medido con la `service_role`): la base no declara las FK de
 * `PurchaseOrder`/`PurchaseOrderItem`, asi que un embed a una relacion inexistente
 * NO devuelve vacio: devuelve `PGRST200` ("Could not find a relationship between
 * 'PurchaseOrder' and 'supplier_id'") y la ruta lo traduce a **500**. Por eso el
 * GET de `/api/purchase-orders` reventaba: `Supplier:supplier_id(...)` y
 * `PurchaseOrderItem(...)` no resolvian.
 *
 * Se resuelve con consultas aparte (mismo patron que `paymentlink`, que tampoco
 * declara FK). El proveedor se busca por id **y por empresa**: si un
 * `supplier_id` viejo apunta a un proveedor ajeno, resuelve a `null` en vez de
 * colar el nombre/RTN de la hermana. Los items se piden por `purchase_order_id`
 * porque las ordenes ya vienen acotadas a la empresa.
 *
 * La migracion 052 anade las FK; cuando este aplicada, este camino sigue siendo
 * valido (y no depende del schema cache de PostgREST).
 */
async function hidratarOrdenes(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  ordenes: any[]
): Promise<any[]> {
  if (ordenes.length === 0) return [];

  const supplierIds = Array.from(
    new Set(ordenes.map((o) => o.supplier_id).filter((x): x is string => !!x))
  );
  const proveedores = new Map<string, any>();
  if (supplierIds.length > 0) {
    const { data } = await supabase
      .from('Supplier')
      .select('id, name, rtn')
      .eq('company_id', empresa.companyId)
      .in('id', supplierIds);
    for (const s of data || []) proveedores.set(String(s.id), s);
  }

  const orderIds = ordenes.map((o) => o.id).filter((x): x is string => !!x);
  const itemsPorOrden = new Map<string, any[]>();
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('PurchaseOrderItem')
      .select('*')
      .in('purchase_order_id', orderIds);
    for (const it of data || []) {
      const k = String(it.purchase_order_id);
      if (!itemsPorOrden.has(k)) itemsPorOrden.set(k, []);
      itemsPorOrden.get(k)!.push(it);
    }
  }

  return ordenes.map((o) =>
    transformOrder({
      ...o,
      Supplier: proveedores.get(String(o.supplier_id)) || null,
      items: itemsPorOrden.get(String(o.id)) || [],
    })
  );
}

async function exigirProveedorDeLaEmpresa(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  supplierId: unknown
): Promise<void> {
  if (typeof supplierId !== 'string' || !supplierId) {
    throw new ErrorDeEmpresa(400, 'Seleccione un proveedor.');
  }
  const propios = await idsDeEstaEmpresa(supabase, empresa, 'Supplier', [supplierId]);
  if (!propios.has(String(supplierId))) {
    throw new ErrorDeEmpresa(400, 'El proveedor no pertenece a la empresa activa.');
  }
}

export async function fetchPurchaseOrders(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  filtros: PurchaseOrderFilters = {}
) {
  // El aislamiento: `company_id`, no `tenant_id`. TEST1DS tiene dos empresas y
  // test 1 y test 2 no pueden verse entre si.
  // Sin embeds: ver `hidratarOrdenes`. Un embed a una FK inexistente devuelve
  // PGRST200 y tumba el GET con 500 (la base no declara estas relaciones).
  let query = supabase
    .from('PurchaseOrder')
    .select('*')
    .eq('company_id', empresa.companyId)
    .order('created_at', { ascending: false });

  if (filtros.supplierId) query = query.eq('supplier_id', filtros.supplierId);
  if (filtros.status) query = query.eq('status', filtros.status);

  const { data, error } = await query;
  if (error) return { data: null, error };

  let filas = await hidratarOrdenes(supabase, empresa, data || []);

  if (filtros.search) {
    const termino = filtros.search.toLowerCase();
    filas = filas.filter(
      (o: any) =>
        String(o.order_number || '').toLowerCase().includes(termino) ||
        String(o.supplier?.name || '').toLowerCase().includes(termino)
    );
  }

  return { data: filas, error: null };
}

export async function createPurchaseOrder(supabase: SupabaseClient, empresa: EmpresaCompra, body: any) {
  const supplierId = body.supplier_id;
  await exigirProveedorDeLaEmpresa(supabase, empresa, supplierId);

  // Los `product_id` de las lineas que no sean de esta empresa se sueltan en
  // silencio, igual que hace `createPurchase`: el filtro de UI ya solo ofrece
  // los propios, y una linea puede venir solo con codigo/descripcion.
  const articulos = Array.isArray(body.items) ? body.items : [];
  const productosValidos = await idsDeEstaEmpresa(
    supabase,
    empresa,
    'product',
    articulos.map((i: any) => i.product_id)
  );

  const orderNumber = String(body.order_number || '').trim();
  if (!orderNumber) {
    throw new ErrorDeEmpresa(400, 'El número de orden es obligatorio.');
  }

  const now = new Date().toISOString();

  const { data: order, error: orderError } = await supabase
    .from('PurchaseOrder')
    .insert({
      order_number: orderNumber,
      supplier_id: supplierId,
      order_date: body.order_date || now.split('T')[0],
      expected_date: body.expected_date || null,
      subtotal: Math.round(Number(body.subtotal) || 0),
      tax_amount: Math.round(Number(body.tax_amount) || 0),
      total: Math.round(Number(body.total) || 0),
      status: 'DRAFT',
      notes: body.notes || null,
      requested_by: body.requested_by || null,
      tenant_id: empresa.tenantId,
      company_id: empresa.companyId,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (orderError) return { data: null, error: orderError };

  if (articulos.length > 0) {
    const filas = articulos.map((item: any) => ({
      purchase_order_id: order.id,
      product_id: idValidoDe(productosValidos, item.product_id),
      product_code: item.product_code || null,
      product_name: item.product_name || item.description || '',
      quantity_requested: Number(item.quantity_requested) || 0,
      quantity_received: Number(item.quantity_received) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: Math.round(Number(item.total) || 0),
      notes: item.notes || null,
      tenant_id: empresa.tenantId,
      company_id: empresa.companyId,
      created_at: now,
    }));

    const { error: itemsError } = await supabase.from('PurchaseOrderItem').insert(filas);
    if (itemsError) {
      console.error('Error creating purchase order items:', itemsError);
      return { data: null, error: itemsError };
    }
  }

  return { data: order, error: null };
}

/**
 * Transiciones de estado permitidas por PATCH. `RECEIVED`/`COMPLETED` NO se
 * permiten aqui: salen solo del flujo de recepcion (`recibirPurchaseOrder`),
 * que es el que crea la compra y cuelga el `purchase_id`.
 */
const ESTADOS_SUBIDA: Record<string, string[]> = {
  DRAFT: ['PENDING', 'APPROVED'],
  PENDING: ['APPROVED'],
};

const CAMPOS_EDITABLES = [
  'order_number', 'supplier_id', 'order_date', 'expected_date', 'subtotal',
  'tax_amount', 'total', 'status', 'notes', 'requested_by',
  'approved_by', 'approved_at',
];

export async function updatePurchaseOrder(supabase: SupabaseClient, empresa: EmpresaCompra, id: string, body: any) {
  // IDOR: sin este `company_id` un id ajeno de otra empresa se editaba.
  const { data: actual, error: actualError } = await supabase
    .from('PurchaseOrder')
    .select('id, status')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (actualError) return { data: null, error: actualError };
  if (!actual) return { data: null, error: null, notFound: true as const };

  if (body.supplier_id !== undefined) {
    await exigirProveedorDeLaEmpresa(supabase, empresa, body.supplier_id);
  }

  const updates: any = {};

  if (body.status !== undefined) {
    const destino = String(body.status);
    const origen = String(actual.status);
    if (destino !== origen) {
      if (destino === 'RECEIVED' || destino === 'COMPLETED') {
        throw new ErrorDeEmpresa(
          409,
          'RECEIVED/COMPLETED solo se alcanzan registrando la compra desde "Recibir".'
        );
      }
      const permitido = (ESTADOS_SUBIDA[origen] || []).includes(destino) || destino === 'CANCELLED';
      if (!permitido) {
        throw new ErrorDeEmpresa(409, `Transición de estado no permitida: ${origen} -> ${destino}`);
      }
      updates.status = destino;
    }
  }

  for (const campo of CAMPOS_EDITABLES) {
    if (campo === 'status' || body[campo] === undefined) continue;
    updates[campo] = body[campo];
  }
  if (updates.subtotal !== undefined) updates.subtotal = Math.round(Number(updates.subtotal));
  if (updates.tax_amount !== undefined) updates.tax_amount = Math.round(Number(updates.tax_amount));
  if (updates.total !== undefined) updates.total = Math.round(Number(updates.total));

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('PurchaseOrder')
    .update(updates)
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .select()
    .single();

  if (error) return { data: null, error };

  return { data, error: null };
}

export async function deletePurchaseOrder(supabase: SupabaseClient, empresa: EmpresaCompra, id: string) {
  const { data: actual } = await supabase
    .from('PurchaseOrder')
    .select('id')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (!actual) return { error: null, notFound: true as const };

  await supabase
    .from('PurchaseOrderItem')
    .delete()
    .eq('purchase_order_id', id)
    .eq('company_id', empresa.companyId);
  const { error } = await supabase
    .from('PurchaseOrder')
    .delete()
    .eq('id', id)
    .eq('company_id', empresa.companyId);
  if (error) return { error };
  return { error: null };
}

/**
 * Recepcion PARCIAL (migracion 059). Cada llamada registra UNA entrega: crea la
 * `Purchase` de esa factura, guarda la cabecera y las lineas en
 * `PurchaseOrderReceipt` / `PurchaseOrderReceiptItem`, acumula
 * `PurchaseOrderItem.quantity_received` y recalcula el estado de la orden
 * (`PARTIALLY_RECEIVED` mientras falte algo, `RECEIVED` cuando cada linea esta
 * completa).
 *
 * Compatibilidad con el flujo de 052:
 *  - Si el cuerpo NO trae `items`, se recibe lo que falte de cada linea (el
 *    "recibir la orden entera" de antes).
 *  - Una orden a nivel de cabecera (sin lineas) se sigue pudiendo recibir con
 *    los totales de la cabecera.
 *
 * A diferencia del flujo anterior, la validacion va ANTES de crear la compra y
 * NO se reserva el estado: si algo no cuadra, no se escribe nada; si
 * `createPurchase` falla, la orden queda intacta (no hay nada que revertir).
 */
export async function recibirPurchaseOrder(supabase: SupabaseClient, empresa: EmpresaCompra, body: any) {
  const id = String(body?.id || '');
  if (!id) throw new ErrorDeEmpresa(400, 'Order ID is required');

  const { data: order, error: orderError } = await supabase
    .from('PurchaseOrder')
    .select('*')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (orderError) return { data: null, error: orderError };
  if (!order) return { data: null, error: null, notFound: true as const };

  if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(String(order.status))) {
    throw new ErrorDeEmpresa(
      409,
      'Solo se puede recibir una orden aprobada o parcialmente recibida (estado actual: ' + order.status + ').'
    );
  }

  const invoiceNumber = String(body.invoice_number || '').trim();
  if (!invoiceNumber) {
    throw new ErrorDeEmpresa(400, 'El número de factura es obligatorio.');
  }

  let items: any[] = Array.isArray(order.PurchaseOrderItem) ? order.PurchaseOrderItem : order.items || [];
  if (items.length === 0) {
    const { data } = await supabase
      .from('PurchaseOrderItem')
      .select('*')
      .eq('purchase_order_id', order.id);
    items = data || [];
  }

  const now = new Date().toISOString();
  const tasa = Number.isFinite(Number(body.tax_rate)) ? Number(body.tax_rate) : 15;
  const purchaseType = body.purchase_type || 'merchandise';
  const lineasCuerpo = Array.isArray(body.items) ? body.items : [];

  const porId = new Map(items.map((it: any) => [String(it.id), it]));
  const recibidoPrevio = new Map(items.map((it: any) => [String(it.id), Number(it.quantity_received) || 0]));

  // Que se recibe en ESTA entrega.
  let aRecibir: Array<{ item: any; cantidad: number }> = [];

  if (items.length > 0) {
    if (lineasCuerpo.length > 0) {
      for (const linea of lineasCuerpo) {
        const cantidad = Number(linea.quantity_received ?? linea.quantity ?? linea.quantity_requested) || 0;
        if (cantidad <= 0) continue;

        let item = linea.purchase_order_item_id ? porId.get(String(linea.purchase_order_item_id)) : undefined;
        if (!item && linea.product_id) {
          item = items.find((it: any) => String(it.product_id || '') === String(linea.product_id));
        }
        if (!item && (linea.product_name || linea.description)) {
          item = items.find(
            (it: any) => String(it.product_name || '') === String(linea.product_name || linea.description)
          );
        }
        if (!item) {
          throw new ErrorDeEmpresa(400, 'Una línea de la recepción no corresponde a ningún artículo de la orden.');
        }
        aRecibir.push({ item, cantidad });
      }
    } else {
      aRecibir = items
        .map((it: any) => ({
          item: it,
          cantidad: Math.max(0, (Number(it.quantity_requested) || 0) - (Number(it.quantity_received) || 0)),
        }))
        .filter((x: any) => x.cantidad > 0);
    }

    if (aRecibir.length === 0) {
      throw new ErrorDeEmpresa(409, 'No hay cantidades pendientes de recibir en esta orden.');
    }
  }

  const productosValidos = await idsDeEstaEmpresa(
    supabase,
    empresa,
    'product',
    aRecibir.map((x: any) => x.item.product_id)
  );

  // Importes de ESTA entrega (no de la orden entera). Sin lineas, los de la cabecera.
  let purchaseItems: any[] = [];
  let subtotal: number;
  let taxAmount: number;
  let total: number;

  if (items.length === 0) {
    subtotal = Math.round(Number(order.subtotal) || 0);
    taxAmount = Math.round(Number(order.tax_amount) || 0);
    total = Math.round(Number(order.total) || 0);
    if (total <= 0) total = subtotal + taxAmount;
  } else {
    purchaseItems = aRecibir.map(({ item, cantidad }) => {
      const precio = Number(item.unit_price) || 0;
      const subtotalLinea = Math.round(cantidad * precio);
      const ivaLinea = Math.round((subtotalLinea * tasa) / 100);
      return {
        product_id: idValidoDe(productosValidos, item.product_id),
        product_code: item.product_code || null,
        product_name: item.product_name || item.description || '',
        quantity: cantidad,
        unit_price: precio,
        discount_percentage: 0,
        discount_amount: 0,
        subtotal: subtotalLinea,
        tax_rate: tasa,
        tax_amount: ivaLinea,
        total: subtotalLinea + ivaLinea,
        invoice_number: invoiceNumber,
      };
    });
    subtotal = purchaseItems.reduce((s, i) => s + i.subtotal, 0);
    taxAmount = purchaseItems.reduce((s, i) => s + i.tax_amount, 0);
    total = purchaseItems.reduce((s, i) => s + i.total, 0);
  }

  const purchaseBody = {
    supplier_id: order.supplier_id,
    invoice_number: invoiceNumber,
    cai: body.cai || null,
    invoice_date: body.invoice_date || now.split('T')[0],
    subtotal,
    tax_rate: tasa,
    tax_amount: taxAmount,
    total,
    purchase_type: purchaseType,
    expense_category: body.expense_category || null,
    document_url: body.document_url || null,
    is_credit: !!body.is_credit,
    due_date: body.is_credit ? body.due_date || null : null,
    items: purchaseItems,
  };

  // 1) La compra real de esta entrega (items, stock, historial y asiento).
  let r;
  try {
    r = await createPurchase(supabase, empresa, purchaseBody);
  } catch (error) {
    throw error instanceof ErrorDeEmpresa
      ? error
      : new ErrorDeEmpresa(500, 'No se pudo registrar la compra de esta orden.');
  }
  if (r.error) return { data: null, error: r.error };

  // 2) Cabecera de la recepcion.
  const { data: receipt, error: receiptError } = await supabase
    .from('PurchaseOrderReceipt')
    .insert({
      purchase_order_id: order.id,
      company_id: empresa.companyId,
      tenant_id: empresa.tenantId,
      invoice_number: invoiceNumber,
      invoice_date: body.invoice_date || now.split('T')[0],
      cai: body.cai || null,
      purchase_id: r.data?.id || null,
      received_at: now,
      received_by: body.received_by || null,
      notes: body.notes || null,
      created_at: now,
    })
    .select()
    .single();
  if (receiptError) {
    console.error('Error creating purchase order receipt:', receiptError);
    return { data: null, error: receiptError };
  }

  // 3) Lineas de la recepcion.
  if (aRecibir.length > 0) {
    const filas = aRecibir.map(({ item, cantidad }) => ({
      receipt_id: receipt.id,
      company_id: empresa.companyId,
      tenant_id: empresa.tenantId,
      purchase_order_item_id: item.id || null,
      product_id: idValidoDe(productosValidos, item.product_id),
      product_name: item.product_name || item.description || '',
      quantity_received: cantidad,
      unit_price: Number(item.unit_price) || 0,
      total: Math.round(cantidad * (Number(item.unit_price) || 0)),
      created_at: now,
    }));
    const { error: filasError } = await supabase.from('PurchaseOrderReceiptItem').insert(filas);
    if (filasError) {
      console.error('Error creating purchase order receipt items:', filasError);
      return { data: null, error: filasError };
    }
  }

  // 4) Acumular lo recibido por linea de la orden.
  for (const { item, cantidad } of aRecibir) {
    const nuevo = (recibidoPrevio.get(String(item.id)) || 0) + cantidad;
    await supabase
      .from('PurchaseOrderItem')
      .update({ quantity_received: nuevo })
      .eq('id', item.id)
      .eq('company_id', empresa.companyId);
  }

  // 5) Estado: RECEIVED cuando cada linea esta completa; si no, PARTIALLY_RECEIVED.
  const completo = items.every((it: any) => {
    const recibido =
      (recibidoPrevio.get(String(it.id)) || 0) +
      aRecibir
        .filter((x) => String(x.item.id) === String(it.id))
        .reduce((s, x) => s + x.cantidad, 0);
    return recibido >= (Number(it.quantity_requested) || 0);
  });

  const { data: enlazada, error: enlaceError } = await supabase
    .from('PurchaseOrder')
    .update({
      status: items.length === 0 || completo ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
      received_at: now,
      received_by: body.received_by || null,
      purchase_id: r.data?.id || order.purchase_id || null,
      updated_at: now,
    })
    .eq('id', order.id)
    .eq('company_id', empresa.companyId)
    .select()
    .single();

  if (enlaceError) {
    console.error('Error linking purchase order to receipt:', enlaceError);
    return { data: null, error: enlaceError };
  }

  return { data: { order: transformOrder(enlazada), purchase: r.data, receipt }, error: null };
}

/**
 * Recepciones de una orden con sus lineas. SIN embeds (mismo motivo que
 * `hidratarOrdenes`: la base puede no declarar la relacion y PostgREST devuelve
 * `PGRST200`, que tumba la consulta). Se piden las cabeceras por orden y las
 * lineas por `receipt_id`.
 */
export async function fetchPurchaseOrderReceipts(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  orderId: string
) {
  const { data: cabeceras, error } = await supabase
    .from('PurchaseOrderReceipt')
    .select('*')
    .eq('purchase_order_id', orderId)
    .eq('company_id', empresa.companyId)
    .order('received_at');

  if (error) return { data: null, error };

  const ids = (cabeceras || []).map((r: any) => r.id).filter(Boolean);
  const itemsPorRecibo = new Map<string, any[]>();
  if (ids.length > 0) {
    const { data: lineas } = await supabase
      .from('PurchaseOrderReceiptItem')
      .select('*')
      .in('receipt_id', ids)
      .eq('company_id', empresa.companyId);
    for (const l of lineas || []) {
      const k = String(l.receipt_id);
      if (!itemsPorRecibo.has(k)) itemsPorRecibo.set(k, []);
      itemsPorRecibo.get(k)!.push(l);
    }
  }

  return {
    data: (cabeceras || []).map((c: any) => ({ ...c, items: itemsPorRecibo.get(String(c.id)) || [] })),
    error: null,
  };
}

export interface ConciliacionLinea {
  product_id: string | null;
  product_name: string;
  ordered_qty: number;
  ordered_unit_price: number;
  received_qty: number;
  invoiced_qty: number;
  invoiced_unit_price: number;
  qty_variance: number;
  invoice_variance: number;
  price_variance: number;
  estado: 'OK' | 'SIN_RECIBIR' | 'PARCIAL' | 'EXCESO' | 'FALTANTE_FACTURA' | 'DIF_PRECIO';
}

function claveProducto(f: any): string {
  return String(f.product_id || f.product_name || f.description || '').toLowerCase();
}

function acumularPorProducto(filas: any[]): Map<string, { qty: number; precio: number | null }> {
  const m = new Map<string, { qty: number; precio: number | null }>();
  for (const f of filas) {
    const k = claveProducto(f);
    if (!k) continue;
    const prev = m.get(k) || { qty: 0, precio: null };
    prev.qty += Number(f.quantity_received ?? f.quantity) || 0;
    if (prev.precio === null) prev.precio = Number(f.unit_price) || 0;
    m.set(k, prev);
  }
  return m;
}

/**
 * Conciliacion 3 vias de UNA orden: ordenado (O.C.) vs recibido (recepciones)
 * vs facturado (las `Purchase` creadas por las recepciones). Solo lectura: no
 * bloquea nada. `tolerancia` compara cantidades y `toleranciaPrecio` precios;
 * con 0 toda diferencia cuenta.
 */
export async function conciliarOrden(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  orderId: string,
  opciones: { tolerancia?: number; toleranciaPrecio?: number } = {}
) {
  const tolerancia = Number.isFinite(Number(opciones.tolerancia)) ? Number(opciones.tolerancia) : 0;
  const toleranciaPrecio = Number.isFinite(Number(opciones.toleranciaPrecio)) ? Number(opciones.toleranciaPrecio) : 0.01;

  const { data: order, error: orderError } = await supabase
    .from('PurchaseOrder')
    .select('*')
    .eq('id', orderId)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (orderError) return { data: null, error: orderError };
  if (!order) return { data: null, error: null, notFound: true as const };

  const { data: itemsOrden } = await supabase
    .from('PurchaseOrderItem')
    .select('*')
    .eq('purchase_order_id', order.id)
    .eq('company_id', empresa.companyId);

  const { data: receipts } = await fetchPurchaseOrderReceipts(supabase, empresa, order.id);
  const filasRecepcion: any[] = [];
  for (const rec of receipts || []) for (const l of rec.items || []) filasRecepcion.push(l);

  const purchaseIds = Array.from(
    new Set((receipts || []).map((r: any) => r.purchase_id).filter((x): x is string => !!x))
  );
  let filasFactura: any[] = [];
  if (purchaseIds.length > 0) {
    const { data } = await supabase
      .from('PurchaseItem')
      .select('*')
      .in('purchase_id', purchaseIds)
      .eq('company_id', empresa.companyId);
    filasFactura = data || [];
  }

  const recibidoPorProducto = acumularPorProducto(filasRecepcion);
  const facturadoPorProducto = acumularPorProducto(filasFactura);

  const lines: ConciliacionLinea[] = (itemsOrden || []).map((it: any) => {
    const k = claveProducto(it);
    const rec = recibidoPorProducto.get(k) || { qty: 0, precio: null };
    const fac = facturadoPorProducto.get(k) || { qty: 0, precio: null };

    const orderedQty = Number(it.quantity_requested) || 0;
    const orderedPrice = Number(it.unit_price) || 0;
    const receivedQty = rec.qty;
    const invoicedQty = fac.qty;
    const invoicedPrice = fac.precio ?? orderedPrice;

    let estado: ConciliacionLinea['estado'] = 'OK';
    if (orderedQty > 0 && receivedQty <= tolerancia) estado = 'SIN_RECIBIR';
    else if (receivedQty > orderedQty + tolerancia) estado = 'EXCESO';
    else if (receivedQty < orderedQty - tolerancia) estado = 'PARCIAL';
    else if (invoicedQty < receivedQty - tolerancia) estado = 'FALTANTE_FACTURA';
    else if (Math.abs(invoicedPrice - orderedPrice) > toleranciaPrecio) estado = 'DIF_PRECIO';

    return {
      product_id: it.product_id || null,
      product_name: it.product_name || it.description || '',
      ordered_qty: orderedQty,
      ordered_unit_price: orderedPrice,
      received_qty: receivedQty,
      invoiced_qty: invoicedQty,
      invoiced_unit_price: invoicedPrice,
      qty_variance: orderedQty - receivedQty,
      invoice_variance: receivedQty - invoicedQty,
      price_variance: orderedPrice - invoicedPrice,
      estado,
    };
  });

  const totals = {
    ordered: lines.reduce((s, l) => s + l.ordered_qty * l.ordered_unit_price, 0),
    received: lines.reduce((s, l) => s + l.received_qty * l.ordered_unit_price, 0),
    invoiced: lines.reduce((s, l) => s + l.invoiced_qty * l.invoiced_unit_price, 0),
  };

  return {
    data: {
      order: transformOrder(order),
      lines,
      receipts: receipts || [],
      totals,
      hayDiscrepancias: lines.some((l) => l.estado !== 'OK'),
    },
    error: null,
  };
}
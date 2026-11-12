import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * La empresa, YA VALIDADA por `contextoDeEmpresa`. Es la MISMA forma que devuelve
 * `contextoDeEmpresa`, y a proposito: quien llama ya ha comprobado que esta
 * empresa es del usuario, asi que aqui no hay nada que adivinar.
 *
 * Antes este modulo exportaba `TENANT_ID = '1'` y lo usaba en TODAS las consultas
 * y en todos los inserts. Consequences medidas el 2 Oct 2026:
 *
 * - `fetchPurchases` filtraba solo `.eq('tenant_id','1')` y **no filtraba por
 *   empresa**: las 2 compras de Empresa 1 salian a cualquier usuario que abriera
 *   `/companies/<su empresa>/purchases`, y al crear una compra la fila quedaba
 *   con `tenant_id='1'` y el `company_id` que mandara el cliente **sin validar**.
 * - Empresa 1 (`73d5bbf7-...`, tenant `'1'`) tiene dueno (Sully Calix,
 *   `owner`): no era "nadie puede entrar", era "todo el mundo ve sus datos".
 * - Los productos creados desde una compra se buscaban con
 *   `.eq('tenant_id', companyId)` — un `companies.id` en una columna de codigo de
 *   tenant, o sea **0 filas siempre**: cada linea de compra creaba un producto
 *   duplicado en vez de sumar stock, y el producto nuevo quedaba con un UUID en
 *   `tenant_id` y sin `company_id` (invisible para todo filtro por empresa).
 * - `createPurchaseJournalEntry` resolvia las cuentas con
 *   `.eq('code','1101').eq('tenant_id', tenantId)`: con test 1 y test 2
 *   compartiendo `TEST1DS` eso puede dar dos filas, y el asiento de una empresa
 *   puede acabar contra la cuenta de la hermana.
 */
export type EmpresaCompra = { tenantId: string; companyId: string };

export interface PurchaseFilters {
  /** Obsoleto: la empresa viene en `empresa`. Se mantiene para no romper callers. */
  companyId?: string | null;
  supplierId?: string | null;
  search?: string | null;
}

/**
 * `contextoDeEmpresa` devuelve `companyId: string | null`: cuando no puede
 * resolver la empresa (peticiones sin sesion de Clerk, p.ej. scripts) se
 * degrada a tenant suelto. Aqui eso NO es aceptable, porque sin `company_id` no
 * hay aislamiento: `TEST1DS` tiene dos empresas y volverian a verse entre si.
 *
 * Por eso Compras/Proveedores exige empresa real y responde **400** en vez de
 * caer a un filtro por tenant.
 */
export function exigirEmpresa(contexto: { tenantId: string | null; companyId: string | null }): EmpresaCompra {
  if (!contexto.companyId) {
    throw new ErrorDeEmpresa(
      400,
      'No se pudo determinar la empresa activa. Recarga la pagina o selecciona una empresa.'
    );
  }
  if (!contexto.tenantId) {
    throw new ErrorDeEmpresa(400, 'No se pudo determinar el tenant de la empresa activa.');
  }
  return { tenantId: contexto.tenantId, companyId: contexto.companyId };
}

/**
 * Un `supplier_id` o `product_id` del cuerpo es una **referencia a otra
 * empresa**, no un dato: si no se comprueba, la compra se guarda apuntando al
 * proveedor de la hermana y al releerla el embed `Supplier:supplier_id(...)`
 * devuelve su nombre, RTN, telefono y correo. Poner `company_id` en la fila es
 * correcto y aun asi no alcanza: la fila es de esta empresa, el proveedor no.
 *
 * Por eso se valida **antes** de escribir. Se descarta en silencio lo que no
 * venga de la empresa en vez de dar 400: un proveedor que el cliente aun no ha
 * guardado no es un error suyo, y el filtro de UI ya solo ofrece los propios.
 */
async function exigirPertenencia(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  tabla: string,
  ids: Array<string | null | undefined>
): Promise<Set<string>> {
  const propios = new Set<string>();
  const unicos = Array.from(new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0)));
  if (unicos.length === 0) return propios;

  const { data } = await supabase
    .from(tabla)
    .select('id')
    .eq('company_id', empresa.companyId)
    .in('id', unicos);

  for (const fila of data || []) propios.add(String(fila.id));
  return propios;
}

/**
 * Devuelve el subconjunto de `ids` que SI pertenece a la empresa, para que la
 * ruta pueda descartar lo demas en vez de abortar. Publica porque
 * `/api/suppliers/price-history` tiene la misma referencia cruzada sin
 * comprobar y no debe duplicar la consulta.
 */
export async function idsDeEstaEmpresa(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  tabla: string,
  ids: Array<string | null | undefined>
): Promise<Set<string>> {
  return exigirPertenencia(supabase, empresa, tabla, ids);
}

/** `id` si es de esta empresa, `null` si no. Para columnas de FK opcionales. */
export function idValidoDe(propios: Set<string>, id: unknown): string | null {
  if (typeof id !== 'string' || !id) return null;
  return propios.has(id) ? id : null;
}

/** Igual que `exigirPertenencia`, pero aborta si algun id no es de la empresa. */
async function exigirPertenenciaEstricta(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  tabla: string,
  campo: string,
  ids: Array<string | null | undefined>
): Promise<Set<string>> {
  const unicos = Array.from(new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0)));
  const propios = await exigirPertenencia(supabase, empresa, tabla, unicos);

  const ajenos = unicos.filter((id) => !propios.has(id));
  if (ajenos.length > 0) {
    throw new ErrorDeEmpresa(
      400,
      `El ${campo} no pertenece a la empresa activa (${ajenos.length} referencia(s) rechazada(s)).`
    );
  }
  return propios;
}

export function transformPurchase(p: any): any {
  const supplier = Array.isArray(p.Supplier) ? p.Supplier[0] : p.Supplier;
  const rows = Array.isArray(p.items) ? p.items : Array.isArray(p.PurchaseItem) ? p.PurchaseItem : [];
  const items = rows.map((i: any) => ({ ...i }));

  const total = Number(p.total) || 0;
  const amountPaid = p.amount_paid === null || p.amount_paid === undefined ? 0 : Number(p.amount_paid);
  const balanceDue = p.balance_due === null || p.balance_due === undefined ? total - amountPaid : Number(p.balance_due);

  let status = p.status || '';
  if (status === 'completed' || status === 'paid') status = 'PAID';
  else if (status === 'partial') status = 'PARTIAL';
  else if (status === 'pending') status = 'PENDING';

  if (!['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'].includes(status)) {
    status = balanceDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
  }

  const { Supplier, PurchaseItem, ...rest } = p;

  return {
    ...rest,
    status,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    supplier,
    supplier_id: supplier?.id || p.supplier_id,
    supplier_name: supplier?.name || p.supplier_name || '',
    items,
    companyId: p.company_id,
  };
}

export async function fetchPurchases(supabase: SupabaseClient, empresa: EmpresaCompra, filters: PurchaseFilters) {
  let query = supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('company_id', empresa.companyId)
    .order('invoice_date', { ascending: false });

  if (filters.supplierId) {
    query = query.eq('supplier_id', filters.supplierId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  let rows = (data || []).map(transformPurchase);

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter(
      (p: any) =>
        String(p.invoice_number || '').toLowerCase().includes(term) ||
        String(p.supplier_name || '').toLowerCase().includes(term)
    );
  }

  return { data: rows, error: null };
}

export async function createPurchase(supabase: SupabaseClient, empresa: EmpresaCompra, body: any) {
  const tenantId = empresa.tenantId;
  // La empresa NO sale del cuerpo: la decide el servidor y ya esta validada.
  const companyId = empresa.companyId;
  const isCredit = !!body.is_credit;
  const total = Math.round(Number(body.total) || 0);

  const items = Array.isArray(body.items) ? body.items : [];

  // El proveedor del cuerpo y el de cada linea tienen que ser de ESTA empresa.
  // Ver `exigirPertenencia`: sin esto la compra se guardaba apuntando al
  // proveedor de la hermana y el embed lo devolvia con nombre y RTN.
  const proveedoresValidos = await exigirPertenenciaEstricta(
    supabase,
    empresa,
    'Supplier',
    'proveedor',
    [body.supplier_id, ...items.map((i: any) => i.supplier_id)]
  );
  // Un producto ajeno no se rechaza (un item puede traer solo el codigo), pero
  // si se manda su `product_id` y es de otra empresa, se suelta: seguir el
  // `product_id` meteria una fila de otra empresa en el historico de precios.
  const productosValidos = await exigirPertenencia(
    supabase,
    empresa,
    'product',
    items.map((i: any) => i.product_id)
  );
  const productIdDe = (item: any): string | null => idValidoDe(productosValidos, item.product_id);

  const { data: purchase, error: purchaseError } = await supabase
    .from('Purchase')
    .insert({
      supplier_id:
        body.supplier_id && proveedoresValidos.has(String(body.supplier_id)) ? body.supplier_id : null,
      invoice_number: body.invoice_number,
      cai: body.cai || null,
      invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
      subtotal: Math.round(Number(body.subtotal) || 0),
      tax_rate: body.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(body.tax_amount) || 0),
      total,
      purchase_type: body.purchase_type || 'expense',
      expense_category: body.expense_category || null,
      document_url: body.document_url || null,
      is_credit: isCredit,
      due_date: isCredit ? body.due_date || null : null,
      status: isCredit ? 'PENDING' : 'PAID',
      amount_paid: isCredit ? 0 : total,
      balance_due: isCredit ? total : 0,
      tenant_id: tenantId,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (purchaseError) return { data: null, error: purchaseError };

  if (items.length > 0) {
    const purchaseItems = items.map((item: any) => ({
      purchase_id: purchase.id,
      product_id: productIdDe(item),
      product_code: item.product_code || null,
      product_name: item.product_name || item.description || '',
      description: item.description || null,
      quantity: Number(item.quantity) || 0,
      unit_price: Math.round(Number(item.unit_price) || 0),
      discount_percentage: Number(item.discount_percentage) || 0,
      discount_amount: Math.round(Number(item.discount_amount) || 0),
      subtotal: Math.round(Number(item.subtotal) || 0),
      tax_rate: item.tax_rate ?? body.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(item.tax_amount) || 0),
      total: Math.round(Number(item.total) || 0),
      tenant_id: tenantId,
      company_id: companyId,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase.from('PurchaseItem').insert(purchaseItems);
    if (itemsError) {
      console.error('Error creating purchase items:', itemsError);
    }
  }

  // Create/update products in Supabase product table
  if (items.length > 0) {
    for (const item of items) {
      const productName = item.product_name || item.description || '';
      if (!productName) continue;

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Math.round(Number(item.unit_price) || 0);

      const { data: existing } = await supabase
        .from('product')
        .select('id, current_stock')
        .eq('company_id', companyId)
        .ilike('name', productName)
        .limit(1);

      if (existing && existing.length > 0) {
        const row = existing[0];
        const newStock = (Number(row.current_stock) || 0) + quantity;
        await supabase
          .from('product')
          .update({
            current_stock: newStock,
            stock_quantity: newStock,
            unit_price: unitPrice || undefined,
            current_cost: unitPrice,
          })
          .eq('id', row.id)
          .eq('company_id', companyId);
      } else {
        const productCode = 'PRD-' + Date.now().toString(36).toUpperCase().slice(-4);
        await supabase
          .from('product')
          .insert({
            tenant_id: tenantId,
            company_id: companyId,
            code: productCode,
            name: productName,
            description: item.description || '',
            category: body.purchase_type === 'expense' ? 'Servicios' : 'Insumos',
            unit: item.unit || 'Unidad',
            unit_price: unitPrice,
            current_cost: unitPrice,
            current_stock: quantity,
            stock_quantity: quantity,
            min_stock: 0,
            max_stock: 0,
            tax_rate: 15,
            is_active: true,
            is_service: body.purchase_type === 'expense',
            product_type: body.purchase_type === 'expense' ? 'service' : 'product',
            valuation_method: 'weighted_average',
          });
      }
    }
  }

  // Track supplier price history (best-effort, never blocks the purchase)
  if (purchase.supplier_id && items.length > 0) {
    await recordSupplierPriceHistory(supabase, empresa, purchase.supplier_id, items, purchase.invoice_date);
  }

  // Journal entry (best-effort, never blocks the purchase)
  const journalEntryResult = await createPurchaseJournalEntry(supabase, empresa, purchase, items);
  if (journalEntryResult) {
    await supabase.from('Purchase').update({ journal_entry_id: journalEntryResult.id }).eq('id', purchase.id);
  }

  return { data: transformPurchase({ ...purchase, items, journal_entry_id: journalEntryResult?.id }), error: null };
}

export async function recordSupplierPriceHistory(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  supplierId: string,
  items: any[],
  invoiceDate?: string
) {
  const effectiveDate = invoiceDate ? new Date(invoiceDate + 'T00:00:00').toISOString() : new Date().toISOString();

  const rows = items
    .filter((item: any) => item.product_id || item.product_name || item.description)
    .map((item: any) => ({
      tenant_id: empresa.tenantId,
      company_id: empresa.companyId,
      supplier_id: supplierId,
      product_id: item.product_id || null,
      price: Math.round(Number(item.unit_price) || 0),
      currency: 'HNL',
      effective_date: effectiveDate,
      notes: `Registrado en compra - ${item.product_name || item.description || 'Producto'}${item.invoice_number ? ` (Factura ${item.invoice_number})` : ''}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('supplier_price_history').insert(rows);
  if (error) {
    console.error('Error recording supplier price history:', error);
  }
}

export async function updatePurchase(supabase: SupabaseClient, empresa: EmpresaCompra, id: string, body: any) {
  // Antes se hacía `.eq('id', id)` a secas: cualquier usuario autenticado que
  // supiera el UUID de una compra ajena la podia editar y reescribir sus lineas.
  const { data: actual, error: actualError } = await supabase
    .from('Purchase')
    .select('id')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (actualError) return { data: null, error: actualError };
  if (!actual) return { data: null, error: null, notFound: true as const };

  const itemsNuevos = Array.isArray(body.items) ? body.items : [];

  // Misma comprobacion que en `createPurchase`, y por el mismo motivo: un
  // `supplier_id` o `product_id` de otra empresa en el cuerpo convertia esta
  // compra en un puente hacia sus datos. Se valida ANTES del UPDATE, porque
  // despues de escribir el error dejaria la fila a medias.
  // Estricta a proposito: que el proveedor venga de la hermana es un error de
  // quien llama, no un dato que se pueda descartar en silencio. En `create` el
  // unico caso de "sin proveedor" es que el cliente aun no lo ha guardado.
  await exigirPertenenciaEstricta(
    supabase,
    empresa,
    'Supplier',
    'proveedor',
    [body.supplier_id, ...itemsNuevos.map((i: any) => i.supplier_id)]
  );
  const productosValidos = await exigirPertenencia(
    supabase,
    empresa,
    'product',
    itemsNuevos.map((i: any) => i.product_id)
  );
  const productIdDe = (item: any): string | null => idValidoDe(productosValidos, item.product_id);

  const updates: any = {};
  const scalarFields = [
    'supplier_id', 'invoice_number', 'cai', 'invoice_date', 'subtotal', 'tax_rate', 'tax_amount', 'total',
    'purchase_type', 'expense_category', 'document_url', 'is_credit', 'due_date',
  ];
  for (const field of scalarFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const isCredit = body.is_credit !== undefined ? !!body.is_credit : undefined;
  const total = updates.total !== undefined ? Math.round(Number(updates.total)) : undefined;

  if (updates.subtotal !== undefined) updates.subtotal = Math.round(Number(updates.subtotal));
  if (updates.tax_amount !== undefined) updates.tax_amount = Math.round(Number(updates.tax_amount));
  if (updates.is_credit !== undefined) updates.is_credit = isCredit;
  if (isCredit && !updates.due_date) updates.due_date = null;

  // Preserve company/tenant
  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('Purchase')
    .update(updates)
    .eq('id', id)
    .eq('company_id', empresa.companyId);
  if (updateError) return { data: null, error: updateError };

  // Replace items
  if (Array.isArray(body.items)) {
    await supabase
      .from('PurchaseItem')
      .delete()
      .eq('purchase_id', id)
      .eq('company_id', empresa.companyId);

    const purchaseItems = itemsNuevos.map((item: any) => ({
      purchase_id: id,
      product_id: productIdDe(item),
      product_code: item.product_code || null,
      product_name: item.product_name || item.description || '',
      description: item.description || null,
      quantity: Number(item.quantity) || 0,
      unit_price: Math.round(Number(item.unit_price) || 0),
      discount_percentage: Number(item.discount_percentage) || 0,
      discount_amount: Math.round(Number(item.discount_amount) || 0),
      subtotal: Math.round(Number(item.subtotal) || 0),
      tax_rate: item.tax_rate ?? updates.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(item.tax_amount) || 0),
      total: Math.round(Number(item.total) || 0),
      tenant_id: empresa.tenantId,
      company_id: empresa.companyId,
      created_at: new Date().toISOString(),
    }));

    if (purchaseItems.length > 0) {
      await supabase.from('PurchaseItem').insert(purchaseItems);
    }
  }

  // Recompute payment state
  await recomputePurchase(supabase, empresa, id, { isCredit, total });

  const { data, error } = await supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .single();

  if (error) return { data: null, error };

  return { data: transformPurchase(data), error: null };
}

export async function deletePurchase(supabase: SupabaseClient, empresa: EmpresaCompra, id: string) {
  // Mismo IDOR que en `updatePurchase`: sin filtro de empresa, el `id` de otra
  // empresa bastaba para borrar su compra y sus lineas y sus pagos.
  const { data: actual } = await supabase
    .from('Purchase')
    .select('id')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (!actual) return { error: null, notFound: true as const };

  await supabase
    .from('PurchaseItem')
    .delete()
    .eq('purchase_id', id)
    .eq('company_id', empresa.companyId);
  await supabase
    .from('SupplierPayment')
    .delete()
    .eq('purchase_id', id)
    .eq('company_id', empresa.companyId);
  const { error } = await supabase
    .from('Purchase')
    .delete()
    .eq('id', id)
    .eq('company_id', empresa.companyId);
  if (error) return { error };
  return { error: null };
}

export async function recomputePurchase(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  purchaseId: string,
  overrides?: { isCredit?: boolean; total?: number }
) {
  const { data: payments } = await supabase
    .from('SupplierPayment')
    .select('amount')
    .eq('purchase_id', purchaseId)
    .eq('company_id', empresa.companyId);

  const paymentsRows = payments || [];
  const hasPayments = paymentsRows.length > 0;
  const { data: purchase } = await supabase
    .from('Purchase')
    .select('total, is_credit, amount_paid')
    .eq('id', purchaseId)
    .eq('company_id', empresa.companyId)
    .single();
  if (!purchase) return null;

  const paid = hasPayments
    ? paymentsRows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(purchase.amount_paid) || 0;

  const total = overrides?.total ?? (Number(purchase.total) || 0);
  const isCredit = overrides?.isCredit ?? !!purchase.is_credit;
  const balance = Math.max(total - paid, 0);

  let status: string;
  if (balance <= 0) {
    status = 'PAID';
  } else if (paid > 0) {
    status = 'PARTIAL';
  } else if (isCredit) {
    status = 'PENDING';
  } else {
    status = 'PARTIAL';
  }

  await supabase
    .from('Purchase')
    .update({
      amount_paid: paid,
      balance_due: balance,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('company_id', empresa.companyId);

  const { data: updated } = await supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('id', purchaseId)
    .eq('company_id', empresa.companyId)
    .single();

  return updated ? transformPurchase(updated) : null;
}

async function createPurchaseJournalEntry(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  purchase: any,
  items: any[]
) {
  try {
    let debitAccountId: string | undefined;
    const tenantId = empresa.tenantId;
    const companyId = empresa.companyId;

    // `Account` se resuelve por `company_id`, no por `tenant_id`: test 1 y test 2
    // comparten `TEST1DS`, así que `.eq('code','1101').eq('tenant_id','TEST1DS')`
    // puede devolver dos cuentas y el asiento de una empresa acabaría contra la
    // de la hermana. Además se pedía `.single()`, que con dos filas revienta
    // (PGRST116) y dejaba la compra sin contabilizar.
    const cuenta = async (code: string): Promise<string | undefined> => {
      const { data } = await supabase
        .from('Account')
        .select('id')
        .eq('code', code)
        .eq('company_id', companyId)
        .limit(1);
      return data?.[0]?.id;
    };

    if (purchase.purchase_type === 'merchandise') {
      debitAccountId = await cuenta('1105');
    } else if (purchase.expense_category === 'administrative') {
      debitAccountId = await cuenta('4101');
    } else {
      debitAccountId = await cuenta('4100');
    }

    const isvAccountId = await cuenta('1110');

    let creditAccountId: string | undefined;
    if (purchase.is_credit) {
      creditAccountId = await cuenta('2101');
    } else {
      creditAccountId = await cuenta('1101');
    }

    if (!debitAccountId || !creditAccountId) {
      console.error('Missing accounts for journal entry');
      return null;
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from('JournalEntry')
      .insert({
        date: purchase.invoice_date,
        reference: `COMP-${purchase.invoice_number}`,
        description: `Compra ${purchase.is_credit ? 'a crédito' : 'al contado'} - Factura ${purchase.invoice_number}`,
        is_posted: true,
        total_debit: purchase.total,
        total_credit: purchase.total,
        tenant_id: tenantId,
        company_id: companyId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jeError) {
      console.error('Error creating journal entry:', jeError);
      return null;
    }

    const lines: any[] = [];
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: debitAccountId,
      description: `Compra ${purchase.purchase_type === 'merchandise' ? 'de mercadería' : 'de gasto'}`,
      debit_amount: purchase.subtotal,
      credit_amount: 0,
      tenant_id: tenantId,
    });

    if (Number(purchase.tax_amount) > 0 && isvAccountId) {
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: isvAccountId,
        description: 'ISV Crédito Fiscal',
        debit_amount: purchase.tax_amount,
        credit_amount: 0,
        tenant_id: tenantId,
      });
    }

    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: creditAccountId,
      description: purchase.is_credit ? 'Cuentas por Pagar' : 'Banco',
      debit_amount: 0,
      credit_amount: purchase.total,
      tenant_id: tenantId,
    });

    const { error: linesError } = await supabase.from('JournalEntryLine').insert(lines);
    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
    }

    return journalEntry;
  } catch (error) {
    console.error('Error in createPurchaseJournalEntry:', error);
    return null;
  }
}
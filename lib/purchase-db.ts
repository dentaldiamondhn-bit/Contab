import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorDeEmpresa } from '@/lib/tenant-resolver';
import {
  createJournalTransaction,
  type SupaClient,
  type JournalEntryInput,
} from '@/lib/services/journal-service';
import {
  normalizarTipoRetencion,
  tasaDeRetencion,
  calcularRetencion,
} from '@/lib/supplier-withholding';
import { exigirFactor, factorValido, precioNeto, unidadesBase } from '@/lib/services/measure-calc';
import { medidasDeProductosCon, reemplazarMedidasCon } from '@/lib/services/product-measures';

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
  const withholdingAmount =
    p.withholding_amount === null || p.withholding_amount === undefined ? 0 : Number(p.withholding_amount);
  // La retencion reduce lo que se le debe al proveedor: sin `balance_due`
  // guardado, el saldo es `total - retencion - pagado`.
  const balanceDue =
    p.balance_due === null || p.balance_due === undefined
      ? Math.max(total - withholdingAmount - amountPaid, 0)
      : Number(p.balance_due);

  let status = p.status || '';
  if (status === 'completed' || status === 'paid') status = 'PAID';
  else if (status === 'partial') status = 'PARTIAL';
  else if (status === 'pending') status = 'PENDING';

  if (!['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'].includes(status)) {
    status = balanceDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
  }

  const { Supplier, PurchaseItem, ...rest } = p;

  // Compras anteriores al workflow de aprobacion (migracion 061) no traen
  // `approval_status`: se tratan como ya aprobadas, que es lo que eran.
  const approvalStatus =
    typeof p.approval_status === 'string' && p.approval_status.length > 0
      ? p.approval_status
      : 'APPROVED';

  return {
    ...rest,
    status,
    approval_status: approvalStatus,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    withholding_type: normalizarTipoRetencion(p.withholding_type),
    withholding_rate:
      p.withholding_rate === null || p.withholding_rate === undefined ? 0 : Number(p.withholding_rate),
    withholding_amount: withholdingAmount,
    exonerated: !!p.exonerated,
    supplier,
    supplier_id: supplier?.id || p.supplier_id,
    supplier_name: supplier?.name || p.supplier_name || '',
    items,
    companyId: p.company_id,
  };
}

/** Estados posibles de aprobacion de una compra. */
export type EstadoAprobacion = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

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

  // La medida de cada linea se exige ANTES de escribir nada: `exigirFactor` es
  // estricto y un factor invalido a mitad del alta lanzaria despues de insertar
  // la cabecera, dejando la compra creada y sin lineas.
  items.forEach((item: any) => exigirFactor(item.unit_factor ?? 1));

  // Retencion ISR: se calcula sobre el SUBTOTAL (sin ISV) y reduce lo pagado al
  // proveedor. El tipo lo hereda del proveedor (con override del formulario).
  const withholdingType = normalizarTipoRetencion(body.withholding_type);
  const withholdingAmount = calcularRetencion(Math.round(Number(body.subtotal) || 0), withholdingType);
  const withholdingRate = withholdingAmount > 0 ? tasaDeRetencion(withholdingType) : 0;
  // La cabecera queda exonerada si alguna linea lo esta (permite compras mixtas).
  const exonerated = !!body.exonerated || items.some((i: any) => !!i.exonerated);
  // El proveedor solo recibe `total - retencion`; el resto se retiene.
  const netAPagar = Math.max(total - withholdingAmount, 0);

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
      amount_paid: isCredit ? 0 : netAPagar,
      balance_due: isCredit ? netAPagar : 0,
      // Retencion ISR + exoneracion (ver `lib/supplier-withholding.ts`).
      withholding_type: withholdingType === 'NONE' ? null : withholdingType,
      withholding_rate: withholdingRate,
      withholding_amount: withholdingAmount,
      exonerated,
      // Toda compra nace PENDIENTE DE APROBACION: no toca inventario ni
      // contabilidad hasta que un aprobador la apruebe (ver `aprobarCompra`).
      approval_status: 'PENDING_APPROVAL',
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
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
      // La medida de la linea: el factor se exige ESTRICTO, pero el default lo
      // decide aqui `?? 1` (una linea sin empaque es factor 1). Con `Number(x) || 1`
      // un factor invalido como 'abc' pasaria en silencio.
      unit: item.unit || null,
      unit_factor: exigirFactor(item.unit_factor ?? 1),
      exonerated: !!item.exonerated,
      tenant_id: tenantId,
      company_id: companyId,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase.from('PurchaseItem').insert(purchaseItems);
    if (itemsError) {
      console.error('Error creating purchase items:', itemsError);
    }
  }

  // NO se aplican efectos (inventario, historial de precios, asiento) aqui: la
  // compra queda PENDIENTE DE APROBACION y los efectos corren en `aprobarCompra`.
  return { data: transformPurchase({ ...purchase, items }), error: null };
}

/**
 * Efectos reales de una compra aprobada: sube stock del producto (o lo crea),
 * registra el historial de precios del proveedor y crea el asiento contable.
 *
 * **El asiento contable es obligatorio.** El precio sigue siendo best-effort,
 * pero contabilizar no: si falta una cuenta en el catalogo de la empresa, si el
 * asiento no cuadra o si falla el INSERT, se **revierte** el stock y el historial
 * ya aplicados y se propaga `ErrorDeEmpresa(409)`. `aprobarCompra` no llega a
 * marcar la compra APPROVED: nunca queda una compra aprobada sin contabilizar.
 *
 * Recibe la fila `Purchase` ya guardada y sus `PurchaseItem`; usa los campos de
 * la compra (no del cuerpo del cliente) para que aprobar sea determinista.
 */
export async function aplicarEfectosCompra(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  purchase: any,
  items: any[]
) {
  const tenantId = empresa.tenantId;
  const companyId = empresa.companyId;

  // EL ASIENTO CONTABLE ES OBLIGATORIO. Se resuelven las cuentas ANTES de tocar
  // inventario o historial: una configuracion contable incompleta (falta una
  // cuenta en el catalogo) aborta la aprobacion sin haber aplicado nada. Si el
  // asiento falla despues de aplicar stock/historial, se revierte todo (ver
  // `revertirEfectos`) y la compra se queda PENDIENTE. Fail-closed: nunca queda
  // una compra aprobada sin contabilizar.
  const cuentas = await resolverCuentasDeCompra(supabase, empresa, purchase);

  // Cada efecto aplicado registra como deshacerlo, por si el asiento falla.
  const revertir: Array<() => Promise<void>> = [];

  // Los items normalizados (factor e `price_includes_tax` ya resueltos) son los
  // que recibe el historial: nunca consulta la BD, confia en lo que le pasemos.
  let itemsNormalizados: any[] = items;

  // Create/update products in Supabase product table
  if (items.length > 0) {
    // DOS PASADAS. La primera resuelve la medida, lee el producto y calcula TODO
    // lo que puede lanzar (`exigirFactor`, `unidadesBase`) SIN escribir nada. Si
    // la segunda linea tiene una cantidad que no da base entera, la primera no
    // debe haber tocado el stock: `aplicarEfectosCompra` solo revierte cuando
    // falla el asiento, no entre items, asi que un throw a mitad de la iteracion
    // dejaria efectos a medias.
    //
    // El factor y el "incluye ISV" tienen AUTORIDAD DEL MAESTRO (§4.6, §11.1):
    // una sola consulta a `product_measure` (degrada a Map vacio si falta la 074,
    // nunca lanza). Si hay una medida de ese producto cuyo `name` coincide con
    // `item.unit`, mandan su factor y su flag; si no, se usa el `unit_factor` del
    // payload y el `price_includes_tax` del item o del producto existente.
    const idsConProducto = Array.from(
      new Set(
        items
          .map((i) => i.product_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const mapaMedidas = await medidasDeProductosCon(supabase, { tenantId, companyId }, idsConProducto);

    type LineaPlan = {
      item: any;
      productName: string;
      factor: number;
      cantidadBase: number;
      precioMedida: number;
      netoMedida: number;
      costoBase: number;
      incluyeIsv: boolean;
      existing: any | null;
    };

    const plan: LineaPlan[] = [];
    for (const item of items) {
      const productName = item.product_name || item.description || '';
      const medida = buscarMedidaDe(mapaMedidas.get(String(item.product_id ?? '')), item.unit);

      let factor: number;
      let incluyeIsv: boolean | undefined;
      if (medida) {
        factor = exigirFactor(medida.factor);
        incluyeIsv = !!medida.price_includes_tax;
      } else {
        factor = exigirFactor(item.unit_factor ?? 1);
        incluyeIsv = typeof item.price_includes_tax === 'boolean' ? item.price_includes_tax : undefined;
      }

      // El producto existente se lee aqui (solo lectura) porque de el sale el
      // fallback de `price_includes_tax` de la fila base (`product`).
      let existing: any | null = null;
      if (productName) {
        const { data } = await supabase
          .from('product')
          .select('id, current_stock, stock_quantity, unit_price, current_cost, price_includes_tax')
          .eq('company_id', companyId)
          .ilike('name', productName)
          .limit(1);
        existing = (data && data[0]) || null;
      }
      const isv = incluyeIsv === undefined ? !!existing?.price_includes_tax : incluyeIsv;

      const tasa = Number(item.tax_rate) || 0;
      const precioMedida = Number(item.unit_price) || 0;
      const netoMedida = precioNeto(precioMedida, tasa, isv, 2);
      // El redondeo a entero va AL FINAL, despues de dividir entre el factor:
      // redondear el neto antes infla el costo base (12.75 / 12 -> 1.06, no 1.08).
      const costoBase = Math.round(netoMedida / factor);
      // La base solo se exige para lineas que tocan stock (`inventory_movement`
      // es integer y `cantidadBase` debe ser entero > 0); una linea sin nombre no
      // escribe stock y no debe rechazarse por su cantidad.
      const cantidadBase = productName ? unidadesBase(Number(item.quantity) || 0, factor) : 0;

      plan.push({
        item,
        productName,
        factor,
        cantidadBase,
        precioMedida,
        netoMedida,
        costoBase,
        incluyeIsv: isv,
        existing,
      });
    }

    // Segunda pasada: se agrupa por producto para que dos lineas del mismo
    // producto sumen su base (antes se leia el stock ya actualizado entre lineas).
    type Grupo = {
      productName: string;
      existing: any | null;
      cantidadBase: number;
      costoBase: number;
      lineas: LineaPlan[];
    };
    const grupos = new Map<string, Grupo>();
    for (const p of plan) {
      if (!p.productName) continue;
      const clave = p.existing ? `id:${p.existing.id}` : `nuevo:${p.productName.toLowerCase()}`;
      const g = grupos.get(clave);
      if (g) {
        g.cantidadBase += p.cantidadBase;
        g.costoBase = p.costoBase; // el ultimo precio de la compra gana (como hoy)
        g.lineas.push(p);
      } else {
        grupos.set(clave, {
          productName: p.productName,
          existing: p.existing,
          cantidadBase: p.cantidadBase,
          costoBase: p.costoBase,
          lineas: [p],
        });
      }
    }

    for (const g of grupos.values()) {
      if (g.existing) {
        const row = g.existing;
        const antes = {
          current_stock: row.current_stock,
          stock_quantity: row.stock_quantity,
          unit_price: row.unit_price,
          current_cost: row.current_cost,
        };
        const newStock = (Number(row.current_stock) || 0) + g.cantidadBase;
        await supabase
          .from('product')
          .update({
            current_stock: newStock,
            stock_quantity: newStock,
            unit_price: g.costoBase || undefined,
            current_cost: g.costoBase,
          })
          .eq('id', row.id)
          .eq('company_id', companyId);
        revertir.push(async () => {
          await supabase.from('product').update(antes).eq('id', row.id).eq('company_id', companyId);
        });
      } else {
        const productCode = 'PRD-' + Date.now().toString(36).toUpperCase().slice(-4);
        const { data: creado } = await supabase
          .from('product')
          .insert({
            tenant_id: tenantId,
            company_id: companyId,
            code: productCode,
            name: g.productName,
            description: g.lineas[0].item.description || '',
            category: purchase.purchase_type === 'expense' ? 'Servicios' : 'Insumos',
            // Un producto creado desde una compra nace en la UNIDAD BASE
            // (`Unidad`); la medida de la linea queda como fila de
            // `product_measure`, no como unidad base (diseño §5.2). Asi la base y
            // la medida no se confunden (`unit='Caja'` + medida 'Caja' seria un
            // factor sobre si mismo).
            unit: 'Unidad',
            unit_price: g.costoBase,
            current_cost: g.costoBase,
            current_stock: g.cantidadBase,
            stock_quantity: g.cantidadBase,
            min_stock: 0,
            max_stock: 0,
            tax_rate: 15,
            is_active: true,
            is_service: purchase.purchase_type === 'expense',
            product_type: purchase.purchase_type === 'expense' ? 'service' : 'product',
            valuation_method: 'weighted_average',
          })
          .select('id')
          .single();
        const nuevoId = creado?.id;
        if (nuevoId) {
          revertir.push(async () => {
            await supabase.from('product').delete().eq('id', nuevoId).eq('company_id', companyId);
          });
          // Producto nuevo: la medida que traia la linea queda registrada al alta
          // (el `cost` guarda lo que registro el usuario, sin convertirlo a neto).
          // Si el alta de la medida falla, se deshacen los efectos ya aplicados y
          // se propaga: nunca queda un producto a medias.
          const medidasNuevas = medidasDeLineas(g.lineas);
          if (medidasNuevas.length > 0) {
            try {
              await reemplazarMedidasCon(supabase, { tenantId, companyId }, nuevoId, medidasNuevas);
            } catch (error) {
              await revertirEfectos(revertir);
              throw error;
            }
          }
        }
      }
    }

    // El historial recibe los items YA NORMALIZADOS (factor resuelto del maestro
    // y `price_includes_tax` resuelto): asi guarda el precio en la unidad base y
    // en neto sin volver a consultar la BD.
    itemsNormalizados = plan.map((p) => ({
      ...p.item,
      unit_factor: p.factor,
      price_includes_tax: p.incluyeIsv,
    }));
  }

  // Historial de precios del proveedor (se revierte junto con el resto si el
  // asiento falla).
  if (purchase.supplier_id && items.length > 0) {
    const historial = await recordSupplierPriceHistory(
      supabase,
      empresa,
      purchase.supplier_id,
      itemsNormalizados,
      purchase.invoice_date
    );
    const idsHistorial = (historial || [])
      .map((fila: any) => fila?.id)
      .filter((id: any): id is string => Boolean(id));
    if (idsHistorial.length > 0) {
      revertir.push(async () => {
        await supabase.from('supplier_price_history').delete().in('id', idsHistorial);
      });
    }
  }

  // Asiento contable OBLIGATORIO. Si falla, se revierte lo aplicado y se
  // propaga el error: `aprobarCompra` no llega a marcar la compra APPROVED.
  let asiento: any;
  try {
    asiento = await crearAsientoCompra(supabase, empresa, purchase, cuentas);
  } catch (error) {
    await revertirEfectos(revertir);
    throw error;
  }

  // Enlazar el asiento con la compra. Si el enlace falla no se puede dejar el
  // asiento suelto: se borra, se revierte y se aborta.
  const { error: linkError } = await supabase
    .from('Purchase')
    .update({ journal_entry_id: asiento.id })
    .eq('id', purchase.id)
    .eq('company_id', companyId);

  if (linkError) {
    await eliminarAsiento(supabase, asiento.id);
    await revertirEfectos(revertir);
    throw new ErrorDeEmpresa(
      409,
      `No se pudo enlazar el asiento contable con la compra: ${linkError.message}. La compra sigue pendiente de aprobación.`
    );
  }

  return asiento;
}

/** Nombre de medida comparable: sin mayusculas ni espacios ("Caja Grande" = "CajaGrande"). */
function claveMedida(valor: unknown): string {
  return String(valor ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Medida del maestro cuyo nombre coincide con el de la linea (o `undefined`). */
function buscarMedidaDe(medidas: any[] | undefined, unidad: unknown): any | undefined {
  const objetivo = claveMedida(unidad);
  if (!objetivo || !medidas) return undefined;
  return medidas.find((m: any) => claveMedida(m?.name) === objetivo);
}

/**
 * Medidas a registrar para un producto recien creado desde la compra: una fila
 * por cada unidad empaquetada de sus lineas (factor > 1; el factor 1 es la
 * unidad base y no necesita fila). Deduplica por nombre.
 */
function medidasDeLineas(
  lineas: Array<{ item: any; factor: number; precioMedida: number; incluyeIsv: boolean }>
) {
  const vistas = new Set<string>();
  const salida: Array<{
    name: string;
    factor: number;
    cost: number;
    sale_price: null;
    price_includes_tax: boolean;
    is_active: boolean;
  }> = [];
  for (const l of lineas) {
    const name = String(l.item?.unit ?? '').trim();
    const clave = claveMedida(name);
    if (!name || l.factor <= 1 || vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push({
      name,
      factor: l.factor,
      cost: Math.round(l.precioMedida),
      sale_price: null,
      price_includes_tax: l.incluyeIsv,
      is_active: true,
    });
  }
  return salida;
}

/**
 * Deshace, en orden inverso, los efectos registrados por `aplicarEfectosCompra`.
 * Cada deshacer es best-effort: si uno falla se registra y se sigue, para no
 * dejar la compra sin aprobar por un fallo al revés.
 */
async function revertirEfectos(revertir: Array<() => Promise<void>>) {
  for (const deshacer of revertir.reverse()) {
    try {
      await deshacer();
    } catch (error) {
      console.error('Error revirtiendo un efecto de la compra:', error);
    }
  }
}

/**
 * Aprueba una compra PENDIENTE: aplica los efectos (stock, historial, asiento) y
 * marca `approved_by`/`approved_at`. El aislamiento y el permiso los valida quien
 * llama (la ruta); aqui solo se comprueba la empresa e id.
 */
export async function aprobarCompra(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  id: string,
  actor: { userId?: string | null } = {}
) {
  const { data: purchase, error: readError } = await supabase
    .from('Purchase')
    .select('*')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .single();

  if (readError || !purchase) return { data: null, error: readError || null, notFound: !purchase };

  if (purchase.approval_status && purchase.approval_status !== 'PENDING_APPROVAL') {
    throw new ErrorDeEmpresa(409, 'La compra ya fue aprobada o rechazada.');
  }

  const { data: items } = await supabase
    .from('PurchaseItem')
    .select('*')
    .eq('purchase_id', purchase.id)
    .eq('company_id', empresa.companyId);

  await aplicarEfectosCompra(supabase, empresa, purchase, items || []);

  await supabase
    .from('Purchase')
    .update({
      approval_status: 'APPROVED',
      approved_by: actor?.userId || null,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)
    .eq('company_id', empresa.companyId);

  return { data: transformPurchase({ ...purchase, approval_status: 'APPROVED' }), error: null };
}

/** Rechaza una compra pendiente. NO aplica efectos (nada que revertir). */
export async function rechazarCompra(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  id: string,
  actor: { userId?: string | null },
  reason?: string | null
) {
  const { data: purchase, error: readError } = await supabase
    .from('Purchase')
    .select('*')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .single();

  if (readError || !purchase) return { data: null, error: readError || null, notFound: !purchase };

  if (purchase.approval_status && purchase.approval_status !== 'PENDING_APPROVAL') {
    throw new ErrorDeEmpresa(409, 'La compra ya fue aprobada o rechazada.');
  }

  await supabase
    .from('Purchase')
    .update({
      approval_status: 'REJECTED',
      rejected_by: actor?.userId || null,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)
    .eq('company_id', empresa.companyId);

  return {
    data: transformPurchase({ ...purchase, approval_status: 'REJECTED', rejection_reason: reason || null }),
    error: null,
  };
}

/** Hidrata ids de usuario (string) con nombre/email desde `"User"`. */
async function hidratarUsuarios(supabase: SupabaseClient, ids: string[]) {
  const mapa = new Map<string, { id: string; nombre: string; email: string }>();
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (unicos.length === 0) return mapa;

  const { data } = await supabase
    .from('User')
    .select('id, firstname, lastname, email')
    .in('id', unicos);

  for (const u of data || []) {
    const nombre = [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
    mapa.set(String(u.id), { id: String(u.id), nombre: nombre || u.email || String(u.id), email: u.email || '' });
  }
  return mapa;
}

/** Lista de aprobadores de la empresa, con nombre y email para la UI. */
export async function fetchAprobadores(supabase: SupabaseClient, empresa: EmpresaCompra) {
  const { data, error } = await supabase
    .from('PurchaseApprover')
    .select('*')
    .eq('company_id', empresa.companyId)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error };

  const filas = data || [];
  const usuarios = await hidratarUsuarios(supabase, filas.map((f: any) => String(f.user_id)));

  return {
    data: filas.map((f: any) => ({
      ...f,
      nombre: usuarios.get(String(f.user_id))?.nombre || String(f.user_id),
      email: usuarios.get(String(f.user_id))?.email || '',
    })),
    error: null,
  };
}

/** Miembros de la empresa (candidatos a aprobador), con nombre y email. */
export async function fetchMiembrosEmpresa(supabase: SupabaseClient, empresa: EmpresaCompra) {
  const { data: accesos, error } = await supabase
    .from('user_company_access')
    .select('user_id')
    .eq('company_id', empresa.companyId);

  if (error) return { data: null, error };

  const ids = (accesos || []).map((a: any) => String(a.user_id)).filter(Boolean);
  const usuarios = await hidratarUsuarios(supabase, ids);

  return {
    data: ids.map((id) => usuarios.get(id) || { id, nombre: id, email: '' }),
    error: null,
  };
}

/**
 * Designa a un usuario como aprobador de la empresa. Idempotente: si ya estaba,
 * no duplica (unique `(company_id, user_id)`).
 */
export async function agregarAprobador(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  userId: string,
  actor?: { userId?: string | null }
) {
  if (!userId || typeof userId !== 'string') {
    throw new ErrorDeEmpresa(400, 'Falta el usuario a designar como aprobador.');
  }

  const { data: existentes } = await supabase
    .from('PurchaseApprover')
    .select('id')
    .eq('company_id', empresa.companyId)
    .eq('user_id', userId)
    .limit(1);

  if (existentes && existentes.length > 0) {
    return { data: existentes[0], error: null };
  }

  const { data, error } = await supabase
    .from('PurchaseApprover')
    .insert({
      company_id: empresa.companyId,
      tenant_id: empresa.tenantId,
      user_id: userId,
      created_by: actor?.userId || null,
    })
    .select()
    .single();

  return { data, error };
}

/** Quita a un aprobador por id de fila, siempre dentro de la empresa. */
export async function eliminarAprobador(supabase: SupabaseClient, empresa: EmpresaCompra, id: string) {
  const { data: fila } = await supabase
    .from('PurchaseApprover')
    .select('id')
    .eq('id', id)
    .eq('company_id', empresa.companyId)
    .maybeSingle();

  if (!fila) return { notFound: true, error: null };

  const { error } = await supabase
    .from('PurchaseApprover')
    .delete()
    .eq('id', id)
    .eq('company_id', empresa.companyId);

  return { notFound: false, error };
}

/** true si el usuario esta designado como aprobador de esta empresa. */
export async function esAprobadorDeCompras(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from('PurchaseApprover')
    .select('id')
    .eq('company_id', empresa.companyId)
    .eq('user_id', userId)
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * true si el usuario es DUENO de esta empresa (`user_company_access.relationship
 * = 'owner'`). Es el rol POR EMPRESA (AGENTS.md 1b), no el rol global de Clerk:
 * en este proyecto el rol se deriva de la membresia, y un contador de una empresa
 * no es gerente de ella. El dueno manda en la aprobacion de compras; los demas
 * solo si estan designados en `PurchaseApprover`.
 */
export async function esDuenoDeEmpresa(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from('user_company_access')
    .select('id')
    .eq('company_id', empresa.companyId)
    .eq('user_id', userId)
    .eq('relationship', 'owner')
    .limit(1);
  return !!(data && data.length > 0);
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
    .map((item: any) => {
      // El precio se guarda POR UNIDAD BASE y en NETO: una compra de "2 Cajas" a
      // 500 con factor 50 vale 10 por unidad, y si el precio de la medida incluye
      // ISV hay que quitarlo para que sea comparable con las demas filas. El
      // factor se resuelve con `factorValido` (no `exigirFactor`): el historial es
      // best-effort y no debe reventar por un factor invalido. `aplicarEfectosCompra`
      // le pasa los items ya normalizados, asi que aqui el factor es el del maestro.
      const factor = factorValido(item.unit_factor);
      const precioBase = precioNeto(
        Number(item.unit_price) || 0,
        Number(item.tax_rate) || 0,
        !!item.price_includes_tax,
        2
      );
      return {
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId,
        supplier_id: supplierId,
        product_id: item.product_id || null,
        // Sin redondear: la columna es `numeric` (Prisma la declara `Decimal`, y la
        // 014 como DECIMAL(18,4)). `Math.round` tiraba los decimales, asi que un
        // precio de 12.75 lempira se guardaba como 13: el historico no cuadraba
        // con la linea de compra de la que salio. Los importes del proyecto ya
        // estan en lempiras (AGENTS.md, seccion 2), asi que aqui no se divide ni
        // se multiplica por 100.
        price: precioBase / factor,
        currency: 'HNL',
        effective_date: effectiveDate,
        notes: `Registrado en compra - ${item.product_name || item.description || 'Producto'}${item.invoice_number ? ` (Factura ${item.invoice_number})` : ''}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) return [];

  // Devuelve las filas insertadas (con `id`) para que `aplicarEfectosCompra`
  // pueda deshacerlas si el asiento contable obligatorio falla. Antes era
  // `void`: se perdía la pista de qué se había escrito y no había forma de
  // revertirlo.
  const { data, error } = await supabase
    .from('supplier_price_history')
    .insert(rows)
    .select('id');
  if (error) {
    console.error('Error recording supplier price history:', error);
    return [];
  }
  return data || [];
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

  // Misma razon que la pertenencia de abajo: el factor se exige ANTES del
  // `delete` de lineas. Si lanzara despues, la compra quedaria sin ninguna.
  itemsNuevos.forEach((item: any) => exigirFactor(item.unit_factor ?? 1));

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

  // Retencion ISR y exoneracion: el formulario manda el tipo (heredado del
  // proveedor o sobrescrito) y las lineas; el monto se recalcula sobre el subtotal.
  if (body.withholding_type !== undefined) {
    const tipo = normalizarTipoRetencion(body.withholding_type);
    const baseSubtotal =
      updates.subtotal !== undefined ? Number(updates.subtotal) : Math.round(Number(body.subtotal) || 0);
    const monto = calcularRetencion(baseSubtotal, tipo);
    updates.withholding_type = tipo === 'NONE' ? null : tipo;
    updates.withholding_rate = monto > 0 ? tasaDeRetencion(tipo) : 0;
    updates.withholding_amount = monto;
  }
  if (Array.isArray(body.items) || body.exonerated !== undefined) {
    updates.exonerated = !!body.exonerated || itemsNuevos.some((i: any) => !!i.exonerated);
  }

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
      // Mismo contrato que en `createPurchase`: reescribe las lineas al editar,
      // asi que la medida se persiste igual (default decidido aqui, factor estricto).
      unit: item.unit || null,
      unit_factor: exigirFactor(item.unit_factor ?? 1),
      exonerated: !!item.exonerated,
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
    .select('total, is_credit, amount_paid, withholding_amount')
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
    .select('total, is_credit, amount_paid, withholding_amount')
    .eq('id', purchaseId)
    .eq('company_id', empresa.companyId)
    .single();
  if (!purchase) return null;

  const paid = hasPayments
    ? paymentsRows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(purchase.amount_paid) || 0;

  const total = overrides?.total ?? (Number(purchase.total) || 0);
  const isCredit = overrides?.isCredit ?? !!purchase.is_credit;
  const withholding = Number(purchase.withholding_amount) || 0;
  const balance = Math.max(total - withholding - paid, 0);

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

type CuentasCompra = { debito: string; isv: string | null; haber: string; retencion: string | null };

/**
 * Prefijos de codigo de cuenta por rol, en orden de preferencia. Se resuelve por
 * PREFIJO (no por codigo exacto) porque los catalogos varian por empresa:
 * Angelos tiene `1106-01`/`1105-01`, Empresa 1 tiene `1105`/`1140`. Un
 * `.eq('code','1105')` no encuentra ninguna en Angelos y **bloquearia** la
 * compra; con `ilike '1105%'` entra tanto `1105` como `1105-01`.
 */
const CUENTAS_COMPRA = {
  inventario: ['1105', '1140', '1301'],
  gasto: ['6101', '5101', '6103', '6201', '6301', '5201'],
  isvCredito: ['1106', '2201'],
  porPagar: ['2101', '2103', '2110', '2120'],
  banco: ['1101', '1110', '1111', '1112', '1102'],
  // "Retenciones ISR por Pagar" (210202 cuelga de 2102 Retenciones por Pagar).
  retencion: ['210202', '2102'],
};

/**
 * Primer id de cuenta cuyo codigo empieza por alguno de los prefijos, dentro de
 * la empresa. `.order('code')` + `.limit(1)` para ser determinista cuando hay
 * varias ("1101" gana a "1101-01"); `.limit(1)` (no `.single()`) porque test 1 y
 * test 2 comparten `TEST1DS` y `.single()` reventaria con `PGRST116` y dejaria
 * el asiento sin crear en silencio.
 */
async function cuentaPorPrefijo(
  supabase: SupabaseClient,
  companyId: string,
  prefijos: string[]
): Promise<string | null> {
  for (const prefijo of prefijos) {
    const { data } = await supabase
      .from('Account')
      .select('id')
      .eq('company_id', companyId)
      .ilike('code', `${prefijo}%`)
      .order('code', { ascending: true })
      .limit(1);
    const id = data?.[0]?.id;
    if (id) return id as string;
  }
  return null;
}

async function cuentaRequerida(
  supabase: SupabaseClient,
  companyId: string,
  prefijos: string[],
  etiqueta: string
): Promise<string> {
  const id = await cuentaPorPrefijo(supabase, companyId, prefijos);
  if (!id) {
    throw new ErrorDeEmpresa(
      409,
      `No se puede contabilizar: falta la cuenta de "${etiqueta}" en el catálogo contable de la empresa. Configúrala antes de continuar.`
    );
  }
  return id;
}

/**
 * Resuelve las cuentas del asiento de una compra por **empresa** (`company_id`,
 * no `tenant_id`): test 1 y test 2 comparten `TEST1DS`, asi que filtrar por
 * tenant puede devolver la cuenta de la hermana. Una cuenta ausente es un error
 * de negocio (409): el asiento es obligatorio, y una configuracion contable
 * incompleta **bloquea** la aprobacion en vez de aprobar sin contabilizar.
 */
async function resolverCuentasDeCompra(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  purchase: any
): Promise<CuentasCompra> {
  const companyId = empresa.companyId;
  const esMercaderia = purchase.purchase_type === 'merchandise';

  const debito = await cuentaRequerida(
    supabase,
    companyId,
    esMercaderia ? CUENTAS_COMPRA.inventario : CUENTAS_COMPRA.gasto,
    esMercaderia ? 'Inventario (mercadería)' : 'Gasto / costo de compra'
  );

  const haber = await cuentaRequerida(
    supabase,
    companyId,
    purchase.is_credit ? CUENTAS_COMPRA.porPagar : CUENTAS_COMPRA.banco,
    purchase.is_credit ? 'Cuentas por Pagar' : 'Banco / Caja'
  );

  const impuesto = Number(purchase.tax_amount) || 0;
  const isv = impuesto > 0
    ? await cuentaRequerida(supabase, companyId, CUENTAS_COMPRA.isvCredito, 'ISV Crédito Fiscal')
    : null;

  // La retencion ISR solo existe si la compra tiene monto retenido.
  const retencion =
    (Number(purchase.withholding_amount) || 0) > 0
      ? await cuentaRequerida(supabase, companyId, CUENTAS_COMPRA.retencion, 'Retenciones ISR por Pagar')
      : null;

  return { debito, isv, haber, retencion };
}

/**
 * Crea el asiento contable de la compra reusando el escritor canonico
 * (`Transaction` + lineas `JournalEntry` de `lib/services/journal-service`):
 * numeracion, candado de periodo y auditoria salen de ahi.
 *
 * Antes esta funcion escribia `JournalEntry` como si fuera una **cabecera**
 * (`date/reference/is_posted/total_debit/total_credit`) y metia las lineas en una
 * tabla inexistente `JournalEntryLine`: en Supabase real fallaba y el asiento de
 * compras nunca llegaba a los libros (`JournalEntry` es la tabla de LINEAS, no de
 * cabeceras; la cabecera es `Transaction`). Obligatorio: cualquier fallo se
 * convierte en `ErrorDeEmpresa(409)` para que `aprobarCompra` revierta.
 */
async function crearAsientoCompra(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  purchase: any,
  cuentas: CuentasCompra
) {
  const subtotal = Number(purchase.subtotal) || 0;
  const impuesto = Number(purchase.tax_amount) || 0;
  const total = Number(purchase.total) || 0;
  const retencionMonto = Number(purchase.withholding_amount) || 0;
  const esMercaderia = purchase.purchase_type === 'merchandise';

  const entries: JournalEntryInput[] = [
    {
      accountId: cuentas.debito,
      amount: subtotal,
      isDebit: true,
      description: esMercaderia ? 'Compra de mercadería' : 'Gasto / costo de compra',
    },
  ];
  if (cuentas.isv && impuesto > 0) {
    entries.push({
      accountId: cuentas.isv,
      amount: impuesto,
      isDebit: true,
      description: 'ISV Crédito Fiscal',
    });
  }
  // El proveedor recibe `total - retencion`; la retencion queda por pagar.
  entries.push({
    accountId: cuentas.haber,
    amount: total - retencionMonto,
    isDebit: false,
    description: purchase.is_credit ? 'Cuentas por Pagar' : 'Banco / Caja',
  });
  if (cuentas.retencion && retencionMonto > 0) {
    entries.push({
      accountId: cuentas.retencion,
      amount: retencionMonto,
      isDebit: false,
      description: 'Retención ISR por Pagar',
    });
  }

  try {
    const { transaction } = await createJournalTransaction(
      supabase as unknown as SupaClient,
      empresa.tenantId,
      {
        description: `Compra ${purchase.is_credit ? 'a crédito' : 'al contado'} - Factura ${purchase.invoice_number}`,
        date: purchase.invoice_date || new Date().toISOString().split('T')[0],
        voucherType: purchase.is_credit ? 'DIARIO' : 'EGRESO',
        reference: `COMP-${purchase.invoice_number}`,
        currency: 'HNL',
        companyId: empresa.companyId,
        entries,
      }
    );
    return transaction;
  } catch (error) {
    throw new ErrorDeEmpresa(
      409,
      `No se pudo registrar el asiento contable de la compra: ${
        (error as { message?: string })?.message || 'error desconocido'
      }. La compra sigue pendiente de aprobación.`
    );
  }
}

/**
 * Borra el asiento contable de una transaccion (lineas `JournalEntry` + cabecera
 * `Transaction`). Se usa para revertir el asiento de una compra/pago cuando algo
 * falla despues de crearlo. Acepta la convencion camel (`transactionId`) y la
 * snake como respaldo.
 */
export async function eliminarAsiento(supabase: SupabaseClient, txId: string | null | undefined) {
  if (!txId) return;
  await supabase.from('JournalEntry').delete().eq('transactionId', txId);
  await supabase.from('JournalEntry').delete().eq('transaction_id', txId);
  await supabase.from('Transaction').delete().eq('id', txId);
}

/**
 * Crea el asiento del PAGO a proveedor: **debe Cuentas por Pagar**, **haber
 * Banco/Caja**. Obligatorio igual que el de la compra: si falta la cuenta, el
 * pago no se registra (`ErrorDeEmpresa(409)`). Devuelve la `Transaction` creada
 * para que la ruta guarde su id en `SupplierPayment.journal_entry_id`.
 */
export async function crearAsientoPago(
  supabase: SupabaseClient,
  empresa: EmpresaCompra,
  payment: any,
  purchase: any
) {
  const monto = Number(payment.amount) || 0;
  if (!(monto > 0)) {
    throw new ErrorDeEmpresa(409, 'No se puede contabilizar un pago de monto cero.');
  }

  const porPagar = await cuentaRequerida(
    supabase,
    empresa.companyId,
    CUENTAS_COMPRA.porPagar,
    'Cuentas por Pagar'
  );
  const banco = await cuentaRequerida(
    supabase,
    empresa.companyId,
    CUENTAS_COMPRA.banco,
    'Banco / Caja'
  );

  try {
    const { transaction } = await createJournalTransaction(
      supabase as unknown as SupaClient,
      empresa.tenantId,
      {
        description: `Pago a proveedor - Factura ${purchase?.invoice_number || payment.purchase_id}`,
        date: payment.payment_date || new Date().toISOString().split('T')[0],
        voucherType: 'EGRESO',
        reference: payment.reference_number || `PAGO-${payment.id}`,
        currency: 'HNL',
        companyId: empresa.companyId,
        entries: [
          { accountId: porPagar, amount: monto, isDebit: true, description: 'Cuentas por Pagar' },
          { accountId: banco, amount: monto, isDebit: false, description: 'Banco / Caja' },
        ],
      }
    );
    return transaction;
  } catch (error) {
    throw new ErrorDeEmpresa(
      409,
      `No se pudo registrar el asiento contable del pago: ${
        (error as { message?: string })?.message || 'error desconocido'
      }.`
    );
  }
}
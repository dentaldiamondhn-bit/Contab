// Supabase falso para probar el flujo de facturacion aislado por EMPRESA:
// `lib/billing/invoice-number.ts` y las rutas `billing/cai`, `billing/invoices` y
// `companies/[id]/billing/config[/cai]` contra el codigo REAL.
//
// Tablas: `companies` (para que el contexto resuelva), `cai`, `Invoice`,
// `InvoiceItem`, `Tenant`, `system_config` y `storage` (la config del emisor pide
// la URL firmada del logo).
//
// El proposito: test 1 y test 2 comparten `TEST1DS` pero son emisores distintos.
// Sus series de factura y sus CAI NO pueden mezclarse: la frontera es
// `company_id`, no `tenant_id` (migracion 067, `UNIQUE(company_id, invoiceNumber)`).

export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', rtn: '0801-0001', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', rtn: '0801-0002', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', rtn: '0801-1111', created_at: '2026-02-01T00:00:00Z' },
];

export const TENANTS = [
  { id: 'TEST1DS', businessname: 'Grupo Test', businessrtn: '0801-0000', created_at: '2026-01-01T00:00:00Z' },
  { id: 'ANGELOH7', businessname: 'Angelos', businessrtn: '0801-1111', created_at: '2026-01-01T00:00:00Z' },
];

// Cada empresa con su PROPIA serie: test 1 va por el 5 (CAI rango 1..1000), test 2
// sin CAI y sin facturas (empieza en el 1), Angelos por el 7 en su tenant.
const CAI_INICIAL = [
  {
    id: 'cai-test1',
    company_id: 'c-test1',
    tenant_id: 'TEST1DS',
    status: 'active',
    cai: 'CAI-TEST1',
    cai_number: 'CAI-TEST1',
    rango_inicial: 1,
    rango_final: 1000,
    start_number: 1,
    end_number: 1000,
    current_number: 5,
    current_correlative: 5,
    fecha_limite_emision: '2030-01-01',
    expiration_date: '2030-01-01',
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'cai-angelos',
    company_id: 'c-angelos',
    tenant_id: 'ANGELOH7',
    status: 'active',
    cai: 'CAI-ANGELOS',
    cai_number: 'CAI-ANGELOS',
    rango_inicial: 1,
    rango_final: 1000,
    start_number: 1,
    end_number: 1000,
    current_number: 7,
    current_correlative: 7,
    fecha_limite_emision: '2030-01-01',
    expiration_date: '2030-01-01',
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    // CAI de test 2, INACTIVO, para comprobar que el POST de test 1 no lo apaga.
    id: 'cai-test2',
    company_id: 'c-test2',
    tenant_id: 'TEST1DS',
    status: 'inactive',
    cai: 'CAI-TEST2',
    cai_number: 'CAI-TEST2',
    rango_inicial: 1,
    rango_final: 500,
    start_number: 1,
    end_number: 500,
    current_number: 1,
    current_correlative: 1,
    fecha_limite_emision: '2030-01-01',
    expiration_date: '2030-01-01',
    created_at: '2026-01-03T00:00:00Z',
  },
];

const INVOICE_INICIAL = [
  {
    id: 'inv-test1-5',
    tenantId: 'TEST1DS',
    company_id: 'c-test1',
    invoiceNumber: '001-01-01-00000005',
    invoiceType: 'CUSTOMER',
    status: 'PAID',
    cai: 'CAI-TEST1',
    issueDate: '2026-03-01',
    total: 100,
  },
  {
    id: 'inv-angelos-7',
    tenantId: 'ANGELOH7',
    company_id: 'c-angelos',
    invoiceNumber: '001-01-01-00000007',
    invoiceType: 'CUSTOMER',
    status: 'PAID',
    cai: 'CAI-ANGELOS',
    issueDate: '2026-03-02',
    total: 200,
  },
];

export const CAI = CAI_INICIAL.map((f) => ({ ...f }));
export const INVOICE = INVOICE_INICIAL.map((f) => ({ ...f }));
export const INVOICE_ITEM = [];
export const SYSTEM_CONFIG = [];

// Inventario para probar `lib/services/stock-sale.ts` REAL (el descuento de stock
// al emitir). test 1 y test 2 comparten `TEST1DS`: antes el filtro era por
// `tenant_id`, asi que test 1 podia vender/descontar el producto de test 2.
const PRODUCT_INICIAL = [
  {
    id: 'p-test1',
    tenant_id: 'TEST1DS',
    company_id: 'c-test1',
    code: 'P1',
    name: 'Producto test 1',
    current_stock: 10,
    is_service: false,
    warehouse_id: null,
    current_cost: 5,
  },
  {
    id: 'p-test2',
    tenant_id: 'TEST1DS',
    company_id: 'c-test2',
    code: 'P2',
    name: 'Producto test 2',
    current_stock: 10,
    is_service: false,
    warehouse_id: null,
    current_cost: 7,
  },
  {
    id: 'p-angelos',
    tenant_id: 'ANGELOH7',
    company_id: 'c-angelos',
    code: 'P3',
    name: 'Producto Angelos',
    current_stock: 10,
    is_service: false,
    warehouse_id: null,
    current_cost: 9,
  },
  {
    id: 's-test1',
    tenant_id: 'TEST1DS',
    company_id: 'c-test1',
    code: 'S1',
    name: 'Servicio test 1',
    current_stock: 0,
    is_service: true,
    warehouse_id: null,
    current_cost: 0,
  },
];

export const PRODUCT = PRODUCT_INICIAL.map((f) => ({ ...f }));
export const INVENTORY_MOVEMENT = [];

let contadorId = 100;

export function reiniciar() {
  CAI.length = 0;
  CAI.push(...CAI_INICIAL.map((f) => ({ ...f })));
  INVOICE.length = 0;
  INVOICE.push(...INVOICE_INICIAL.map((f) => ({ ...f })));
  INVOICE_ITEM.length = 0;
  SYSTEM_CONFIG.length = 0;
  PRODUCT.length = 0;
  PRODUCT.push(...PRODUCT_INICIAL.map((f) => ({ ...f })));
  INVENTORY_MOVEMENT.length = 0;
  contadorId = 100;
}

/** Consultas registradas, para comprobar que se filtro por empresa. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

/** Filas de una tabla, para aserciones. */
export function filas(tabla) {
  return TABLAS[tabla] || [];
}

const TABLAS = {
  companies: COMPANIES,
  Tenant: TENANTS,
  cai: CAI,
  Invoice: INVOICE,
  InvoiceItem: INVOICE_ITEM,
  system_config: SYSTEM_CONFIG,
  product: PRODUCT,
  inventory_movement: INVENTORY_MOVEMENT,
};

function coincide(fila, filtros, orConds) {
  for (const { columna, valor } of filtros) {
    if (valor === null) {
      if (fila[columna] !== null && fila[columna] !== undefined) return false;
      continue;
    }
    if (String(fila[columna]) !== String(valor)) return false;
  }
  for (const cond of orConds) {
    const alternativas = cond.split(',').map((c) => c.trim());
    const alguna = alternativas.some((alt) => {
      const [col, op, val] = alt.split('.');
      if (op === 'is' && val === 'null') return fila[col] === null || fila[col] === undefined;
      if (op === 'eq') return String(fila[col]) === String(val);
      return false;
    });
    if (!alguna) return false;
  }
  return true;
}

function construir(tabla) {
  const filtros = [];
  const orConds = [];
  const rangos = [];
  let inCond = null;
  let orden = null;
  let verb = 'select';
  let patch = null;
  let payload = null;
  let opcionesSelect = null;
  let selecciono = false;

  const q = {
    select(_cols, opciones) { selecciono = true; opcionesSelect = opciones || null; return q; },
    update(p) { verb = 'update'; patch = p; return q; },
    delete() { verb = 'delete'; return q; },
    insert(v) { verb = 'insert'; payload = v; return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
    not() { return q; },
    gte(columna, valor) { rangos.push({ columna, op: 'gte', valor }); return q; },
    lte(columna, valor) { rangos.push({ columna, op: 'lte', valor }); return q; },
    in(columna, valores) { inCond = { columna, valores: [...valores] }; return q; },
    or(cond) { orConds.push(cond); return q; },
    limit() { return q; },
    order(columna, opciones) { orden = { columna, ascending: opciones?.ascending !== false }; return q; },
    maybeSingle() { return resolver('maybe'); },
    single() { return resolver('single'); },
    then(onFulfilled, onRejected) { return Promise.resolve(resolver('multi')).then(onFulfilled, onRejected); },
  };

  function resolver(modo) {
    consultas.push({ tabla, verb, filtros: filtros.map((f) => ({ ...f })), orConds: [...orConds] });

    if (verb === 'insert') {
      const registros = Array.isArray(payload) ? payload : [payload];
      const creadas = registros.map((fila) => ({ id: fila.id || `gen-${contadorId++}`, ...fila }));
      (TABLAS[tabla] || []).push(...creadas);
      if (selecciono || modo === 'single') {
        return { data: modo === 'single' ? creadas[0] : creadas, error: null };
      }
      return { data: modo === 'multi' ? creadas : creadas[0], error: null };
    }

    let encontradas = (TABLAS[tabla] || []).filter((f) => coincide(f, filtros, orConds));

    if (verb === 'update') {
      if (encontradas.length === 0) {
        return modo === 'multi' ? { data: null, error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      }
      for (const fila of encontradas) Object.assign(fila, patch);
      if (selecciono) return { data: modo === 'single' ? encontradas[0] : encontradas, error: null };
      return modo === 'multi' ? { data: null, error: null } : { data: encontradas[0], error: null };
    }

    if (verb === 'delete') {
      for (const fila of encontradas) {
        const i = (TABLAS[tabla] || []).indexOf(fila);
        if (i >= 0) TABLAS[tabla].splice(i, 1);
      }
      return { data: null, error: null };
    }

    let candidatas = encontradas;
    for (const r of rangos) {
      candidatas = candidatas.filter((f) => {
        const a = String(f[r.columna]);
        const b = String(r.valor);
        return r.op === 'gte' ? a >= b : a <= b;
      });
    }
    if (inCond) candidatas = candidatas.filter((f) => inCond.valores.map(String).includes(String(f[inCond.columna])));
    if (orden) {
      candidatas = [...candidatas].sort((a, b) => {
        const cmp = String(a[orden.columna]).localeCompare(String(b[orden.columna]));
        return orden.ascending ? cmp : -cmp;
      });
    }

    if (opcionesSelect && opcionesSelect.head) {
      return { data: null, count: candidatas.length, error: null };
    }
    if (opcionesSelect && opcionesSelect.count) {
      return { data: candidatas, count: candidatas.length, error: null };
    }

    if (modo === 'multi') return { data: candidatas, error: null };
    if (modo === 'single') {
      if (candidatas.length === 0) return { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      return { data: candidatas[0], error: null };
    }
    return { data: candidatas[0] ?? null, error: null };
  }

  return q;
}

const STORAGE = {
  from() {
    return {
      async createSignedUrl() {
        return { data: { signedUrl: 'https://fake.example/logo.png' }, error: null };
      },
      getPublicUrl() {
        return { data: { publicUrl: 'https://fake.example/logo.png' } };
      },
    };
  },
};

export function getSupabaseServer() {
  return { from: (tabla) => construir(tabla), storage: STORAGE };
}

// Supabase falso para probar el contexto de empresa contra la tabla `companies`.
//
// Reproduce los dos caminos que usa `lib/tenant-resolver.ts`: buscar por
// `companies.id` (el `[id]` de la URL) y buscar por `companies.tenant_id` (el
// codigo del tenant), que devuelve la empresa MAS ANTIGUA. test 1 y test 2
// comparten `TEST1DS`, asi que ese segundo camino es justo el que mezclaba.
//
// Ampliado el 8 Oct 2026 con `product_location` + verbos `update`/`delete` y
// `.or(...)`, para probar el aislamiento del CRUD de estantes
// (`lib/services/location-service.ts`) contra el codigo REAL: el scope de
// empresa que `companyScope` encadena es lo que separa a test 1 de test 2.

// test 1 (mas antigua) y test 2 (mas reciente) del mismo tenant.
export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', created_at: '2026-02-01T00:00:00Z' },
];

// Estantes: dos de test 1 y test 2 (mismo tenant, empresa distinta), uno sin
// empresa (la convencion valida de `location-service`) y uno de otro tenant.
// `l-test1` lleva el codigo legacy "P1" (ajeno a la serie UB-) y
// `l-sin-empresa` lleva "UB-099" SIN empresa: los dos existen para probar que
// la serie automatica solo cuenta las filas de la propia empresa y solo el
// patron UB-###.
const PRODUCT_LOCATION_INICIAL = [
  { id: 'l-test1', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'P1', name: 'Estante A', is_active: true },
  { id: 'l-test2', tenant_id: 'TEST1DS', company_id: 'c-test2', name: 'Estante B', is_active: true },
  { id: 'l-sin-empresa', tenant_id: 'TEST1DS', company_id: null, code: 'UB-099', name: 'Estante C', is_active: true },
  { id: 'l-angelos', tenant_id: 'ANGELOH7', company_id: 'c-angelos', name: 'Estante D', is_active: true },
];

export const PRODUCT_LOCATION = PRODUCT_LOCATION_INICIAL.map((f) => ({ ...f }));

export function reiniciarProductLocation() {
  PRODUCT_LOCATION.length = 0;
  PRODUCT_LOCATION.push(...PRODUCT_LOCATION_INICIAL.map((f) => ({ ...f })));
}

// Almacenes: test 1 con la serie ALM-001/ALM-002 real (como la BD), test 2 con
// un codigo legacy sin serie, uno sin empresa con ALM-099, uno legacy "PRINCIPAL"
// de test 1 y uno de otro tenant. Los legacy y los sin empresa existen para
// probar que la serie ALM-### solo cuenta las filas de la propia empresa.
const WAREHOUSE_INICIAL = [
  { id: 'w-test1', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'ALM-001', name: 'Bodega Uno', is_active: true },
  { id: 'w-test1b', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'ALM-002', name: 'Bodega Dos', is_active: true },
  { id: 'w-test1-legacy', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'PRINCIPAL', name: 'Legacy', is_active: true },
  { id: 'w-test2', tenant_id: 'TEST1DS', company_id: 'c-test2', code: 'SEC', name: 'Bodega Hermana', is_active: true },
  { id: 'w-sin-empresa', tenant_id: 'TEST1DS', company_id: null, code: 'ALM-099', name: 'Bodega Heredada', is_active: true },
  { id: 'w-angelos', tenant_id: 'ANGELOH7', company_id: 'c-angelos', code: 'BOD-1', name: 'Bodega Angelos', is_active: true },
];

export const WAREHOUSE = WAREHOUSE_INICIAL.map((f) => ({ ...f }));

export function reiniciarWarehouse() {
  WAREHOUSE.length = 0;
  WAREHOUSE.push(...WAREHOUSE_INICIAL.map((f) => ({ ...f })));
}

// Productos: dos del mismo tenant con empresas distintas (test 1/test 2) y uno
// de otro tenant. `current_stock` desigual (100 vs 10) para poder probar `.gt`
// y `name` distinto para `.ilike`. `product_measure` cuelga de `product_id`.
const PRODUCT_INICIAL = [
  { id: 'p-test1', tenant_id: 'TEST1DS', company_id: 'c-test1', name: 'Guantes', unit: 'Unidad', unit_price: 10, current_stock: 100, price_includes_tax: false, is_active: true },
  { id: 'p-test2', tenant_id: 'TEST1DS', company_id: 'c-test2', name: 'Gasas', unit: 'Unidad', unit_price: 5, current_stock: 10, price_includes_tax: false, is_active: true },
  { id: 'p-angelos', tenant_id: 'ANGELOH7', company_id: 'c-angelos', name: 'Sonda', unit: 'Unidad', unit_price: 0, current_stock: 0, price_includes_tax: false, is_active: true },
];

export const PRODUCT = PRODUCT_INICIAL.map((f) => ({ ...f }));

export function reiniciarProduct() {
  PRODUCT.length = 0;
  PRODUCT.push(...PRODUCT_INICIAL.map((f) => ({ ...f })));
}

// Medidas: test 1 tiene dos sobre el mismo producto (Caja y Docena) y test 2
// repite "Caja" sobre su producto: la misma medida en otra empresa y sobre otro
// producto, para probar que el aislamiento por `company_id` y el filtro `.in`
// por `product_id` no las mezclan.
const PRODUCT_MEASURE_INICIAL = [
  { id: 'm-test1-caja', tenant_id: 'TEST1DS', company_id: 'c-test1', product_id: 'p-test1', name: 'Caja', factor: 50, cost: 450, sale_price: 600, price_includes_tax: false, is_active: true },
  { id: 'm-test1-docena', tenant_id: 'TEST1DS', company_id: 'c-test1', product_id: 'p-test1', name: 'Docena', factor: 12, cost: 110, sale_price: 150, price_includes_tax: false, is_active: true },
  { id: 'm-test2-caja', tenant_id: 'TEST1DS', company_id: 'c-test2', product_id: 'p-test2', name: 'Caja', factor: 100, cost: 400, sale_price: 550, price_includes_tax: false, is_active: true },
];

export const PRODUCT_MEASURE = PRODUCT_MEASURE_INICIAL.map((f) => ({ ...f }));

export function reiniciarMedidas() {
  PRODUCT_MEASURE.length = 0;
  PRODUCT_MEASURE.push(...PRODUCT_MEASURE_INICIAL.map((f) => ({ ...f })));
}

const TABLAS = {
  companies: COMPANIES,
  product_location: PRODUCT_LOCATION,
  warehouse: WAREHOUSE,
  product: PRODUCT,
  product_measure: PRODUCT_MEASURE,
};

/** Consultas registradas, para comprobar que se filtraron por la columna correcta. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

/** `coincide`-era de `.eq()`: y de `.or('col.op.val,col.op.val,...')`. */
function coincide(fila, filtros, orConds) {
  for (const { columna, valor, op } of filtros) {
    if (op === 'gt') {
      if (!(Number(fila[columna]) > Number(valor))) return false;
      continue;
    }
    if (op === 'in') {
      if (!valor.map(String).includes(String(fila[columna]))) return false;
      continue;
    }
    if (valor === null) {
      if (fila[columna] !== null && fila[columna] !== undefined) return false;
      continue;
    }
    if (typeof valor === 'string' && valor.startsWith('__ilike:')) {
      // Mismo patron que `tests/purchases/supabase-falso.mjs`: `%` es comodin,
      // el resto se escapa y la comparacion es en minusculas (bandera `i`).
      const rx = valor.slice(8).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*');
      const pat = new RegExp('^' + rx + '$', 'i');
      if (!pat.test(String(fila[columna] ?? ''))) return false;
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
  let ordenarPorCreada = false;
  let verb = 'select';
  let patch = null;
  let insertado = null;

  const q = {
    select() { return q; },
    insert(p) { verb = 'insert'; insertado = p; return q; },
    update(p) { verb = 'update'; patch = p; return q; },
    delete() { verb = 'delete'; return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
    ilike(columna, valor) { filtros.push({ columna, valor: '__ilike:' + valor }); return q; },
    gt(columna, valor) { filtros.push({ columna, valor, op: 'gt' }); return q; },
    in(columna, valores) { filtros.push({ columna, valor: valores, op: 'in' }); return q; },
    or(cond) { orConds.push(cond); return q; },
    limit() { return q; },
    order(columna, opciones) {
      if (columna === 'created_at' && opciones?.ascending === true) ordenarPorCreada = true;
      return q;
    },
    maybeSingle() { return resolver('maybe'); },
    single() { return resolver('single'); },
    then(onFulfilled, onRejected) { return resolver('multi').then(onFulfilled, onRejected); },
  };

  async function resolver(modo) {
    consultas.push({
      tabla,
      verb,
      filtros: filtros.map((f) => ({ ...f })),
      orConds: [...orConds],
      ordenarPorCreada,
    });
    const filas = TABLAS[tabla];
    if (!filas) return { data: null, error: { message: `tabla desconocida: ${tabla}` } };

    const encontradas = filas.filter((f) => coincide(f, filtros, orConds));

    // `insert(...)` empuja la fila (o filas) al final de la tabla. El id real
    // lo pondria el default de la BD; aqui basta una clave unica para que
    // `reiniciarProductLocation()` pueda restaurar el estado inicial.
    if (verb === 'insert') {
      const nuevas = (Array.isArray(insertado) ? insertado : [insertado]).map((f, i) => {
        const fila = { id: `nuevo-${TABLAS[tabla].length + 1}-${i}`, ...f };
        TABLAS[tabla].push(fila);
        return fila;
      });
      if (modo === 'multi') return { data: nuevas, error: null };
      return { data: nuevas[0] ?? null, error: null };
    }

    if (verb === 'update') {
      if (encontradas.length === 0) {
        // Es lo que PostgREST responde cuando el filtro no encuentra nada:
        // 0 filas afectadas, sin error de red.
        return modo === 'multi'
          ? { data: null, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      }
      for (const fila of encontradas) Object.assign(fila, patch);
      if (modo === 'multi') return { data: null, error: null };
      return { data: encontradas[0], error: null };
    }

    if (verb === 'delete') {
      for (const fila of encontradas) filas.splice(filas.indexOf(fila), 1);
      return { data: null, error: null };
    }

    let candidatas = encontradas;
    if (ordenarPorCreada) {
      candidatas = [...candidatas].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }

    // `await query` a secas (multi) devuelve TODAS las filas; es lo que usa
    // `listLocations`.
    if (modo === 'multi') return { data: candidatas, error: null };
    if (modo === 'single') {
      if (candidatas.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      }
      return { data: candidatas[0], error: null };
    }
    // `maybeSingle` sin fila NO es error: `data: null`.
    return { data: candidatas[0] ?? null, error: null };
  }

  return q;
}

export function getSupabaseServer() {
  return { from: (tabla) => construir(tabla) };
}

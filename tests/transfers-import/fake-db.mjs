// Supabase falso para la ruta de import de traslados. Cubre las tres tablas
// que toca: `companies` (contextoDeEmpresa), `warehouse` y `product` (el
// mapeo de la plantilla, filtrado por empresa como en produccion).

export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', created_at: '2026-02-01T00:00:00Z' },
];

// Almacenes: test 1 con ALM-001/ALM-002 activos y ALM-003 apagado; test 2 con
// su propio ALM-001 (mismo codigo, empresa distinta: si el filtro de empresa
// fallara, los dos codigos chocarian en el Map y el test lo veria).
const WAREHOUSE_INICIAL = [
  { id: 'w1', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'ALM-001', name: 'Bodega Uno', is_active: true },
  { id: 'w2', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'ALM-002', name: 'Bodega Dos', is_active: true },
  { id: 'w3', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'ALM-003', name: 'Bodega Apagada', is_active: false },
  { id: 'w-h1', tenant_id: 'TEST1DS', company_id: 'c-test2', code: 'ALM-001', name: 'Hermana Uno', is_active: true },
];

const PRODUCT_INICIAL = [
  { id: 'p1', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'PROD-001' },
  { id: 'p2', tenant_id: 'TEST1DS', company_id: 'c-test1', code: 'PROD-002' },
  { id: 'p-h', tenant_id: 'TEST1DS', company_id: 'c-test2', code: 'PROD-999' },
];

export const WAREHOUSE = WAREHOUSE_INICIAL.map((f) => ({ ...f }));
export const PRODUCT = PRODUCT_INICIAL.map((f) => ({ ...f }));

export function reiniciarTablas() {
  WAREHOUSE.length = 0;
  WAREHOUSE.push(...WAREHOUSE_INICIAL.map((f) => ({ ...f })));
  PRODUCT.length = 0;
  PRODUCT.push(...PRODUCT_INICIAL.map((f) => ({ ...f })));
}

const TABLAS = { companies: COMPANIES, warehouse: WAREHOUSE, product: PRODUCT };

function coincide(fila, filtros) {
  return filtros.every(({ columna, valor }) => String(fila[columna]) === String(valor));
}

function construir(tabla) {
  const filtros = [];
  let ordenarPorCreada = false;

  const q = {
    select() { return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
    // `filtroEmpresaOCompany` devuelve `{ company_id }` y la ruta lo pasa a
    // `.match(...)`: hace falta soportarlo, no solo `.eq`.
    match(obj) {
      for (const [columna, valor] of Object.entries(obj || {})) {
        filtros.push({ columna, valor });
      }
      return q;
    },
    limit() { return q; },
    order(columna, opciones) {
      if (columna === 'created_at' && opciones?.ascending === true) ordenarPorCreada = true;
      return q;
    },
    maybeSingle() { return resolver('maybe'); },
    then(onFulfilled, onRejected) { return resolver('multi').then(onFulfilled, onRejected); },
  };

  async function resolver(modo) {
    const filas = TABLAS[tabla];
    if (!filas) return { data: null, error: { message: `tabla desconocida: ${tabla}` } };

    let encontradas = filas.filter((f) => coincide(f, filtros));
    if (ordenarPorCreada) {
      encontradas = [...encontradas].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }
    if (modo === 'multi') return { data: encontradas, error: null };
    if (encontradas.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
    }
    return { data: modo === 'single' ? encontradas[0] : (encontradas[0] ?? null), error: null };
  }

  return q;
}

export function getSupabaseServer() {
  return { from: (tabla) => construir(tabla) };
}

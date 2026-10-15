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
const PRODUCT_LOCATION_INICIAL = [
  { id: 'l-test1', tenant_id: 'TEST1DS', company_id: 'c-test1', name: 'Estante A', is_active: true },
  { id: 'l-test2', tenant_id: 'TEST1DS', company_id: 'c-test2', name: 'Estante B', is_active: true },
  { id: 'l-sin-empresa', tenant_id: 'TEST1DS', company_id: null, name: 'Estante C', is_active: true },
  { id: 'l-angelos', tenant_id: 'ANGELOH7', company_id: 'c-angelos', name: 'Estante D', is_active: true },
];

export const PRODUCT_LOCATION = PRODUCT_LOCATION_INICIAL.map((f) => ({ ...f }));

export function reiniciarProductLocation() {
  PRODUCT_LOCATION.length = 0;
  PRODUCT_LOCATION.push(...PRODUCT_LOCATION_INICIAL.map((f) => ({ ...f })));
}

const TABLAS = { companies: COMPANIES, product_location: PRODUCT_LOCATION };

/** Consultas registradas, para comprobar que se filtraron por la columna correcta. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

/** `coincide`-era de `.eq()`: y de `.or('col.op.val,col.op.val,...')`. */
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
  let ordenarPorCreada = false;
  let verb = 'select';
  let patch = null;

  const q = {
    select() { return q; },
    update(p) { verb = 'update'; patch = p; return q; },
    delete() { verb = 'delete'; return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
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

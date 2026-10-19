// Supabase falso para probar las rutas SAR de `app/api/accounting/*`
// (sar-config, sar-session, det-upload, diat-upload, annual-tax-upload) contra
// el codigo REAL de las rutas y de `lib/tenant-resolver.ts`.
//
// Tablas: `companies` (para que el contexto resuelva) y `system_settings` (donde
// viven TODAS las claves SAR: `sar_config:*`, `annual_tax_sar_config:*`,
// `diat_sar_config:*`, `sar_session:*`, `diat_sar_last_upload:*`).
//
// El proposito es comprobar que esas claves se indexan por `companyId`
// (`companies.id`), NUNCA por tenant: test 1 y test 2 comparten `TEST1DS` y no
// pueden compartir sesion ni conexion al portal SAR.

export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', created_at: '2026-02-01T00:00:00Z' },
];

// Arranca vacio a proposito: en la base real el recon del 8 Oct 2026 encontro 0
// claves SAR, asi que aqui tambien se crean on-demand.
export const SYSTEM_SETTINGS = [];

let contadorId = 100;

export function reiniciar() {
  SYSTEM_SETTINGS.length = 0;
  contadorId = 100;
}

/** Consultas registradas, para comprobar que se filtro por empresa / clave. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

/** Atajo: la fila cruda de una clave, o undefined. */
export function leerClave(key) {
  return SYSTEM_SETTINGS.find((f) => String(f.key) === String(key));
}

/** Todas las claves presentes, para aserciones de aislamiento. */
export function claves() {
  return SYSTEM_SETTINGS.map((f) => String(f.key));
}

const TABLAS = { companies: COMPANIES, system_settings: SYSTEM_SETTINGS };

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

function insertar(tabla, filas) {
  const registros = Array.isArray(filas) ? filas : [filas];
  const creadas = registros.map((fila) => ({ id: fila.id || `gen-${contadorId++}`, ...fila }));
  TABLAS[tabla].push(...creadas);
  return { data: creadas, error: null };
}

function construir(tabla) {
  const filtros = [];
  const orConds = [];
  let inCond = null;
  let ordenarPorCreada = false;
  let verb = 'select';
  let patch = null;
  let payload = null;

  const q = {
    select() { return q; },
    update(p) { verb = 'update'; patch = p; return q; },
    delete() { verb = 'delete'; return q; },
    insert(v) { verb = 'insert'; payload = v; return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
    in(columna, valores) { inCond = { columna, valores: [...valores] }; return q; },
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
      inCond: inCond ? { ...inCond, valores: [...inCond.valores] } : null,
      ordenarPorCreada,
    });
    const filas = TABLAS[tabla];
    if (!filas) return { data: null, error: { message: `tabla desconocida: ${tabla}` } };

    if (verb === 'insert') return insertar(tabla, payload);

    let encontradas = filas.filter((f) => coincide(f, filtros, orConds));
    if (inCond) encontradas = encontradas.filter((f) => inCond.valores.includes(String(f[inCond.columna])));

    if (verb === 'update') {
      if (encontradas.length === 0) {
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

    if (modo === 'multi') return { data: candidatas, error: null };
    if (modo === 'single') {
      if (candidatas.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      }
      return { data: candidatas[0], error: null };
    }
    return { data: candidatas[0] ?? null, error: null };
  }

  return q;
}

export function getSupabaseServer() {
  return { from: (tabla) => construir(tabla) };
}

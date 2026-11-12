// Supabase falso para probar el contexto de empresa contra la tabla `companies`.
//
// Reproduce los dos caminos que usa `lib/tenant-resolver.ts`: buscar por
// `companies.id` (el `[id]` de la URL) y buscar por `companies.tenant_id` (el
// codigo del tenant), que devuelve la empresa MAS ANTIGUA. test 1 y test 2
// comparten `TEST1DS`, asi que ese segundo camino es justo el que mezclaba.

// test 1 (mas antigua) y test 2 (mas reciente) del mismo tenant.
export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', created_at: '2026-02-01T00:00:00Z' },
];

/** Consultas registradas, para comprobar que se filtraron por la columna correcta. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

function construir(tabla) {
  const filtros = [];
  let ordenarPorCreada = false;

  const q = {
    select() { return q; },
    eq(columna, valor) { filtros.push({ columna, valor }); return q; },
    limit() { return q; },
    order(columna, opciones) {
      if (columna === 'created_at' && opciones?.ascending === true) ordenarPorCreada = true;
      return q;
    },
    maybeSingle() { return resolver(); },
    single() { return resolver(); },
    then(onFulfilled, onRejected) { return resolver().then(onFulfilled, onRejected); },
  };

  async function resolver() {
    consultas.push({ tabla, filtros: filtros.map((f) => ({ ...f })), ordenarPorCreada });
    if (tabla !== 'companies') return { data: null, error: { message: `tabla desconocida: ${tabla}` } };

    let candidatas = COMPANIES.filter((f) =>
      filtros.every(({ columna, valor }) => String(f[columna]) === String(valor)));

    if (ordenarPorCreada) {
      candidatas = [...candidatas].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }

    const fila = candidatas[0] ?? null;
    // `maybeSingle` no es error cuando no hay fila: devuelve `data: null`.
    return { data: fila, error: null };
  }

  return q;
}

export function getSupabaseServer() {
  return { from: (tabla) => construir(tabla) };
}
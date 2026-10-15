// Supabase falso para probar las rutas `companies/[id]/costs` y
// `companies/[id]/custom-kpis` contra el codigo REAL de las rutas y de
// `lib/tenant-resolver.ts`.
//
// Tablas: `companies` (para que el contexto resuelva), `cost_payments` (con el
// UNIQUE viejo (tenant_id, cost_type, cost_key) EMULADO, que es el estado real
// de la base hasta que se aplique la 051) y `Transaction`.
//
// El unico proposito de emular el unique viejo es comprobar que la ruta NUNCA
// pisa la fila de la empresa hermana: el insert choca y devuelve 409.

export const COMPANIES = [
  { id: 'c-test1', tenant_id: 'TEST1DS', name: 'test 1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c-test2', tenant_id: 'TEST1DS', name: 'test 2', created_at: '2026-06-01T00:00:00Z' },
  { id: 'c-angelos', tenant_id: 'ANGELOH7', name: 'Angelos', created_at: '2026-02-01T00:00:00Z' },
];

// Con el unique (tenant_id, cost_type, cost_key) de COST_PAYMENTS.sql, dos
// empresas del MISMO tenant no pueden compartir clave: test 1 tiene "renta",
// test 2 "sueldo", y Angelos "renta" en su propio tenant.
const COST_PAYMENTS_INICIAL = [
  { id: 'k1', tenant_id: 'TEST1DS', company_id: 'c-test1', cost_type: 'fixed', cost_key: 'renta', amount: 1000, due_date: null },
  { id: 'k2', tenant_id: 'TEST1DS', company_id: 'c-test2', cost_type: 'fixed', cost_key: 'sueldo', amount: 2000, due_date: null },
  { id: 'k3', tenant_id: 'ANGELOH7', company_id: 'c-angelos', cost_type: 'fixed', cost_key: 'renta', amount: 999, due_date: null },
];

const TRANSACTION_INICIAL = [
  { id: 't1', tenant_id: 'TEST1DS', company_id: 'c-test1', voucherType: 'INGRESO', voucher_type: 'INGRESO', totalAmount: 50000, total_amount: 50000 },
  { id: 't2', tenant_id: 'TEST1DS', company_id: 'c-test2', voucherType: 'INGRESO', voucher_type: 'INGRESO', totalAmount: 90000, total_amount: 90000 },
  { id: 't3', tenant_id: 'ANGELOH7', company_id: 'c-angelos', voucherType: 'INGRESO', voucher_type: 'INGRESO', totalAmount: 10000, total_amount: 10000 },
];

export const COST_PAYMENTS = COST_PAYMENTS_INICIAL.map((f) => ({ ...f }));
export const TRANSACTION = TRANSACTION_INICIAL.map((f) => ({ ...f }));

let contadorId = 100;

export function reiniciar() {
  COST_PAYMENTS.length = 0;
  COST_PAYMENTS.push(...COST_PAYMENTS_INICIAL.map((f) => ({ ...f })));
  TRANSACTION.length = 0;
  TRANSACTION.push(...TRANSACTION_INICIAL.map((f) => ({ ...f })));
  contadorId = 100;
}

/** Consultas registradas, para comprobar que se filtraron por empresa. */
export const consultas = [];

export function limpiarConsultas() {
  consultas.length = 0;
}

const TABLAS = { companies: COMPANIES, cost_payments: COST_PAYMENTS, Transaction: TRANSACTION };

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
  if (tabla === 'cost_payments') {
    // UNIQUE (tenant_id, cost_type, cost_key), el de la base HOY.
    for (const nueva of registros) {
      const choque = TABLAS[tabla].some(
        (f) =>
          String(f.tenant_id) === String(nueva.tenant_id) &&
          String(f.cost_type) === String(nueva.cost_type) &&
          String(f.cost_key) === String(nueva.cost_key),
      );
      if (choque) {
        return {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        };
      }
    }
  }
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

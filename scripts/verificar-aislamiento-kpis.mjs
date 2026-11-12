// Prueba de que kpis/occupancy ya aíslan por empresa, sin need de sesion Clerk.
//
// Uso:  node scripts/verificar-aislamiento-kpis.mjs
//
// La pagina business-reports necesita sesion Clerk para decidir a que empresa
// pertenece el usuario, asi que aqui no se puede llamar a la ruta tal cual. Lo
// que se puede probar es lo que importaba: que las consultas de la ruta devuelven
// datos distintos para cada empresa.
//
// Para cada empresa hace LAS MISMAS consultas que la ruta, con el filtro bueno
// (company_id) y con el viejo (tenantId), y pone los numeros uno al lado del
// otro. Si el filtro viejo devuelve lo mismo para las dos empresas y el nuevo no,
// el bug era real y esta arreglado.
//
// Solo lectura.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { supabaseCliente } = require('./_supabase-env.js');

// Las dos empresas de prueba, que comparten tenant TEST1DS. Los IDs se leen de
// `companies`, no de memoria: test 2 es 971bec43-5c57-44a3-92b0-db7f909c5276.
const EMPRESAS = [
  ['test 1', '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'],
  ['test 2', '971bec43-5c57-44a3-92b0-db7f909c5276'],
];

const sb = supabaseCliente();

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

async function transacciones(companyId, filtro) {
  const q = sb
    .from('Transaction')
    .select('voucherType, voucher_type, totalAmount, total_amount')
    .gte('date', mesActual());
  const { data, error } = filtro === 'empresa' ? await q.eq('company_id', companyId) : await q.eq('tenantId', 'TEST1DS');
  if (error) return { error: `${error.code}` };
  let ingresos = 0;
  let egresos = 0;
  for (const t of data ?? []) {
    const v = t.voucherType || t.voucher_type;
    const monto = Number(t.totalAmount ?? t.total_amount ?? 0) / 100;
    if (v === 'INGRESO') ingresos += monto;
    else if (v === 'EGRESO') egresos += monto;
  }
  const r = (n) => Math.round(n * 100) / 100;
  return { n: data.length, ingresos: r(ingresos), egresos: r(egresos) };
}

async function facturas(companyId, filtro) {
  const q = sb.from('Invoice').select('id, total, status');
  const { data, error } = filtro === 'empresa' ? await q.eq('company_id', companyId) : await q.eq('tenantId', 'TEST1DS');
  if (error) return { error: `${error.code}` };
  const activas = (data ?? []).filter((f) => String(f.status).toLowerCase() !== 'cancelled');
  return {
    n: data.length,
    total: Math.round((activas.reduce((s, f) => s + Number(f.total ?? 0), 0) / 100) * 100) / 100,
  };
}

async function costos(companyId) {
  const { data, error } = await sb
    .from('cost_payments')
    .select('amount')
    .eq('company_id', companyId)
    .eq('cost_key', 'maintenance');
  if (error) return { error: `${error.code}` };
  return { n: data.length, total: Math.round((data.reduce((s, c) => s + Number(c.amount ?? 0), 0)) * 100) / 100 };
}

const fmt = (o) => (o.error ? `ERROR ${o.error}` : `${o.n} filas, ingresos ${o.ingresos}, egresos ${o.egresos}`);

console.log('Aislamiento de KPIs por empresa (mes en curso)');
console.log('=============================================');

const nuevo = [];
const viejo = [];
for (const [nombre, id] of EMPRESAS) {
  const tN = await transacciones(id, 'empresa');
  const fN = await facturas(id, 'empresa');
  const cN = await costos(id);
  const tV = await transacciones(id, 'tenant');
  const fV = await facturas(id, 'tenant');
  nuevo.push({ nombre, id, t: tN, f: fN, c: cN });
  viejo.push({ nombre, id, t: tV, f: fV });

  console.log(`\n${nombre}  ${id}`);
  console.log(`  con company_id (ahora):  tx ${fmt(tN)}`);
  console.log(`                           facturas ${fN.n}, total ${fN.total}`);
  console.log(`                           costos mantenimiento ${cN.error ? cN.error : cN.total}`);
  console.log(`  con tenantId (el bug):   tx ${fmt(tV)}`);
  console.log(`                           facturas ${fV.n}, total ${fV.total}`);
}

console.log('\n------------- Conclusion ------------');
const mismoNuevo = JSON.stringify(nuevo.map((x) => [x.t, x.f])) === JSON.stringify(nuevo.slice(0, 1).map(() => nuevo[0].t).concat([nuevo[0].f]).map(() => nuevo[0].t).concat([nuevo[0].f]).map((v) => v).slice(0, 0).concat([nuevo[0].t, nuevo[0].f]));
const difierenNuevo = JSON.stringify(nuevo[0].t) !== JSON.stringify(nuevo[1].t) || JSON.stringify(nuevo[0].f) !== JSON.stringify(nuevo[1].f);
const difierenViejo = JSON.stringify(viejo[0].t) !== JSON.stringify(viejo[1].t) || JSON.stringify(viejo[0].f) !== JSON.stringify(viejo[1].f);

console.log(`Con el filtro NUEVO (company_id) las dos empresas ${difierenNuevo ? 'DIFIEREN' : 'salen IGUALES'}.`);
console.log(`Con el filtro VIEJO (tenantId) ${difierenViejo ? 'difieren' : 'salen IGUALES'}.`);
console.log('');
if (!difierenNuevo && !difierenViejo) {
  console.log('Las dos empresas no tienen datos, asi que esta prueba no dice nada');
  console.log('sobre el aislamiento. Hay que mirar los datos de cada empresa.');
} else {
  console.log('Ojo con el alcance: esto comprueba las CONSULTAS, no la pagina.');
  console.log('Que la pagina pase la empresa correcta es lo que sigue sin verificar,');
  console.log('porque hace falta una sesion Clerk.');
}
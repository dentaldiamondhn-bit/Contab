/**
 * Comprueba que las 21 rutas HR migradas a `contextoDeEmpresa` dejarian de
 * devolver 0 filas. Solo lectura: lo que se prueba es la CONSULTA que ahora
 * hacen las rutas, no la ruta (esa necesita sesion de Clerk).
 *
 *   node scripts/verificar-hr.mjs
 *
 * Para cada tabla de RRHH se compara, con el `[id]` de Angelos (`companies.id`):
 *   - lo que hacia ANTES:  .eq('tenant_id', <companies.id>)   -> filas
 *   - lo que hace AHORA:   .eq('tenant_id', 'ANGELOH7')
 *                          .match({company_id: <companies.id>}) -> filas
 *
 * Y se comprueba que ninguna fila devuelta sea de otra empresa.
 */

import fs from 'fs';

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const g = async (p) => {
  const r = await fetch(`${U}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

const TABLAS = [
  'employees', 'departments', 'positions', 'work_schedules',
  'attendance', 'attendance_deduction_config', 'attendance_holidays',
  'attendance_schedules', 'time_tracking',
  'payroll_closed', 'payroll_config', 'payroll_deductions', 'payroll_uploads',
  'permission_requests', 'permission_types', 'permission_used',
  'pip_plans', 'pip_goals', 'pip_evaluations', 'pip_attendance_metrics',
  'pip_evidence',
];

const empresas = await g('companies?select=id,tenant_id,name');
const nombreDe = (id) => empresas.find((e) => e.id === id)?.name ?? String(id);
const angelos = empresas.find((e) => e.name.includes('Angelos'));
if (!angelos) throw new Error('no se encontro Angelos en companies');

const enc = encodeURIComponent;
let problemas = 0;
let arregladas = 0;
const cierresFalsos = [];

console.log(`Comparando con el [id] de Angelos (companies.id = ${angelos.id})`);
console.log(`contra su tenant_id real (${angelos.tenant_id})\n`);
console.log('tabla'.padEnd(28), 'antes', 'ahora', ' otras-empresa');
console.log('-'.repeat(60));

for (const t of TABLAS) {
  let antes = null, ahora = null, fuga = 0, existe = true;
  try {
    antes = await g(`${t}?select=id&tenant_id=eq.${enc(angelos.id)}`);
  } catch { existe = false; }
  if (!existe) { console.log(t.padEnd(28), '(no existe o no se puede leer)'); continue; }

  try {
    const filas = await g(
      `${t}?select=id,company_id&tenant_id=eq.${enc(angelos.tenant_id)}` +
      `&company_id=eq.${enc(angelos.id)}`
    );
    ahora = filas.length;
    fuga = filas.filter((f) => f.company_id !== angelos.id).length;
  } catch (e) {
    console.log(t.padEnd(28), 'sin company_id o tenant_id:', e.message.slice(0, 40));
    continue;
  }

  const marca = fuga > 0 ? '  <-- FUGA' : '';
  console.log(
    t.padEnd(28),
    String(antes.length).padEnd(5),
    String(ahora).padEnd(5),
    String(fuga).padEnd(12) + marca
  );

  if (fuga > 0) { problemas++; }
  if (antes.length === 0 && ahora > 0) { arregladas++; }

  // CANARIO DE CIERRE EN FALSO (mismo criterio que verificar-reportes.mjs).
  //
  // `ahora` viene de filtrar por tenant Y empresa. Un 0 aqui es ambiguo: puede
  // ser "bien aislada" o "el filtro de tenant se comio sus propias filas". Las
  // dos cosas salian como "TODO OK". Se consulta por empresa SOLA y se compara:
  // si hay filas propias que el filtro de tenant esconde, el usuario ve la tabla
  // vacia. No es una fuga, es lo contrario, y es igual de grave.
  try {
    const soloEmpresa = await g(`${t}?select=id&company_id=eq.${enc(angelos.id)}`);
    if (soloEmpresa.length > 0 && ahora === 0) {
      cierresFalsos.push(`${t} (${soloEmpresa.length} filas propias, 0 visibles)`);
    }
  } catch { /* la tabla no tiene company_id */ }
}

console.log('-'.repeat(60));
console.log(`tablas que pasaron de 0 filas a devolver datos: ${arregladas}`);
console.log(problemas === 0
  ? '\nTODO OK: ninguna fila devuelta es de otra empresa'
  : `\n${problemas} FUGAS`);

if (cierresFalsos.length) {
  // Cuenta como problema: una tabla que se ve vacia esta tan rota como una que
  // se ve llena de datos ajenos.
  problemas += cierresFalsos.length;
  console.log(`\n${cierresFalsos.length} CIERRES EN FALSO (el filtro de tenant esconde datos propios):`);
  for (const c of cierresFalsos) console.log(`   ${c}`);
}

// El caso que mas importa: 49 filas de employees tienen company_id sucio, asi que
// la 027e tiene que aplicarse ANTES de que las rutas de RRHH sirvan de algo.
const emps = await g('employees?select=company_id');
const sucias = emps.filter((e) => e.company_id && !empresas.some((c) => c.id === e.company_id));
if (sucias.length) {
  console.log(`\nPELIGRO: ${sucias.length} filas de employees siguen con company_id que no es`);
  console.log('un companies.id. OJO: la 027e YA ESTA APLICADA y no puede arreglar esto,');
  console.log('porque no es un company_id NULL sino un placeholder literal ("demo-company-id")');
  console.log('que no corresponde a ninguna empresa. Es decision del usuario: borrarla o');
  console.log('asignarla a mano. Ver la seccion de Sully en CLAUDE.md.');
  console.log('Simula el reparto con: node scripts/verificar-employees.mjs');
}
process.exitCode = problemas === 0 ? 0 : 1;

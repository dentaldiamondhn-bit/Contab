/**
 * Simula la 027e SIN escribir nada: calcula el reparto final de `employees` por
 * empresa aplicando exactamente la misma regla que la migracion.
 *
 *   node scripts/verificar-employees.mjs
 *
 * Solo lectura. Sirve para responder antes de aplicar: "que pasaria si la
 * corro?", en vez de aplicarla y averiguarlo despues.
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

const empresas = await g('companies?select=id,tenant_id,name');
const filas = await g('employees?select=id,email,first_name,company_id,tenant_id');

const nombreDe = (id) => empresas.find((e) => e.id === id)?.name ?? null;
const esValido = (cid) => empresas.some((e) => e.id === cid);

const sucias = filas.filter((f) => f.company_id && !esValido(f.company_id));
const limpias = filas.filter((f) => f.company_id && esValido(f.company_id));

console.log(`employees: ${filas.length} filas`);
console.log(`  company_id ya valido: ${limpias.length}`);
console.log(`  company_id invalido (a reparar): ${sucias.length}\n`);

let porEmpresa = new Map();
let sinEmpresa = [];
let ambiguas = 0;

for (const f of sucias) {
  if (!f.tenant_id) { sinEmpresa.push(f); continue; }
  const candidatas = empresas.filter((e) => e.tenant_id === f.tenant_id);
  if (candidatas.length === 1) {
    const n = nombreDe(candidatas[0].id);
    porEmpresa.set(n, (porEmpresa.get(n) ?? 0) + 1);
  } else if (candidatas.length > 1) {
    ambiguas++;
  } else {
    sinEmpresa.push(f);
  }
}

console.log('SIMULACION del reparto final:');
for (const [n, c] of porEmpresa) console.log(`  ${String(n).padEnd(26)} ${c} empleados`);
if (sinEmpresa.length) {
  console.log(`  SIN EMPRESA${' '.repeat(16)} ${sinEmpresa.length}  (no se tocan)`);
  for (const f of sinEmpresa) {
    console.log(`      ${f.email ?? '(sin email)'} ${f.first_name ?? ''} tenant_id=${f.tenant_id}`);
  }
}
if (ambiguas) console.log(`  AMBIGUAS${' '.repeat(17)} ${ambiguas}  (tenant con >1 empresa: la migracion las omite)`);

console.log(`\nfilas que quedan visibles en RRHH: ${porEmpresa.values().reduce((a, b) => a + b, 0)} de ${filas.length}`);

if (sinEmpresa.length) {
  console.log('\nAviso: las filas SIN EMPRESA no apareceran en las pantallas de RRHH.');
  console.log('Es lo correcto antes que atribuirlas a Angelos a ciegas, pero si son');
  console.log('empleados reales hay que saber de quien son y corregirlas a mano.');
}

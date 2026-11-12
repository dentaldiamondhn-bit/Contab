/**
 * Verifica el aislamiento por empresa contra la BD real. Solo usa PostgREST, asi
 * que funciona sin conexion directa a Postgres.
 *
 *   node scripts/verificar-aislamiento.mjs
 *
 * Es de solo lectura: no escribe nada.
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
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
};

const empresas = await g('companies?select=id,tenant_id,name,created_at');
const nombre = Object.fromEntries(empresas.map((e) => [e.id, e.name]));
// OJO: `companies.id` NO siempre es UUID. Clinica Dental Diamond usa un id de
// 24 caracteres, asi que la comprobacion es "esta en companies", no "parece UUID".
const esCompanyId = (v) => Object.prototype.hasOwnProperty.call(nombre, v);

const TABLAS = [
  'product', 'Invoice', 'InvoiceItem', 'cai', 'warehouse', 'Account',
  'Transaction', 'JournalEntry', 'Purchase', 'talonarios',
  'bankaccount', 'customer', 'inventory_movement', 'File', 'paymentlink',
];

let problemas = 0;
const avisar = (s) => { problemas++; console.log('  FALLA ' + s); };
const gSeguro = async (p) => { try { return await g(p); } catch { return []; } };

// Las columnas se sacan del OpenAPI de PostgREST y no de `select=*`: una tabla
// vacia (paymentlink tiene 0 filas) devuelve [] y pareceria que no tiene columnas,
// cuando si las tiene.
const spec = await (await fetch(`${U}/rest/v1/`, { headers: { ...H, Accept: 'application/openapi+json' } })).json();
const defs = spec.definitions || spec.components?.schemas || {};
const colsDe = (t) => {
  const d = defs[t];
  if (!d) return null;
  return Object.keys({ ...(d.allOf?.[0]?.properties || {}), ...(d.properties || {}) });
};

console.log('=== 1. La migracion 023 esta aplicada? ===\n');
const conColumna = [];
for (const t of TABLAS) {
  const c = colsDe(t);
  if (c === null) { console.log(`  --   ${t}: no existe`); continue; }
  if (!c.includes('company_id')) avisar(`${t} no tiene columna company_id -> falta la migracion 023`);
  else conColumna.push(t);
}
if (problemas === 0) console.log('  OK    todas las tablas tienen company_id');

console.log('\n=== 2. company_id apunta a una empresa real (no a un codigo de tenant) ===\n');
for (const t of conColumna) {
  const filas = await gSeguro(`${t}?select=company_id&limit=1000`);
  const conValor = filas.filter((f) => f.company_id);
  const malas = conValor.filter((f) => !esCompanyId(f.company_id));
  const nulos = filas.length - conValor.length;
  if (malas.length) avisar(`${t}: ${malas.length} con company_id que no existe en companies (ej. ${malas[0].company_id})`);
  else console.log(`  OK    ${t.padEnd(18)} ${conValor.length} con empresa, ${nulos} sin empresa`);
}

console.log('\n=== 3. Empresas que comparten tenant: comparten filas? ===\n');
const porTenant = {};
for (const e of empresas) (porTenant[e.tenant_id] ??= []).push(e);
for (const [tenant, lista] of Object.entries(porTenant)) {
  if (lista.length < 2) continue;
  console.log(`  tenant ${tenant} tiene ${lista.length} empresas:`);
  for (const e of lista) console.log(`    - ${e.name} (${e.id.slice(0, 8)})`);
  for (const t of ['product', 'Invoice', 'Account', 'cai', 'warehouse']) {
    const filas = await g(`${t}?select=company_id&limit=1000`);
    const de = Object.fromEntries(lista.map((e) => [e.id, 0]));
    let sin = 0;
    for (const f of filas) {
      if (f.company_id in de) de[f.company_id]++;
      else if (f.company_id) sin++;
    }
    const total = Object.values(de).reduce((a, b) => a + b, 0);
    const solapadas = Object.values(de).filter((n) => n > 0).length === lista.length && lista.every((e) => de[e.id] > 0);
    console.log(`    ${t.padEnd(11)} ${JSON.stringify(de)}${solapadas ? '  <-- las dos tienen filas' : ''}`);
    if (sin) console.log(`    ${t.padEnd(11)} ${sin} filas con company_id de otra empresa`);
  }
  console.log('');
}

console.log(`\n=== ${problemas === 0 ? 'TODO OK' : problemas + ' PROBLEMAS'} ===`);
if (problemas) console.log('Si falla el punto 1 o 2, aplica prisma/migrations/023_company_level_isolation.sql en el SQL Editor.');
process.exit(problemas ? 1 : 0);

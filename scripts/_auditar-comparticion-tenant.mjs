// Auditoria: donde puede test 1 y test 2 verse entre si.
//
// Premisa medida: test 1 (8143dd4e) y test 2 (971bec43) comparten TEST1DS pero
// son empresas SIN relacion. La unica frontera que las separa es `company_id`.
//
// NO modifica nada. Solo lectura.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const env = readFileSync(join(RAIZ, '.env.local'), 'utf8');
const val = (k) => (env.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm')) || [, ''])[1].trim();
const URL_ = val('NEXT_PUBLIC_SUPABASE_URL'), KEY = val('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const oa = await fetch(`${URL_}/rest/v1/`, { headers: { ...H, Accept: 'application/openapi+json' } }).then(r => r.json());
const props = oa.definitions ?? {};
const tablas = Object.keys(props).filter(k => !k.startsWith('+'));

const A = [], B = [], C = [];
for (const t of tablas) {
  const p = props[t].properties ?? {};
  const tieneCompany = 'company_id' in p;
  const tieneTenant = 'tenant_id' in p || 'tenantId' in p || 'tenantid' in p;
  if (tieneCompany) A.push(t);
  else if (tieneTenant) B.push(t);
  else C.push(t);
}

// ---------------------------------------------------------------------------
console.log('=== 1. CLASIFICACION DE LAS 221 SUPERFICIES ===');
console.log(`  A. CON company_id (separables):        ${A.length}`);
console.log(`  B. SOLO tenant_id (NO separables):      ${B.length}  ${B.join(', ')}`);
console.log(`  C. NI tenant NI company (hay que entrar por el padre): ${C.length}`);
console.log(`     ${C.slice(0, 14).join(', ')}${C.length > 14 ? ' ...' : ''}`);

// ---------------------------------------------------------------------------
console.log('\n=== 2. ¿DONDE HAY DATOS DE TEST1DS DE VERDAD? (riesgo vivo) ===\n');
const conDatos = [];
for (const t of [...B, ...C, ...A]) {
  const cols = Object.keys(props[t].properties ?? {});
  if (!cols.some(c => /^tenant_?id$/i.test(c) || c.toLowerCase() === 'tenantid')) continue;
  const r = await fetch(`${URL_}/rest/v1/${encodeURIComponent(t)}?select=*&tenant_id=eq.TEST1DS`, { headers: H });
  if (!r.ok) continue;
  const d = await r.json();
  if (Array.isArray(d) && d.length) conDatos.push({ t, n: d.length, cls: A.includes(t) ? 'A' : B.includes(t) ? 'B' : 'C' });
}
const porClase = { A: [], B: [], C: [] };
for (const x of conDatos) porClase[x.cls].push(x);
console.log(`  A. con company_id y filas de TEST1DS: ${porClase.A.length}`);
for (const x of porClase.A.sort((a, b) => b.n - a.n)) console.log(`       ${x.t.padEnd(42)} ${x.n} fila(s)`);
console.log(`\n  B. SIN company_id y filas de TEST1DS: ${porClase.B.length}`);
for (const x of porClase.B) console.log(`       ${x.t.padEnd(42)} ${x.n} fila(s)  <-- INSEPARABLES`);
console.log(`\n  C. sin ninguno y filas de TEST1DS: ${porClase.C.length}`);
for (const x of porClase.C) console.log(`       ${x.t.padEnd(42)} ${x.n} fila(s)`);

// ---------------------------------------------------------------------------
console.log('\n=== 3. RUTAS: ¿filtran por empresa o se quedan en el tenant? ===\n');
function recorrer(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) recorrer(p, acc);
    else if (e === 'route.ts' || e === 'route.tsx') acc.push(p);
  }
  return acc;
}
const rutas = recorrer(join(RAIZ, 'app', 'api'));
const conEmpresa = new Set(A);
const peligrosas = new Set([...porClase.B, ...porClase.C].map(x => x.t));

const filtranMal = [];
const tocanPeligrosas = [];
for (const p of rutas) {
  const t = readFileSync(p, 'utf8');
  const usaContexto = /contextoDeEmpresa|contextoDeEspacio|filtroEmpresa|exigirEmpresa|empresasDelUsuario/.test(t);
  for (const m of t.matchAll(/\.from\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g)) {
    const tabla = m[1];
    if (!props[tabla]) continue;
    const ctx = t.slice(Math.max(0, m.index - 700), m.index + 1000);
    const filtraEmpresa = /\.eq\(\s*['"`]company_id['"`]/.test(ctx);
    const filtraTenant = /\.eq\(\s*['"`]tenant_?id['"`]/.test(ctx);
    const usaEmpresa = /empresa\.companyId|filtroEmpresaOCompany|companyIdDeRuta/.test(ctx);
    const reg = relative(RAIZ, p).replace(/\\/g, '/');
    // Peligro real: la tabla tiene filas de las dos empresas y la ruta no separa.
    if (peligrosas.has(tabla) && !usaContexto) {
      tocanPeligrosas.push({ reg, tabla, usaContexto });
    } else if ((conEmpresa.has(tabla) || porClase.A.some((x) => x.t === tabla))
      && !filtraEmpresa && filtraTenant && !usaEmpresa && !usaContexto) {
      filtranMal.push({ reg, tabla, filtraTenant });
    }
  }
}
const uniq = (a) => [...new Map(a.map(x => [x.reg + x.tabla, x])).values()];
for (const h of uniq(tocanPeligrosas)) {
  console.log(`  PELIGRO  ${h.reg}`);
  console.log(`           -> ${h.tabla} (sin company_id) y sin contexto validado`);
}
if (!tocanPeligrosas.length) console.log('  ninguna ruta toca una superficie sin company_id sin contexto validado');
console.log('');
for (const h of uniq(filtranMal)) {
  console.log(`  SOLO TENANT  ${h.reg}`);
  console.log(`           -> ${h.tabla}`);
}
if (!filtranMal.length) console.log('  ninguna ruta se queda en el tenant teniendo tabla con company_id');
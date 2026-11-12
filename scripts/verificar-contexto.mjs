// Verifica el estado del contexto por rol (migraciones 024/025/026).
// Solo lectura: va por PostgREST, no toca la BD. Se ejecuta igual que
// verificar-aislamiento.mjs, con node scripts/verificar-contexto.mjs
import fs from 'fs';
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const spec = await (await fetch(`${U}/rest/v1/`, { headers: { ...H, Accept: 'application/openapi+json' } })).json();
const defs = spec.definitions || spec.components?.schemas || {};
const info = (t) => { const d = defs[t]; return d ? { ...(d.allOf?.[0]?.properties || {}), ...(d.properties || {}) } : null; };
const req = (t) => { const d = defs[t]; return d ? new Set([...(d.allOf?.[0]?.required || []), ...(d.required || [])]) : new Set(); };
const g = async (p) => { const r = await fetch(`${U}/rest/v1/${p}`, { headers: H }); return r.ok ? await r.json() : null; };
// PostgREST marca la PK como required en una tabla; una vista no tiene ninguna
const esTabla = (t) => info(t) !== null && req(t).size > 0;

const lineas = [];
const say = (s = '') => { console.log(s); lineas.push(s); };
const problemas = [];

say('=== 1. Tablas nuevas (024) ===');
for (const t of ['company_location', 'user_company_access']) {
  if (!info(t)) { say(`  ${t}: NO EXISTE -> la 024 no esta aplicada`); problemas.push(`${t} falta`); }
  else say(`  ${t}: existe, ${Object.keys(info(t)).length} columnas`);
}

say('\n=== 2. company_id: cobertura (025) ===');
const todas = Object.keys(defs);
const negocio = todas.filter((t) => !/^(Tenant|Tenants|User|companies|admin_|global_|system_|has_|permission|login_|password_|audit)/i.test(t));
const conCI = negocio.filter((t) => 'company_id' in (info(t) || {}));
const sinCI = negocio.filter((t) => !('company_id' in (info(t) || {})));
const sinTabla = sinCI.filter((t) => esTabla(t));
const sinVista = sinCI.filter((t) => !esTabla(t));
say(`  con company_id: ${conCI.length}`);
say(`  sin company_id, parecen TABLAS: ${sinTabla.length}`);
say(`  sin company_id, parecen VISTAS: ${sinVista.length}`);
if (sinTabla.length) {
  say('    ' + sinTabla.sort().join(', '));
  problemas.push(`${sinTabla.length} tablas sin company_id`);
}
if (sinVista.length) say('    ' + sinVista.sort().join(', '));
if (sinVista.length) {
  say('    OJO: este reparto tabla/vista se estima por si PostgREST marca una PK como required.');
  say('    No es fiable al 100% (las tablas creadas con CREATE TABLE AS, como los');
  say('    _backup_*, no tienen PK y parecen vistas). La fuente que manda son los');
  say('    RAISE NOTICE de la 025, que consulta pg_class.relkind directamente.');
}

say('\n=== 3. location_id (026) ===');
const trans = ['Transaction', 'Invoice', 'Purchase', 'inventory_movement', 'BookClosing', 'Reconciliation', 'AccountReceivable', 'period_locks'];
const conL = trans.filter((t) => info(t) && 'location_id' in info(t));
const sinL = trans.filter((t) => info(t) && !('location_id' in info(t)));
say(`  con location_id: ${conL.length}/${trans.filter((t) => info(t)).length}`);
if (sinL.length) { say('    sin location_id: ' + sinL.join(', ')); problemas.push(`${sinL.length} transaccionales sin location_id`); }

say('\n=== 4. Sedes ===');
const locs = await g('company_location?select=company_id,code,name,is_default&order=company_id');
const comps = await g('companies?select=id,name,tenant_id');
const nombre = Object.fromEntries((comps || []).map((c) => [c.id, c.name]));
if (Array.isArray(locs)) {
  for (const l of locs) say(`  ${nombre[l.company_id] || l.company_id} -> ${l.code} (${l.name})${l.is_default ? '  [por defecto]' : ''}`);
  const sinSede = (comps || []).filter((c) => !locs.some((l) => l.company_id === c.id));
  if (sinSede.length) say(`  empresas SIN sede: ${sinSede.map((c) => c.name).join(', ')}`);
} else say('  (la tabla no existe todavia)');

say('\n=== 5. Membresia user_company_access ===');
const acc = await g('user_company_access?select=user_id,company_id,relationship,is_default');
if (Array.isArray(acc)) {
  const comps = await g('companies?select=id,name');
  const usr = await g('User?select=id,email,role,tenantid');
  const cn = Object.fromEntries((comps || []).map((c) => [c.id, c.name]));
  const un = Object.fromEntries((usr || []).map((u) => [u.id, u.email]));
  for (const a of acc) say(`  ${(un[a.user_id] || a.user_id).padEnd(30)} -> ${(cn[a.company_id] || a.company_id).padEnd(40)} ${a.relationship}${a.is_default ? ' [defecto]' : ''}`);
  // Un contador es un USUARIO con 2+ empresas, no una fila. Contar filas
  // daba un falso positivo: el mismo contador aparecia N veces y se contaba
  // como N contadores distintos.
  const porUsuario = {};
  for (const a of acc.filter((x) => x.relationship === 'accountant')) (porUsuario[a.user_id] ??= []).push(a.company_id);
  const contadores = Object.entries(porUsuario).filter(([, cs]) => cs.length > 1);
  const duenos = acc.filter((a) => a.relationship === 'owner');
  say(`\n  empresarios (1 empresa): ${duenos.length}`);
  say(`  contadores (2+ empresas): ${contadores.length}`);
  for (const [uid, cs] of contadores) say(`    ${un[uid] || uid}: ${cs.length} empresas`);
  if (!contadores.length) problemas.push('ningun contador con 2+ empresas todavia');
} else say('  (la tabla no existe todavia)');

say('\n=== 6. Empresas sin membresia: NADIE puede entrar ===');
const sinAcc = (comps || []).filter((c) => !(acc || []).some((a) => a.company_id === c.id));
if (sinAcc.length) { for (const c of sinAcc) say(`  ${c.name} (${c.tenant_id})`); problemas.push(`${sinAcc.length} empresas sin membresia`); }
else say('  ninguna');

say('\n' + '='.repeat(56));
if (problemas.length) { say('PENDIENTES:'); for (const p of problemas) say('  - ' + p); }
else say('TODO OK: contexto de rol completo.');
console.log('\n' + (problemas.length ? 'Conclusion: AUN NO esta listo.' : 'Conclusion: listo.'));

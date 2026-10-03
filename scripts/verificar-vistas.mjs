/**
 * Verificacion de la 027 (vistas contables aisladas por company_id).
 *
 * SOLO LECTURA. No escribe nada.
 *
 * Comprueba dos cosas distintas, y no las confunde:
 *   1. Que las 25 vistas EXPONGAN `company_id`. Sin esa columna en el SELECT,
 *      PostgREST no puede filtrarlas: no hay por donde. Que la vista exista no
 *      basta, tiene que ofrecer la columna.
 *   2. Que el filtro por `company_id` devuelva EXACTAMENTE las mismas filas que
 *      la tabla base. Si la vista duplica, pierde o reasigna filas, el conteo no
 *      cuadra y sale por aqui.
 *
 * OJO con el conteo: cuando el resultado es vacio, PostgREST no devuelve
 * `0-0/0` sino un content-range con dos asteriscos. Parsear eso con
 * `split('/')[1]` da `NaN`, y un `NaN` falsy hace que una consulta CON DATOS
 * parezca vacia. Hay que mirar el status y el cuerpo, no solo el header. Ya
 * fallo una vez por esto y parecio que la 027 habia roto el filtro.
 *
 * Uso: node scripts/verificar-vistas.mjs
 */
import fs from 'fs';
import path from 'path';

for (const l of fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) { console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'); process.exit(1); }
const H = { apikey: K, Authorization: `Bearer ${K}` };

async function pedir(ruta) {
  const r = await fetch(`${U}/rest/v1/${ruta}`, { headers: H });
  if (!r.ok) throw new Error(`${ruta} -> HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

async function contar(ruta) {
  const filas = await pedir(ruta);
  return Array.isArray(filas) ? filas.length : 0;
}

const VISTAS = [
  'balance_general', 'balanza_comprobacion', 'libro_mayor', 'estado_resultados',
  'resumen_contable', 'libro_diario', 'libro_diario_honduras', 'v_transacciones_cierre',
  'libro_ventas', 'libro_compras', 'cuentas_por_cobrar', 'cuentas_por_pagar',
  'InvoiceSummary', 'declaracion_mensual', 'resumen_isv', 'top_clientes',
  'purchase_book_sar', 'accounts_payable_pending', 'flujo_efectivo_mensual',
  'vista_resumen_cuentas', 'inventario_valorizado', 'inventory_stock_alert',
  'vista_estado_resultados_detallado', 'vista_resumen_estado_resultados',
  'vista_comparativo_mensual',
];

// Las vistas que se pueden contrastar contra su tabla base: (vista, tabla, filtro)
const CONTRASTE = [
  ['libro_ventas', 'Invoice?invoiceType=eq.CUSTOMER&status=neq.CANCELLED'],
  ['libro_compras', 'Invoice?invoiceType=eq.EXPENSE&status=neq.CANCELLED'],
  ['inventario_valorizado', 'product?is_active=eq.true'],
  ['vista_resumen_cuentas', null], // agrupada: no se contrasta 1:1
];

let fallos = 0;

console.log('='.repeat(78));
console.log('1. Las vistas exponen company_id (sin la columna, no se pueden filtrar)');
console.log('='.repeat(78));
for (const v of VISTAS) {
  try {
    await pedir(`${v}?select=company_id&limit=1`);
    process.stdout.write('.');
  } catch (e) {
    console.log(`\n  FALLA ${v}: ${e.message}`);
    fallos++;
  }
}
console.log(`\n  ${VISTAS.length - fallos}/${VISTAS.length} ok`);

console.log('\n' + '='.repeat(78));
console.log('2. El filtro por company_id devuelve lo mismo que la tabla base');
console.log('='.repeat(78));
const empresas = await pedir('companies?select=id,name,rtn&order=name');
for (const [vista, filtroBase] of CONTRASTE) {
  if (!filtroBase) { console.log(`  ${vista}: agrupada, no se contrasta 1:1`); continue; }
  for (const c of empresas) {
    const enVista = await contar(`${vista}?company_id=eq.${c.id}`);
    const enTabla = await contar(`${filtroBase}&company_id=eq.${c.id}`);
    if (enTabla === 0 && enVista === 0) continue;
    const ok = enVista === enTabla;
    if (!ok) fallos++;
    console.log(`  ${ok ? 'OK  ' : '*** MAL ***'} ${vista} / ${c.name}: vista=${enVista} tabla=${enTabla}`);
  }
}

console.log('\n' + '='.repeat(78));
console.log('3. Ninguna fila de la vista queda con company_id NULL');
console.log('='.repeat(78));
// Se espera que balance_general tenga NULLs: son las 8 cuentas huerfanas de los
// tenants tenant_001 / default-tenant, que no existen en companies. Se listan
// para que sean visibles y no pasen por un fallo nuevo.
for (const v of ['balance_general', 'libro_ventas', 'libro_mayor']) {
  const filas = await pedir(`${v}?select=company_id&limit=2000`);
  const nulos = filas.filter((f) => f.company_id === null).length;
  const porEmpresa = {};
  for (const f of filas) porEmpresa[f.company_id ?? 'NULL'] = (porEmpresa[f.company_id ?? 'NULL'] || 0) + 1;
  console.log(`  ${v}: ${nulos} fila(s) sin company_id de ${filas.length}`);
  console.log(`     por empresa: ${JSON.stringify(porEmpresa)}`);
}
console.log('  Las NULL de balance_general/libro_mayor son las cuentas huerfanas de');
console.log('  tenant_001 y default-tenant. Hay que borrarlas o atribuirlas a mano.');

console.log('\n' + '='.repeat(78));
console.log('4. La vista NO es la frontera: la ruta tiene que filtrar');
console.log('='.repeat(78));
const sinFiltro = await contar('libro_ventas');
const porEmpresa = await pedir('libro_ventas?select=company_id&limit=2000');
const distintas = new Set(porEmpresa.map((f) => f.company_id)).size;
console.log(`  libro_ventas sin filtrar: ${sinFiltro} fila(s) de ${distintas} empresa(s).`);
console.log('  El servicio usa SERVICE_ROLE_KEY, que salta el RLS: security_invoker');
console.log('  tampoco protege. Sin .eq("company_id", empresa.companyId) en la ruta,');
console.log('  el reporte sigue mostrando TODAS las empresas.');

console.log('\n' + '='.repeat(78));
console.log(fallos === 0 ? 'RESULTADO: TODO OK' : `RESULTADO: ${fallos} FALLO(S)`);
console.log('='.repeat(78));
process.exit(fallos === 0 ? 0 : 1);

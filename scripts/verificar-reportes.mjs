/**
 * Verifica que el filtro que ahora usan las 9 rutas de app/api/reports/* aísla de
 * verdad, contra la BD real. Solo lectura.
 *
 *   node scripts/verificar-reportes.mjs
 *
 * TRES comprobaciones, y una advertencia sobre lo que NO se puede probar:
 *
 * 1) ¿La vista expone `company_id`? Sin esa columna el `.match()` no puede
 *    filtrar. Se mira el OpenAPI de PostgREST, no una fila de muestra: si la
 *    vista esta vacia no hay fila de la que sacar las claves, y dar por buena
 *    una vista sin datos es como se "@TODO OK" sin haber nada que comparar.
 *
 * 2) ¿Cada fila devuelta con el filtro nuevo es de la empresa pedida? Esto si se
 *    puede probar donde hay datos.
 *
 * 3) ¿El filtro VIEJO (solo `tenant_id`) estaba viendo empresas que no eran la
 *    del cliente? Se cuenta cuantas empresas distintas aparecen al filtrar solo
 *    por tenant: si son >1, el filtro viejo mezclaba empresas.
 *
 * LO QUE ESTE SCRIPT NO PUEDE PROBAR (y no debe decir que prueba):
 * el caso interesante es `TEST1DS`, que tiene "test 1" y "test 2" en el mismo
 * tenant, donde el filtro por tenant no puede separar. Hoy **ninguna de las dos
 * tiene filas en estas vistas**, asi que ahi no hay nada que comparar: el
 * aislamiento de test 1 frente a test 2 queda sin demostrar hasta que se carguen
 * datos de la segunda empresa.
 */

import fs from 'fs';

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const g = async (p, extra = {}) => {
  const r = await fetch(`${U}/rest/v1/${p}`, { headers: { ...H, ...extra } });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

const VISTAS = [
  'balanza_comprobacion', 'declaracion_mensual', 'estado_resultados',
  'flujo_efectivo_mensual', 'libro_compras', 'libro_diario', 'libro_ventas',
  'resumen_isv', 'top_clientes',
];

const empresas = await g('companies?select=id,tenant_id,name');
const nombreDe = (id) => empresas.find((e) => e.id === id)?.name ?? String(id);

let problemas = 0;
let sinPruebas = 0;
const avisar = (s) => { problemas++; console.log('    FALLA ' + s); };
const gSeguro = async (p) => { try { return await g(p); } catch { return null; } };

// (1) Columnas reales de cada vista segun el OpenAPI. No depende de que haya filas.
const spec = await g('', { Accept: 'application/openapi+json' });
const columnas = (v) => Object.keys(spec.definitions?.[v]?.properties ?? {});

// tenant -> empresas que lo comparten
const porTenant = {};
for (const e of empresas) if (e.tenant_id) (porTenant[e.tenant_id] ||= []).push(e);
const tenantsCompartidos = Object.entries(porTenant).filter(([, g]) => g.length > 1);

console.log(`Empresas: ${empresas.length}. Tenants con mas de una empresa: ` +
  (tenantsCompartidos.length
    ? tenantsCompartidos.map(([t, g]) => `${t} (${g.map((e) => e.name).join(', ')})`).join('; ')
    : 'ninguno'));

for (const vista of VISTAS) {
  console.log(`\n${vista}`);

  const cols = columnas(vista);
  const tieneCompany = cols.includes('company_id');
  const tieneTenant = cols.includes('tenant_id');
  console.log(`    columnas segun OpenAPI: ${cols.length}` +
    `  company_id: ${tieneCompany ? 'si' : 'NO'}  tenant_id: ${tieneTenant ? 'si' : 'NO'}`);
  if (!tieneCompany) avisar(`${vista}: no expone company_id, el filtro por empresa no puede funcionar`);
  if (!tieneTenant) avisar(`${vista}: no expone tenant_id, la ruta no puede ni acotar por tenant`);

  // (3) Superficie de fuga del filtro viejo: cuantas empresas distintas se ven
  //     filtrando solo por tenant.
  const empresasPorVista = {};
  for (const [tid, grupo] of Object.entries(porTenant)) {
    const filas = await gSeguro(`${vista}?select=company_id&tenant_id=eq.${encodeURIComponent(tid)}`);
    if (!filas) continue;
    const distintas = [...new Set(filas.map((f) => f.company_id))];
    empresasPorVista[tid] = { grupo, filas: filas.length, distintas };
    if (distintas.length > 1) {
      console.log(`    filtro VIEJO en tenant ${tid} (${grupo.map((e) => e.name).join(' / ')}): ` +
        `${filas.length} filas de ${distintas.length} empresas distintas -> ` +
        `MEZCLA: ${distintas.map(nombreDe).join(', ')}`);
    }
  }

  // (2) Con el filtro nuevo, cada fila es de la empresa pedida.
  let filasTotales = 0;
  for (const e of empresas) {
    if (!e.tenant_id) continue;
    const filas = await gSeguro(
      `${vista}?select=*&tenant_id=eq.${encodeURIComponent(e.tenant_id)}` +
      `&company_id=eq.${encodeURIComponent(e.id)}`
    );
    if (!filas) continue;
    filasTotales += filas.length;
    for (const f of filas) {
      if (f.company_id !== e.id) avisar(`${vista}: ${e.name} recibio una fila de ${nombreDe(f.company_id)}`);
    }
  }
  console.log(`    filtro NUEVO: ${filasTotales} filas en total, 0 de otra empresa` +
    (filasTotales > 0 ? ' (comprobado)' : ' (SIN DATOS: no demuestra nada)'));
  if (filasTotales === 0) sinPruebas++;

  // (2b) CANARIO DE CIERRE EN FALSO.
  //
  // Los filtros de arriba son tenant Y empresa. Si una empresa tiene filas
  // PROPIAS pero el filtro de tenant las borra, el resultado es 0 filas, y un
  // 0 asi es INDISTINGUIBLE de "esta bien aislada": en los dos casos el script
  // reportaba "0 fugas" y "TODO OK".
  //
  // Asi que se consulta la vista por empresa SOLA y se compara. Si
  // `porEmpresa > 0` y `conFiltro === 0`, la vista tiene filas de esa empresa
  // que el filtro de tenant esconde: el reporte le sale VACIO a un usuario que
  // si tiene datos. No es una fuga, es lo contrario, y es igual de grave.
  //
  // Esto ya ha pasado de verdad: `libro_diario` exponia `t.tenant_id` (la
  // columna snake, que la 027b2 dejo en NULL a proposito para test 1) en vez
  // de `t."tenantId"`. test 1 tenia 6 asientos y la vista devolvia 0 filas.
  // Lo corrige la 027f. Este canario es lo que lo habria detectado.
  const empresasConFiltroVacio = [];
  for (const e of empresas) {
    if (!e.tenant_id) continue;
    const soloEmpresa = await gSeguro(
      `${vista}?select=company_id&company_id=eq.${encodeURIComponent(e.id)}`
    );
    const n = soloEmpresa?.length ?? 0;
    if (n === 0) continue; // sin datos de base: no dice nada

    const conFiltro = await gSeguro(
      `${vista}?select=company_id&tenant_id=eq.${encodeURIComponent(e.tenant_id)}` +
      `&company_id=eq.${encodeURIComponent(e.id)}`
    );
    if ((conFiltro?.length ?? 0) === 0) {
      empresasConFiltroVacio.push(`${e.name} (${n} filas propias, 0 visibles)`);
    }
  }
  if (empresasConFiltroVacio.length) {
    avisar(`${vista}: CIERRE EN FALSO, el filtro de tenant esconde datos propios -> ` +
      empresasConFiltroVacio.join(', ') +
      '. Revisar que columna de tenant expone la vista (027f).');
  }

  // El caso que de verdad importa: dos empresas en el MISMO tenant.
  for (const [tid, grupo] of tenantsCompartidos) {
    const counts = [];
    for (const e of grupo) {
      const filas = await gSeguro(
        `${vista}?select=*&tenant_id=eq.${encodeURIComponent(tid)}` +
        `&company_id=eq.${encodeURIComponent(e.id)}`
      );
      counts.push([e.name, filas?.length ?? 0]);
    }
    const conDatos = counts.some(([, n]) => n > 0);
    console.log(`    tenant ${tid} (${grupo.map((e) => e.name).join(' / ')}): ` +
      counts.map(([n, c]) => `${n}=${c}`).join('  ') +
      (conDatos
        ? (counts[0][1] === counts[1][1] && counts[0][1] > 0
            ? '  <-- SOSPECHOSO: mismo numero para dos empresas'
            : '  (distintas, aislado)')
        : '  SIN DATOS: el aislamiento entre estas dos empresas NO queda demostrado'));
  }
}

console.log(`\n${problemas === 0 ? 'TODO OK' : problemas + ' FALLAS'}` +
  ` (vistas sin datos: ${sinPruebas}/${VISTAS.length})`);
if (sinPruebas > 0) {
  console.log('Aviso: ' + sinPruebas + ' vista(s)/devoluciones sin filas. Para esas, "0 fugas" ' +
    'no es evidencia: hay que cargar datos de una segunda empresa y volver a correr esto.');
}
process.exitCode = problemas === 0 ? 0 : 1;

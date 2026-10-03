// Auditor ESTATICO de las rutas: quais filtran por tenant y NO por empresa.
// Solo lee archivos. No toca la base ni el codigo.
//
// Heuristica deliberately conservadora: una ruta se marca como sospechosa si
// filtra por alguna columna de tenant Y no usa ninguno de los mecanismos de
// empresa del proyecto. No intenta ser un parser de TS.
import fs from 'fs';
import path from 'path';

const RAIZ = 'app';

const MECANISMOS_EMPRESA = [
  'contextoDeEmpresa', 'contextoDeEspacio', 'filtroEmpresaOCompany',
  'empresaDesde', 'withEmpresa', 'resolveCompanyId',
];
const COLS_TENANT = ['tenant_id', 'tenantId', 'tenantid'];
const COLS_EMPRESA = ['company_id', 'companyId'];

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === 'route.ts') acc.push(p);
  }
  return acc;
}

const rutas = walk(RAIZ);
const filas = [];

for (const r of rutas) {
  const src = fs.readFileSync(r, 'utf8');
  const usaTenant = COLS_TENANT.some((c) =>
    new RegExp(`\\.eq\\(\\s*['"\`]${c}['"\`]`).test(src) ||
    new RegExp(`\\.filter\\([^)]*['"\`]${c}['"\`]`).test(src) ||
    new RegExp(`\\b${c}\\s*:`).test(src));
  if (!usaTenant) continue;

  const usaMec = MECANISMOS_EMPRESA.filter((m) => src.includes(m));
  const usaColEmp = COLS_EMPRESA.filter((c) => src.includes(c));
  // Cuantos .eq de tenant hay, para ver si es una ruta de una consulta o muchas
  const nFiltrosTenant = (src.match(/\.eq\(\s*['"`]tenant_?[iI]?d['"`]/g) || []).length;

  filas.push({
    ruta: r.replace(/\\/g, '/'),
    filtrosTenant: nFiltrosTenant,
    mecanismo: usaMec,
    columnaEmpresa: usaColEmp,
  });
}

const soloTenant = filas.filter((f) => f.mecanismo.length === 0 && f.columnaEmpresa.length === 0);
const conAlgo = filas.filter((f) => f.mecanismo.length > 0 || f.columnaEmpresa.length > 0);

console.log(`Rutas con filtro de tenant: ${filas.length} de ${rutas.length} totales\n`);
console.log(`  SIN nada de empresa  -> ${soloTenant.length}`);
console.log(`  CON algo de empresa  -> ${conAlgo.length}\n`);

console.log('=== SIN filtro de empresa (revisar una por una) ===');
soloTenant.sort((a, b) => b.filtrosTenant - a.filtrosTenant);
for (const f of soloTenant) {
  console.log(`  ${String(f.filtrosTenant).padStart(2)} x tenant   ${f.ruta}`);
}

console.log('\n=== CON empresa (verificar que cubra TODAS las consultas, no solo algunas) ===');
for (const f of conAlgo.sort((a, b) => b.filtrosTenant - a.filtrosTenant)) {
  const como = [...f.mecanismo, ...f.columnaEmpresa].join(',');
  console.log(`  ${String(f.filtrosTenant).padStart(2)} x tenant   ${f.ruta}`);
  console.log(`                    usa: ${como}`);
}

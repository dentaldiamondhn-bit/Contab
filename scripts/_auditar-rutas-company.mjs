// Audita las rutas de `app/api/companies/[id]/**`: comprueba si el `[id]` de la
// ruta se usa SOLO para el tenant y no tambien para `company_id`.
//
// Por que existe: test 1 y test 2 comparten `TEST1DS`. Una ruta que resuelve el
// tenant desde el `[id]` y filtra solo por `tenantId` devuelve **lo mismo** para
// las dos empresas. Ese filtro agrupa; el que aísla es `company_id`.
//
// NO modifica nada. Solo lectura sobre el codigo.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const BASE = join(RAIZ, 'app', 'api', 'companies', '[id]');

// `[id]` es un patron de glob, asi que globSync no lo encuentra: se recorre a mano.
function recorrer(dir, acc = []) {
  for (const entrada of readdirSync(dir)) {
    const p = join(dir, entrada);
    if (statSync(p).isDirectory()) recorrer(p, acc);
    else if (entrada === 'route.ts') acc.push(relative(BASE, p).replace(/\\/g, '/'));
  }
  return acc;
}

const rutas = recorrer(BASE).sort();

const filas = [];
for (const r of rutas) {
  const t = readFileSync(join(BASE, r), 'utf8');
  const usaContexto = /contextoDeEmpresa|filtroEmpresa|exigirEmpresa/.test(t);
  const filtraCompany = /\.eq\(\s*['"`]company_id['"`]/.test(t);
  const filtraTenant = /\.eq\(\s*['"`]tenant(Id|_id)['"`]/.test(t);
  const resuelveTenant = /tenantFromCompanyId|companies\?tenant/.test(t);
  const leeIdRuta = /await params/.test(t);

  // Sospechoso: usa el `[id]` para el tenant, filtra por tenant y NO por empresa.
  const sospechoso =
    !usaContexto && filtraTenant && !filtraCompany && (resuelveTenant || leeIdRuta);

  filas.push({ r, usaContexto, filtraCompany, filtraTenant, resuelveTenant, sospechoso });
}

const sospech = filas.filter((f) => f.sospechoso);
const ok = filas.filter((f) => f.usaContexto || f.filtraCompany);

console.log(`Rutas bajo app/api/companies/[id]: ${filas.length}\n`);

console.log(`AISLADAS por contexto o por company_id: ${ok.length}`);
for (const f of ok) console.log(`  ok      ${f.r}`);

console.log(`\nREVISAR (filtran por tenant y no por empresa): ${sospech.length}`);
for (const f of sospech) {
  console.log(`  SOSPECHOSA ${f.r}`);
  console.log(`     contexto=${f.usaContexto} company_id=${f.filtraCompany} tenant=${f.filtraTenant} resuelveTenant=${f.resuelveTenant}`);
}

const sinContexto = filas.filter((f) => !f.usaContexto).length;
console.log(`\nResumen: ${filas.length} rutas | sin contexto validado: ${sinContexto} | sospechosas: ${sospech.length}`);
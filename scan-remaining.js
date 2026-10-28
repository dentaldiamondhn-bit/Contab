const fs = require('fs');
const path = require('path');

const routes = [
  'app/api/dashboard/inventory-stats/route.ts',
  'app/api/purchase-book/route.ts', 
  'app/api/purchases/route-original.ts'
];

routes.forEach(r => {
  const fullPath = path.join(process.cwd(), r);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasContextoDeEmpresa = content.includes('contextoDeEmpresa');
    const hasFiltroEmpresaOCompany = content.includes('filtroEmpresaOCompany');
    const hasEqTenantId = content.includes("eq('tenant_id'");
    const usesCompanyId = content.includes('company_id');
    
    let status;
    if (hasContextoDeEmpresa && hasFiltroEmpresaOCompany) status = 'ISOLATED';
    else if (hasContextoDeEmpresa && !hasFiltroEmpresaOCompany && hasEqTenantId) status = 'TENANT_ONLY';
    else if (!hasContextoDeEmpresa && !hasEqTenantId) status = 'NO_ISOLATION';
    else status = 'CHECK';
    
    console.log(r + ': ' + status + ' - contexto: ' + hasContextoDeEmpresa + ', filtro: ' + hasFiltroEmpresaOCompany + ', tenant_id: ' + hasEqTenantId + ', company_id: ' + usesCompanyId);
  } catch(e) {
    console.log(r + ': ERROR - ' + e.message);
  }
});
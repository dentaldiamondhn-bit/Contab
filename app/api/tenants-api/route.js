import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';
/** @typedef {import('@/types/tenants').TenantJoinResult} TenantJoinResult */
/** @typedef {import('@/types/tenants').EnrichedTenant} EnrichedTenant */

export async function GET(request) {
  try {
    console.log('API: Loading tenants with enriched data from database...');

    const supabase = createServiceRoleClient();

    // 1. Cargamos tenants y companies por separado para evitar el error PGRST200 (falta de FK)
    // Usamos 'Tenant' (capitalizado) como sugiere el error de PostgREST y tu documentación
    const [tenantsRes, companiesRes] = await Promise.all([
      supabase.from('Tenant').select('*'),
      supabase.from('companies').select('*')
    ]);

    if (tenantsRes.error || companiesRes.error) {
      console.error('API: Database error:', tenantsRes.error || companiesRes.error);
      return NextResponse.json(
        { error: 'Failed to load tenants data' },
        { status: 500 }
      );
    }

    const tenants = tenantsRes.data;
    const companies = companiesRes.data;

    if (!tenants || tenants.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. Creamos un Mapa de empresas indexado por tenantId para una búsqueda O(1)
    const companiesMap = new Map();
    companies?.forEach(company => {
      // Soporta tanto snake_case como camelCase según lo que venga de la DB
      const tId = company.tenant_id || company.tenantId;
      if (tId) companiesMap.set(tId, company);
    });

     /** @type {EnrichedTenant[]} */
     const enrichedTenants = tenants.map(tenant => {
       // Buscamos la empresa en el mapa de forma ultra rápida
       const company = companiesMap.get(tenant.id);
       
       return {
         id: tenant.id,
         businessName: company?.name || tenant.businessname || tenant.business_name || tenant.name || '',
         businessRTN: company?.rtn || tenant.businessrtn || tenant.business_rtn || '',
         businessEmail: company?.email || tenant.businessemail || tenant.business_email || '',
         businessAddress: company?.address || tenant.businessaddress || tenant.business_address || '',
         phoneNumber: company?.phone || company?.contact_phone || tenant.phonenumber || tenant.phone_number || '',
         tenantCode: tenant.tenant_code || tenant.tenantCode || tenant.id,
         industry: company?.industry || tenant.industry || '',
         maxUsers: tenant.maxusers || tenant.max_users || company?.total_units || 5,
         maxStorage: tenant.maxstorage || tenant.max_storage || 100,
         isConfigurationComplete: !!company?.rtn || !!tenant.businessrtn,
         isActive: tenant.isactive ?? tenant.is_active ?? true
       };
     });

    console.log(`API: Successfully loaded ${enrichedTenants.length} tenants from database`);
    return NextResponse.json(enrichedTenants, { status: 200 });

  } catch (error) {
    console.error('API: Unexpected error loading tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';
/** @typedef {import('@/types/tenants').TenantJoinResult} TenantJoinResult */
/** @typedef {import('@/types/tenants').EnrichedTenant} EnrichedTenant */

export async function GET(request) {
  try {
    console.log('API: Loading tenants with enriched data from database...');

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch (e) {
      console.warn('Supabase client creation failed:', e.message);
      return NextResponse.json([], { status: 200 });
    }

    // 1. Cargamos tenants y companies por separado para evitar el error PGRST200 (falta de FK)
    // Wrap both queries in try-catch so DNS/network failures don't crash the app
    let tenants = null;
    let companies = [];

    try {
      const tenantsResult = await supabase.from('Tenant').select('*');
      tenants = tenantsResult.data;
      if (tenantsResult.error) throw tenantsResult.error;
    } catch (e) {
      console.warn('Tenant query failed (Supabase unreachable?):', e.message || e);
      return NextResponse.json([], { status: 200 });
    }

    try {
      const companiesResult = await supabase.from('companies').select('*');
      companies = companiesResult.data || [];
    } catch (e) {
      companies = [];
    }

if (!tenants || tenants.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. Creamos un Mapa de empresas indexado por tenantId (AHORA ARRAY)
    const companiesMap = new Map();
    companies?.forEach(company => {
      const tId = company.tenant_id || company.tenantId;
      if (tId) {
        if (!companiesMap.has(tId)) companiesMap.set(tId, []);
        companiesMap.get(tId).push(company);
      }
    });

     /** @type {EnrichedTenant[]} */
     const enrichedTenants = tenants.map(tenant => {
       const companiesForTenant = companiesMap.get(tenant.id) || [];
       const primaryCompany = companiesForTenant[0] || null;
       
       // Parse modules from Tenant table
        let activeModules = [];
        try {
          if (tenant.modules) {
            if (typeof tenant.modules === 'string' && tenant.modules.startsWith('[')) {
              const parsed = JSON.parse(tenant.modules);
              activeModules = Array.isArray(parsed) ? parsed.map(function(m) { return typeof m === 'string' ? m : m.id || m.name; }) : [];
            } else if (typeof tenant.modules === 'string') {
              activeModules = tenant.modules.split(',').map(function(m) { return m.trim(); }).filter(Boolean);
            }
          }
        } catch(e) { activeModules = []; }

        return {
          id: tenant.id,
          businessName: primaryCompany?.name || tenant.businessname || tenant.business_name || tenant.name || '',
          businessRTN: primaryCompany?.rtn || tenant.businessrtn || tenant.business_rtn || '',
          businessEmail: primaryCompany?.email || tenant.businessemail || tenant.business_email || '',
          businessAddress: primaryCompany?.address || tenant.businessaddress || tenant.business_address || '',
          phoneNumber: primaryCompany?.phone || primaryCompany?.contact_phone || tenant.phonenumber || tenant.phone_number || '',
          tenantCode: tenant.tenant_code || tenant.tenantCode || tenant.id,
          industry: primaryCompany?.industry || tenant.industry || '',
          maxUsers: tenant.maxusers || tenant.max_users || primaryCompany?.total_units || 5,
          maxStorage: tenant.maxstorage || tenant.max_storage || 100,
          isConfigurationComplete: !!primaryCompany?.rtn || !!tenant.businessrtn,
          isActive: tenant.isactive ?? tenant.is_active ?? true,
          activeModules,
          companies: companiesForTenant.map(c => ({
            id: c.id,
            name: c.name,
            rtn: c.rtn,
            email: c.email,
            address: c.address,
            industry: c.industry,
            logo_url: c.logo_url,
            business_type: c.business_type,
          })),
        };
     });

    console.log(`API: Successfully loaded ${enrichedTenants.length} tenants from database`);
    return NextResponse.json(enrichedTenants, { status: 200 });

  } catch (error) {
    console.error('API: Unexpected error loading tenants:', error);
    // Return empty array instead of 500 — app degrades gracefully
    return NextResponse.json([], { status: 200 });
  }
}

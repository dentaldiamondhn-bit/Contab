import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
/** @typedef {import('@/types/tenants').TenantJoinResult} TenantJoinResult */
/** @typedef {import('@/types/tenants').EnrichedTenant} EnrichedTenant */

export const dynamic = 'force-dynamic';

/**
 * Tenants visibles para la sesion.
 *
 * Antes esta ruta devolvia TODOS los tenants a cualquiera (ni siquiera exigia
 * sesion). Eso hacia que /tenant-admin/settings cayera en `tenants[0]` y
 * mostrara "Contab Default", y permitia enumerar empresas ajenas.
 *
 * Regla:
 *   - SUPER_ADMIN / SUPPORT: todos (lo necesitan /support/users y
 *     /support/databases para administrar).
 *   - resto: solo los tenants de sus empresas en `user_company_access`, mas el
 *     `User.tenantId` y el tenant de Clerk metadata como respaldo.
 */
async function sesionActual() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  let clerkUser = null;
  try {
    const client = await clerkClient();
    clerkUser = await client.users.getUser(userId);
  } catch (error) {
    console.warn('tenants-api: no se pudo leer el usuario de Clerk:', error?.message || error);
  }

  const metadata = {
    ...((sessionClaims?.metadata as Record<string, unknown>) || {}),
    ...(clerkUser?.publicMetadata || {}),
    ...(clerkUser?.unsafeMetadata || {}),
    ...((clerkUser?.privateMetadata as Record<string, unknown>) || {}),
  };

  const role = String(metadata.role || '').toUpperCase();
  const email =
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    String((sessionClaims as { email?: string } | null)?.email || '');

  const superAdmins = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const isSuperAdmin =
    role === 'SUPER_ADMIN' ||
    email === 'sucachi.123@gmail.com' ||
    (email && superAdmins.includes(email.toLowerCase()));

  return {
    userId,
    role,
    email,
    isSuperAdmin,
    isSupport: role === 'SUPPORT',
    tenantId: String(metadata.tenantId || ''),
  };
}

/** Claves de tenant que el usuario puede ver (id UUID o tenant_code legacy). */
async function clavesDelUsuario(supabase, sesion) {
  const claves = new Set();
  if (sesion.tenantId) claves.add(sesion.tenantId);

  try {
    const { data: usuarios, error } = await supabase
      .from('User')
      .select('id, tenantId')
      .eq('authid', sesion.userId)
      .order('id', { ascending: true })
      .limit(1);

    if (error) {
      console.warn('tenants-api: no se pudo leer User:', error.message);
    }

    const usuario = Array.isArray(usuarios) ? usuarios[0] : usuarios;
    if (usuario?.tenantId) claves.add(String(usuario.tenantId));

    if (usuario?.id) {
      // El embed Company(...) funciona porque user_company_access.company_id
      // referencia Company.id. Si fallara, se sigue con las claves ya reunidas.
      const { data: accesos, error: errorAccesos } = await supabase
        .from('user_company_access')
        .select('relationship, Company(tenantId)')
        .eq('user_id', String(usuario.id));

      if (errorAccesos) {
        console.warn('tenants-api: no se pudo leer user_company_access:', errorAccesos.message);
      }

      for (const fila of accesos || []) {
        const company = Array.isArray(fila.Company) ? fila.Company[0] : fila.Company;
        if (company?.tenantId) claves.add(String(company.tenantId));
      }
    }
  } catch (error) {
    console.warn('tenants-api: error resolviendo empresas del usuario:', error?.message || error);
  }

  return claves;
}

export async function GET() {
  try {
    console.log('API: Loading tenants with enriched data from database...');

    const sesion = await sesionActual();
    if (!sesion) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
      // La tabla en Supabase es `tenants` (snake_case); `Tenant` no existe.
      const tenantsResult = await supabase.from('tenants').select('*');
      tenants = tenantsResult.data;
      if (tenantsResult.error) throw tenantsResult.error;
    } catch (e) {
      console.warn('Tenant query failed (Supabase unreachable?):', e.message || e);
      return NextResponse.json([], { status: 200 });
    }

    try {
      // `companies` no existe; la tabla es `Company`.
      const companiesResult = await supabase.from('Company').select('*');
      companies = companiesResult.data || [];
    } catch (e) {
      companies = [];
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. Filtrado por pertenencia. Solo los roles de plataforma ven todo.
    if (!sesion.isSuperAdmin && !sesion.isSupport) {
      const claves = await clavesDelUsuario(supabase, sesion);
      tenants = tenants.filter(
        (tenant) =>
          claves.has(String(tenant.id)) ||
          (tenant.tenant_code && claves.has(String(tenant.tenant_code)))
      );

      // Hay empresas cuyo `Company.tenantId` ("TEST1DS", "ANGELOH7",
      // "DENTALWD") no tiene fila en `tenants`. Antes la ruta devolvia todos los
      // tenants y eso quedaba oculto; al filtrar, esos usuarios se quedarian sin
      // tenant. Se sintetiza una entrada minima desde Company para que
      // TenantContext/WorkspaceContext sigan funcionando.
      const presentes = new Set();
      for (const tenant of tenants) {
        presentes.add(String(tenant.id));
        if (tenant.tenant_code) presentes.add(String(tenant.tenant_code));
      }

      for (const clave of claves) {
        if (presentes.has(clave)) continue;
        const empresas = companies.filter(
          (company) => String(company.tenantId || company.tenant_id || '') === clave
        );
        if (empresas.length === 0) continue;
        tenants.push({
          id: clave,
          tenant_code: clave,
          business_name: empresas[0].name || clave,
          business_rtn: null,
          business_email: null,
          phone_number: null,
          is_active: true,
        });
        presentes.add(clave);
      }
    }

    // 3. Mapa de empresas. `Company.tenantId` guarda el tenant_code legacy
    //    ("TEST1DS") o el id de `tenants`; se indexa por ambos lados.
    const companiesMap = new Map();
    companies?.forEach((company) => {
      const tId = company.tenantId || company.tenant_id;
      if (tId) {
        if (!companiesMap.has(tId)) companiesMap.set(tId, []);
        companiesMap.get(tId).push(company);
      }
    });

    /** @type {EnrichedTenant[]} */
    const enrichedTenants = tenants.map((tenant) => {
      const companiesForTenant =
        companiesMap.get(tenant.id) ||
        (tenant.tenant_code ? companiesMap.get(tenant.tenant_code) : undefined) ||
        [];
      const primaryCompany = companiesForTenant[0] || null;

      // Parse modules from tenants.modules (si la columna existe)
      let activeModules = [];
      try {
        if (tenant.modules) {
          if (typeof tenant.modules === 'string' && tenant.modules.startsWith('[')) {
            const parsed = JSON.parse(tenant.modules);
            activeModules = Array.isArray(parsed)
              ? parsed.map(function (m) {
                  return typeof m === 'string' ? m : m.id || m.name;
                })
              : [];
          } else if (typeof tenant.modules === 'string') {
            activeModules = tenant.modules
              .split(',')
              .map(function (m) {
                return m.trim();
              })
              .filter(Boolean);
          }
        }
      } catch (e) {
        activeModules = [];
      }

      return {
        id: tenant.id,
        // Esquema real: snake_case. Se mantienen los alias viejos como respaldo.
        businessName:
          primaryCompany?.name ||
          tenant.business_name ||
          tenant.businessname ||
          tenant.businessName ||
          tenant.name ||
          '',
        businessRTN:
          primaryCompany?.rtn ||
          tenant.business_rtn ||
          tenant.businessrtn ||
          tenant.businessRTN ||
          '',
        businessEmail:
          primaryCompany?.email ||
          tenant.business_email ||
          tenant.businessemail ||
          tenant.businessEmail ||
          '',
        businessAddress:
          primaryCompany?.address ||
          tenant.business_address ||
          tenant.businessaddress ||
          tenant.businessAddress ||
          '',
        phoneNumber:
          primaryCompany?.phone ||
          primaryCompany?.contact_phone ||
          tenant.phone_number ||
          tenant.phonenumber ||
          tenant.phoneNumber ||
          '',
        tenantCode: tenant.tenant_code || tenant.tenantCode || tenant.id,
        industry: primaryCompany?.industry || tenant.industry || '',
        maxUsers: tenant.max_users || tenant.maxusers || primaryCompany?.total_units || 5,
        maxStorage: tenant.max_storage || tenant.maxstorage || 100,
        isConfigurationComplete: !!primaryCompany?.rtn || !!tenant.business_rtn,
        isActive: tenant.is_active ?? tenant.isactive ?? true,
        activeModules,
        companies: companiesForTenant.map((c) => ({
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

    console.log(`API: Successfully loaded ${enrichedTenants.length} tenants for the session`);
    return NextResponse.json(enrichedTenants, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('API: Unexpected error loading tenants:', error);
    // Return empty array instead of 500 — app degrades gracefully
    return NextResponse.json([], { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { usuarioAppId } from '@/lib/workspace';
import { contextoDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';

/**
 * GET /api/companies
 * Lista las empresas del usuario autenticado, aisladas por company_id.
 * 
 * Antes filtraba solo por tenant_id, lo que hacia que test 1 y test 2 (mismo tenant TEST1DS)
 * compartieran empresas. Ahora valida pertenencia usando contextoDeEmpresa y filtroEmpresaOCompany.
 */

export async function GET(request: Request) {
  try {
    console.log('API: GET request started');
    const { userId } = await auth();
    console.log('API: User ID:', userId);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Usar cliente directo como en el PUT para evitar RLS
    const directSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('API: Direct Supabase client created for GET');

    // Obtener la membresía real del usuario: auth.uid() -> "User".authid ->
    // user_company_access.user_id. User.tenantid es legacy y NO aísla: un usuario
    // puede ser contador de unas empresas y no de otras del mismo tenant, asi que
    // filtrar por tenant_id devolvia empresas ajenas.
    const userIdApp = await usuarioAppId();

    if (!userIdApp) {
      console.log('API: No user found, returning empty companies');
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    const { data: acceso, error: accesoError } = await directSupabase
      .from('user_company_access')
      .select('company_id')
      .eq('user_id', userIdApp);

    if (accesoError) {
      console.error('API: Error fetching memberships:', accesoError);
      return NextResponse.json({ error: 'Error obteniendo empresas' }, { status: 500 });
    }

    const companyIds = Array.from(
      new Set(
        (acceso || [])
          .map((r) => (r as { company_id?: string }).company_id)
          .filter((v): v is string => Boolean(v)),
      ),
    );

    if (companyIds.length === 0) {
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    // Validar pertenencia usando contextoDeEmpresa + filtroEmpresaOCompany.
    // Esto asegura que el usuario solo vea empresas de su tenant que le pertenecen,
    // no todas las empresas del tenant (test 1 y test 2 comparten TEST1DS).
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyIds[0] });
    if (!empresa.tenantId) {
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    // Ahora sí filtramos las companies por company_id dentro del tenant.
    // Usamos directSupabase con match para aislar por empresa.
    const { data: companies, error } = await directSupabase
      .from('companies')
      .select('*')
      .in('id', companyIds)
      .match(filtroEmpresaOCompany(empresa));
    
    // Fallback: si match devuelve vacío (puede pasar con datos legacy), 
    // dejamos el filtro por in.
    if (!companies || companies.length === 0) {
      const { data: companiesFallback, error: fallbackError } = await directSupabase
        .from('companies')
        .select('*')
        .in('id', companyIds)
        .eq('tenant_id', empresa.tenantId);
      
      if (fallbackError) {
        console.error('API: Error fetching companies fallback:', fallbackError);
        return NextResponse.json({ error: 'Error obteniendo empresas' }, { status: 500 });
      }
      // Transformar campos de la BD al formato que espera el frontend
      const transformedCompanies = companiesFallback.map(company => {
        return {
          id: company.id,
          tenant_id: (company as any).tenant_id,
          tenantId: (company as any).tenant_id,
          business_name: company.name || company.business_name || 'Sin nombre',
          business_rtn: company.rtn || company.business_rtn || '',
          industry: company.industry || company.business_type || 'Sin industria',
          regimen_tributario: company.regimen_tributario || 'Régimen General',
          actividad_economica: company.actividad_economica || company.business_type || '',
          direccion_fiscal: company.address || company.direccion_fiscal || company.business_address || '',
          telefono_fiscal: company.phone || company.telefono_fiscal || company.contact_phone || '',
          email_fiscal: company.email || company.email_fiscal || '',
          is_active: company.is_active !== false, // default true unless explicitly false
          created_at: company.created_at,
          config_fiscal: company.config_fiscal || null,
          _count: {
            polizas: 0,
            accounts: 0
          }
        };
      });
      return NextResponse.json({ companies: transformedCompanies });
    }

    // Transformar campos de la BD al formato que espera el frontend
    const transformedCompanies = companies.map(company => {
      return {
        id: company.id,
        tenant_id: (company as any).tenant_id,
        tenantId: (company as any).tenant_id,
        business_name: company.name || company.business_name || 'Sin nombre',
        business_rtn: company.rtn || company.business_rtn || '',
        industry: company.industry || company.business_type || 'Sin industria',
        regimen_tributario: company.regimen_tributario || 'Régimen General',
        actividad_economica: company.actividad_economica || company.business_type || '',
        direccion_fiscal: company.address || company.direccion_fiscal || company.business_address || '',
        telefono_fiscal: company.phone || company.telefono_fiscal || company.contact_phone || '',
        email_fiscal: company.email || company.email_fiscal || '',
        is_active: company.is_active !== false, // default true unless explicitly false
        created_at: company.created_at,
        config_fiscal: company.config_fiscal || null,
        _count: {
          polizas: 0,
          accounts: 0
        }
      };
    });

    console.log('API: Transformed companies:', transformedCompanies);
    
    return NextResponse.json({ companies: transformedCompanies });
    
  } catch (error) {
    console.error('Error in companies API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
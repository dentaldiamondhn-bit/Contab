import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '../../../../lib/supabase/service-role';

async function safeGetUserRole(): Promise<string> {
  try {
    const { getUserRoleFromAuth } = await import('@/lib/auth-server');
    return await getUserRoleFromAuth();
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  try {
    // Require valid session — middleware already validated the token
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*')
      .order('businessname', { ascending: true });

    if (tenantsError || !tenants) {
      console.warn('Supabase tenant query failed:', tenantsError?.message);
      return NextResponse.json({ success: true, tenants: [] });
    }

    // Get user counts
    const { data: userCounts } = await supabase
      .from('User')
      .select('tenantid');

    const userCountMap = new Map<string, number>();
    userCounts?.forEach((u: any) => {
      const tid = u.tenantid;
      if (tid) userCountMap.set(tid, (userCountMap.get(tid) || 0) + 1);
    });

     const formattedTenants = tenants.map((tenant: any) => ({
       id: tenant.id,
       businessName: tenant.businessname || tenant.business_name || '',
       businessRTN: tenant.businessrtn || tenant.business_rtn || '',
       businessEmail: tenant.businessemail || tenant.business_email || '',
       businessAddress: tenant.businessaddress || tenant.business_address || '',
       phoneNumber: tenant.phonenumber || tenant.phone_number || '',
       tenantCode: tenant.tenant_code || tenant.tenantCode || tenant.id,
       industry: tenant.industry || '',
       maxUsers: tenant.maxusers || tenant.max_users || 5,
       userCount: userCountMap.get(tenant.id) || 0,
       isActive: tenant.isactive ?? tenant.is_active ?? true,
     }));

    return NextResponse.json({ 
      success: true,
      tenants: formattedTenants 
    });

  } catch (error: any) {
    console.error('Error en API de support/tenants:', error);
    // Return empty list instead of 500
    return NextResponse.json({ success: true, tenants: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await safeGetUserRole();

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { businessName, businessRTN, businessEmail, businessAddress } = body;

    if (!businessName || !businessRTN || !businessEmail || !businessAddress) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Generate unique code
    const prefix = businessName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();
    
    let counter = 1;
    let tenantCode = `${prefix}${counter.toString().padStart(3, '0')}`;
    let codeExists = true;

    while (codeExists) {
      const { data } = await supabase
        .from('Tenant')
        .select('id')
        .eq('tenant_code', tenantCode)
        .single();
      
      if (data) {
        counter++;
        tenantCode = `${prefix}${counter.toString().padStart(3, '0')}`;
      } else {
        codeExists = false;
      }
    }

    // Create tenant
    const { data: tenant, error } = await supabase
      .from('Tenant')
      .insert({
        business_name: businessName,
        business_rtn: businessRTN,
        business_email: businessEmail,
        business_address: businessAddress,
        tenant_code: tenantCode,
        country: 'HN',
        subscription_plans: 'BASIC',
        max_users: 5,
        max_storage: 100,
        max_transactions: 10000,
        monthly_cost: 1000,
        is_active: true
      })
      .select('id, business_name, tenant_code, subscription_plans, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creando tenant:', error);
      return NextResponse.json(
        { error: 'Error creando tenant', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant
    });

  } catch (error: any) {
    console.error('Error creando tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
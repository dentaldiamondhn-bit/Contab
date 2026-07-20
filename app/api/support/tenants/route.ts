import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '../../../../lib/supabase/service-role';
import { getUserRoleFromAuth } from '../../../../lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    // Get session and role for authorization
    await auth();
    const userRole = await getUserRoleFromAuth();

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('id, business_rtn, business_email, business_address, phone_number, tenant_code, industry, max_users, is_configuration_complete, is_active')
      .order('business_rtn', { ascending: true });

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      return NextResponse.json(
        { error: 'Error interno del servidor', details: tenantsError.message },
        { status: 500 }
      );
    }

    // Get user counts
    const { data: userCounts, error: countError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('is_active', true);

    const userCountMap = new Map<string, number>();
    userCounts?.forEach((u: any) => {
      userCountMap.set(u.tenant_id, (userCountMap.get(u.tenant_id) || 0) + 1);
    });

     const formattedTenants = tenants?.map((tenant: any) => ({
       id: tenant.id,
       businessRTN: tenant.business_rtn,
       businessEmail: tenant.business_email,
       businessAddress: tenant.business_address,
       phoneNumber: tenant.phone_number,
       tenantCode: tenant.tenant_code,
       industry: tenant.industry,
       maxUsers: tenant.max_users,
       userCount: userCountMap.get(tenant.id) || 0,
       isConfigurationComplete: tenant.is_configuration_complete,
       isActive: tenant.is_active
     })) || [];

    return NextResponse.json({ 
      success: true,
      tenants: formattedTenants 
    });

  } catch (error: any) {
    console.error('Error en API de support/tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

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
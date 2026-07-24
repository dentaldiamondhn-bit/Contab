import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el tenantId del usuario desde la tabla User
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid')
      .eq('authid', userId)
      .single();

    if (userError || !userData?.tenantid) {
      return NextResponse.json({ 
        error: 'Usuario no tiene tenant asociado',
        hasTenant: false 
      }, { status: 404 });
    }

    // Obtener los datos del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('*')
      .eq('id', userData.tenantid)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ 
        error: 'Tenant no encontrado',
        hasTenant: false 
      }, { status: 404 });
    }

    // Obtener los datos de la empresa (companies) asociada al tenant
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('tenant_id', tenant.id)
      .limit(1);

    const company = companies?.[0];

    // Construir el objeto tenant con la información necesaria
    const tenantData = {
      id: tenant.id,
      businessName: company?.name || tenant.tenant_code || 'Mi Empresa',
      tenantCode: tenant.tenant_code,
      businessEmail: company?.email || tenant.email || '',
      businessRTN: company?.rtn || tenant.rtn || '',
      phoneNumber: company?.phone || tenant.phone || '',
      businessAddress: company?.address || tenant.address || '',
      industry: company?.industry || tenant.industry || '',
      maxUsers: tenant.max_users || 5,
    };

    return NextResponse.json({
      hasTenant: true,
      tenant: tenantData
    });

  } catch (error: any) {
    console.error('Error getting user tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Get user's tenant
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid')
      .eq('authid', userId)
      .single();

    if (userError || !userData?.tenantid) {
      return NextResponse.json({ error: 'Usuario no tiene tenant asociado' }, { status: 404 });
    }

    const tenantId = userData.tenantid;

    // Update tenant table fields
    const tenantUpdates: Record<string, any> = {};
    if (body.businessRTN !== undefined) tenantUpdates.rtn = body.businessRTN;
    if (body.phoneNumber !== undefined) tenantUpdates.phone = body.phoneNumber;
    if (body.businessAddress !== undefined) tenantUpdates.address = body.businessAddress;
    if (body.industry !== undefined) tenantUpdates.industry = body.industry;
    if (body.businessEmail !== undefined) tenantUpdates.email = body.businessEmail;

    if (Object.keys(tenantUpdates).length > 0) {
      await supabase.from('Tenant').update(tenantUpdates).eq('id', tenantId);
    }

    // Update companies table if exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    const companyUpdates: Record<string, any> = {};
    if (body.businessName !== undefined) companyUpdates.name = body.businessName;
    if (body.businessEmail !== undefined) companyUpdates.email = body.businessEmail;
    if (body.businessRTN !== undefined) companyUpdates.rtn = body.businessRTN;
    if (body.phoneNumber !== undefined) companyUpdates.phone = body.phoneNumber;
    if (body.businessAddress !== undefined) companyUpdates.address = body.businessAddress;
    if (body.industry !== undefined) companyUpdates.industry = body.industry;

    if (existingCompany && Object.keys(companyUpdates).length > 0) {
      await supabase.from('companies').update(companyUpdates).eq('id', existingCompany.id);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

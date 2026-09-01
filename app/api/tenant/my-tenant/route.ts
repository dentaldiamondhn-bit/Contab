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

    // Obtener paymentMethod desde Clerk publicMetadata (seleccionado en onboarding)
    let paymentMethod: string | null = null;
    try {
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      paymentMethod = (clerkUser.publicMetadata as any)?.paymentMethod || (clerkUser.publicMetadata as any)?.selectedPaymentMethod || null;
    } catch {}

    // Obtener planes desde tenant_plans (todos los activos para mostrar en factura)
    let subscriptionPlan: string | null = null;
    let allPlans: any[] = [];
    try {
      const { data: tPlans } = await supabase
        .from('tenant_plans')
        .select('plan_name,plan_code,unit_price,total')
        .eq('tenant_id', tenant.id);
      if (tPlans && tPlans.length > 0) {
        allPlans = tPlans;
        subscriptionPlan = tPlans[0].plan_name || tPlans[0].plan_code || null;
      }
      if (!subscriptionPlan) {
        subscriptionPlan = (tenant as any).subscriptionplan || (tenant as any).subscription_plan || null;
      }
    } catch {}

    // Construir el objeto tenant con la información necesaria
    const tenantData = {
      id: tenant.id,
      businessName: company?.name || tenant.tenant_code || 'Mi Empresa',
      tenantCode: tenant.tenant_code,
      businessEmail: company?.email || tenant.email || '',
      businessRTN: company?.rtn || tenant.rtn || '',
      phoneNumber: company?.company_phone || company?.client_phone || company?.contact_phone || company?.phone || tenant.phone_number || tenant.phoneNumber || tenant.phone || '',
      businessAddress: company?.address || tenant.address || '',
      industry: company?.industry || tenant.industry || '',
      maxUsers: tenant.max_users || 5,
      paymentMethod: paymentMethod || null,
      subscriptionPlan: subscriptionPlan || null,
      plans: allPlans,
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

    // Actualizar paymentMethod en Clerk publicMetadata si se proporciona
    if (body.paymentMethod !== undefined) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        await client.users.updateUser(userId, {
          publicMetadata: {
            ...(clerkUser.publicMetadata as any),
            paymentMethod: body.paymentMethod,
          },
        });
      } catch (e) {
        console.warn('No se pudo guardar paymentMethod en Clerk', e);
      }
    }

    // Si el tenant pide cambiar de plan, será efectivo para el siguiente ciclo (no para la factura actual inmutable)
    if (body.subscriptionPlan !== undefined || body.planCode !== undefined || body.pendingPlan !== undefined || body.plan !== undefined) {
      const newPlan = body.pendingPlan || body.subscriptionPlan || body.planCode || body.plan;
      if (newPlan) {
        const nextCycle = new Date();
        nextCycle.setMonth(nextCycle.getMonth() + 1);
        nextCycle.setDate(1);
        nextCycle.setHours(0, 0, 0, 0);
        try {
          const { clerkClient } = await import('@clerk/nextjs/server');
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          await client.users.updateUser(userId, {
            publicMetadata: {
              ...(clerkUser.publicMetadata as any),
              pendingPlan: newPlan,
              pendingPlanEffectiveDate: nextCycle.toISOString(),
            },
          });
          console.log(`Plan change requested: ${newPlan} efectivo ${nextCycle.toISOString()} (siguiente ciclo)`);
        } catch (e) {
          console.warn('No se pudo guardar pendingPlan', e);
        }
        // También crear entrada futura en tenant_plans para que el generador la use el próximo mes
        try {
          // Buscar plan por code o name
          const { data: planData } = await supabase.from('Plan').select('id,code,name,price').or(`code.eq.${newPlan},name.eq.${newPlan}`).maybeSingle();
          if (planData) {
            await supabase.from('tenant_plans').insert([{
              tenant_id: tenantId,
              plan_id: planData.id,
              plan_code: planData.code,
              plan_name: planData.name,
              unit_price: planData.price,
              total: Math.round(planData.price * 1.15),
              is_active: false,
              start_date: nextCycle.toISOString(),
            }]);
          }
        } catch (e) {
          console.warn('No se pudo crear tenant_plans futuro', e);
        }
      }
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

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache en memoria de precios de planes (evita llamadas repetidas a Supabase en la misma instancia)
let planPricesCache: Record<string, number> | null = null;
let planPricesTimestamp = 0;
const PLAN_PRICES_TTL = 60_000; // 1 minuto

async function getPlanPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (planPricesCache && (now - planPricesTimestamp) < PLAN_PRICES_TTL) {
    return planPricesCache;
  }

  try {
    // Llamada directa a Supabase para evitar middleware/autenticación de la API route
    const { data: plans, error } = await supabaseAdmin
      .from('Plan')
      .select('code, price')
      .eq('is_active', true);

    if (error || !plans?.length) {
      console.warn('⚠️ No se pudieron cargar precios desde Plan table, usando fallback:', error?.message);
      return { PREMIUM: 1000, ENTERPRISE: 2000, STARTER: 200, GROWTH: 750 };
    }

    const prices: Record<string, number> = {};
    for (const p of plans as any[]) {
      prices[p.code] = p.price;
    }
    planPricesCache = prices;
    planPricesTimestamp = now;
    console.log('✅ Precios de planes cargados:', prices);
    return prices;
  } catch (e: any) {
    console.warn('⚠️ Error cargando precios de planes:', e.message);
    return { PREMIUM: 1000, ENTERPRISE: 2000, STARTER: 200, GROWTH: 750 };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 GET /api/admin/tenants/[id] - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Buscar tenant en Supabase - primero por id, luego por tenant_code
    let { data: tenant, error: tenantError } = await supabaseAdmin
      .from('Tenant')
      .select('*')
      .eq('id', id)
      .single();
    
    // Si no encuentra por id, intentar por tenant_code
    if (tenantError || !tenant) {
      console.log('🔍 No encontrado por id, buscando por tenant_code:', id);
      const { data: tenantByCode, error: codeError } = await supabaseAdmin
        .from('Tenant')
        .select('*')
        .eq('tenant_code', id)
        .single();
      
      if (codeError || !tenantByCode) {
        console.log('❌ Tenant no encontrado en Supabase (ni por id ni por tenant_code):', { tenantError, codeError });
        return NextResponse.json(
          { error: 'Tenant no encontrado' },
          { status: 404 }
        );
      }
      
      tenant = tenantByCode;
      tenantError = null;
    }

    console.log('✅ Tenant encontrado en datos reales:', tenant.businessName);

    // Funciones para limpiar datos
    const cleanEmail = (email: string) => {
      if (!email) return '';
      return email.replace(/\+[A-Za-z0-9]+@/, '@');
    };
    const cleanRTN = (rtn: string) => {
      if (!rtn) return '';
      const match = rtn.match(/^\d{14}/);
      return match ? match[0] : rtn;
    };

    // Enriquecer datos del tenant
    // NOTE: Tenant table has column "subscriptionplan" (not "subscriptionplans")
    let subscriptionPlans = [];
    const rawPlanData = tenant.subscriptionplan || tenant.subscription_plan || tenant.subscriptionPlans;
    if (rawPlanData) {
      try {
        subscriptionPlans = JSON.parse(rawPlanData);
      } catch {
        subscriptionPlans = [{ code: rawPlanData, quantity: 1 }];
      }
    } else {
      subscriptionPlans = [{ code: 'PREMIUM', quantity: 1 }];
    }

    // Cargar precios reales desde la tabla Plan (la misma fuente que /admin/plans)
    const planPrices = await getPlanPrices();

    const enrichedPlans = subscriptionPlans.map((plan: any) => {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      
      return {
        code: planCode,
        quantity: quantity,
        price: planPrices[planCode] || 500,
        name: `Plan ${planCode}`,
        description: `Suscripción al plan ${planCode}`,
        taxRate: 15,
        discount: 0
      };
    });

    // Obtener usuarios de Clerk para este tenant
    let clerkUsers: any[] = [];
    try {
      // Get users from Supabase User table for this tenant
      const { data: dbUsers } = await supabaseAdmin
        .from('User')
        .select('*')
        .eq('tenantid', id);
      
      console.log('DB users found for tenant:', dbUsers?.length || 0);

      if (dbUsers && dbUsers.length > 0) {
        // Try to match with Clerk users by email
        const client = await clerkClient();
        const allUsersResponse = await client.users.getUserList();
        const allClerkUsers = allUsersResponse.data;

        const clerkByEmail: Record<string, any> = {};
        allClerkUsers.forEach((cu: any) => {
          const email = cu.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
          if (email) clerkByEmail[email] = cu;
        });

        clerkUsers = dbUsers.map((u: any) => {
          const email = (u.email || '').toLowerCase();
          const clerkUser = clerkByEmail[email];
          return {
            id: clerkUser?.id || u.authid || u.id || '',
            email: u.email || '',
            firstName: clerkUser?.firstName || u.firstname || '',
            lastName: clerkUser?.lastName || u.lastname || '',
            role: u.role || 'USER',
            tenantId: u.tenantid || id,
            isActive: u.isactive !== false,
            createdAt: clerkUser?.createdAt || u.createdat || u.created_at || new Date().toISOString(),
            lastLoginAt: clerkUser?.lastSignInAt || new Date().toISOString()
          };
        });
      }
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
    }

    const enrichedTenant = {
      id: tenant.id,
      businessName: tenant.businessname,
      businessRTN: cleanRTN(tenant.businessrtn),
      businessEmail: cleanEmail(tenant.businessemail),
      businessAddress: tenant.businessaddress,
      tenantCode: tenant.tenant_code,
      phoneNumber: tenant.phonenumber,
      country: tenant.country,
      timezone: tenant.timezone,
      currency: tenant.currency,
      subscriptionPlans: enrichedPlans,
      subscriptionPlan: tenant.subscriptionplan || tenant.subscription_plan || tenant.subscriptionPlans || 'PREMIUM',
      maxUsers: tenant.maxusers,
      maxStorage: tenant.maxstorage,
      maxTransactions: tenant.maxtransactions,
      monthlyCost: tenant.monthlycost,
      modules: (() => {
        if (!tenant.modules) return [];
        // Intentar parsear como JSON primero (nuevo formato: array de objetos)
        try {
          const parsed = JSON.parse(tenant.modules);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        // Fallback: formato antiguo (comma-separated)
        return tenant.modules.split(',').filter((m: string) => m.trim());
      })(),
      isActive: tenant.isactive,
      createdAt: tenant.createdat,
      updatedAt: tenant.updatedat,
      users: clerkUsers.length > 0 ? clerkUsers : [
        {
          id: tenant.id,
          email: tenant.businessemail,
          firstName: tenant.businessname?.split(' ')[0] || 'Admin',
          lastName: tenant.businessname?.split(' ').slice(1).join(' ') || 'User',
          role: 'ADMIN',
          isActive: true,
          createdAt: tenant.createdat,
          lastLoginAt: new Date().toISOString()
        }
      ], 
      userCounts: clerkUsers.length > 0 ? 
        clerkUsers.reduce((acc: any, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}) : 
        { ADMIN: 1 }, 
      totalUsers: clerkUsers.length > 0 ? clerkUsers.length : 1, 
      activeUsers: clerkUsers.length > 0 ? clerkUsers.filter((u: any) => u.isActive).length : 1
    };

    console.log('✅ Tenant enriquecido devuelto');

    return NextResponse.json(enrichedTenant);

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 PATCH /api/admin/tenants/[id] - Actualizando tenant...');
    
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Parse request body and build a clean Tenant row
    const body = await req.json();
    console.log('📦 Datos recibidos:', body);

    // Normalize subscriptionPlans: frontend sends JSON array, Tenant stores single CSV or JSON string
    let subscriptionPlansValue: string = '["PREMIUM"]';
    if (body.subscriptionPlans) {
      if (typeof body.subscriptionPlans === 'string') {
        try {
          const parsed = JSON.parse(body.subscriptionPlans);
          subscriptionPlansValue = JSON.stringify(parsed);
        } catch {
          subscriptionPlansValue = body.subscriptionPlans;
        }
      } else if (Array.isArray(body.subscriptionPlans)) {
        subscriptionPlansValue = JSON.stringify(body.subscriptionPlans);
      }
    }

    // Build Tenant row — only fields that exist in the table
    const tenantRow: Record<string, any> = {
      updatedat: new Date().toISOString(),
    };

    // Map camelCase → snake_case tenant fields
    const fieldMap: Record<string, string> = {
      businessName:    'businessname',
      businessEmail:   'businessemail',
      businessRTN:     'businessrtn',
      businessAddress: 'businessaddress',
      phoneNumber:    'phonenumber',
      subscriptionPlans: 'subscriptionplan',
      maxUsers:        'maxusers',
      maxStorage:      'maxstorage',
      maxTransactions: 'maxtransactions',
      monthlyCost:     'monthlycost',
      modules:         'modules',
      isActive:        'isactive',
    };

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (camel === 'subscriptionPlans') {
        tenantRow[snake] = subscriptionPlansValue;
      } else if (camel === 'modules' && body[camel] !== undefined) {
        // Modules puede venir como array de objetos o string
        if (Array.isArray(body[camel])) {
          tenantRow[snake] = JSON.stringify(body[camel]);
        } else {
          tenantRow[snake] = body[camel];
        }
      } else if (body[camel] !== undefined) {
        tenantRow[snake] = body[camel];
      }
    }

    console.log('🔧 Payload para Supabase:', tenantRow);

    // Actualizar tenant en Supabase
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('Tenant')
      .update(tenantRow)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando tenant en Supabase:', {
        message: typeof updateError.message === 'string' ? updateError.message : JSON.stringify(updateError.message),
        code: updateError.code,
        details: typeof updateError.details === 'string' ? updateError.details : JSON.stringify(updateError.details),
        hint: updateError.hint,
        body: JSON.stringify(tenantRow),
        tenantId: id,
      });
      return NextResponse.json(
        { error: 'Error actualizando tenant', details: typeof updateError.message === 'string' ? updateError.message : JSON.stringify(updateError.message) },
        { status: 500 }
      );
    }
    
    console.log('✅ Tenant actualizado en Supabase:', updatedTenant.businessname);

    // Enriquecer los planes con precios para la respuesta (misma fuente que /admin/plans)
    let updatedSubscriptionPlans = [];
    const updatedRawPlanData = updatedTenant.subscriptionplan || updatedTenant.subscription_plan || updatedTenant.subscriptionPlans;
    if (updatedRawPlanData) {
      try {
        updatedSubscriptionPlans = JSON.parse(updatedRawPlanData);
      } catch {
        updatedSubscriptionPlans = [{ code: updatedRawPlanData, quantity: 1 }];
      }
    } else {
      updatedSubscriptionPlans = [{ code: 'PREMIUM', quantity: 1 }];
    }

    const planPrices = await getPlanPrices();

    const enrichedUpdatedPlans = updatedSubscriptionPlans.map((plan: any) => {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      
      return {
        code: planCode,
        quantity: quantity,
        price: planPrices[planCode] || 500,
        name: `Plan ${planCode}`,
        description: `Suscripción al plan ${planCode}`,
        taxRate: 15,
        discount: 0
      };
    });

     return NextResponse.json({
       success: true,
       message: 'Tenant actualizado exitosamente',
       tenant: {
         id: updatedTenant.id,
         businessName:  updatedTenant.businessname || updatedTenant.business_name || '',
         businessRTN:   updatedTenant.businessrtn   || updatedTenant.business_rtn   || '',
         businessEmail: updatedTenant.businessemail || updatedTenant.business_email || '',
         businessAddress: updatedTenant.businessaddress || updatedTenant.business_address || '',
         phoneNumber:  updatedTenant.phonenumber   || updatedTenant.phone_number  || '',
         tenantCode:   updatedTenant.tenant_code,
         isActive:     updatedTenant.isactive ?? updatedTenant.is_active ?? true,
         subscriptionPlans: enrichedUpdatedPlans,
         subscriptionPlan:  updatedTenant.subscriptionplan || updatedTenant.subscription_plan || 'PREMIUM',
         maxUsers:     updatedTenant.maxusers      || updatedTenant.max_users      || 5,
         maxStorage:   updatedTenant.maxstorage    || updatedTenant.max_storage    || 100,
         maxTransactions: updatedTenant.maxtransactions || updatedTenant.max_transactions || 10000,
          monthlyCost:  updatedTenant.monthlycost   || updatedTenant.monthly_cost   || 0,
          modules: (() => {
            if (!updatedTenant.modules) return [];
            try {
              const parsed = JSON.parse(updatedTenant.modules);
              if (Array.isArray(parsed)) return parsed;
            } catch {}
            return updatedTenant.modules.split(',').filter((m: string) => m.trim());
          })(),
         createdAt: updatedTenant.createdat   || updatedTenant.created_at,
         updatedAt: updatedTenant.updatedat   || updatedTenant.updated_at,
         users: [], // populate if needed
       }
     });

  } catch (error: any) {
    console.error('❌ Error en PATCH /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 DELETE /api/admin/tenants/[id] - Eliminando tenant...');
    
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Eliminar tenant de Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('Tenant')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Error eliminando tenant en Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Error eliminando tenant', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('✅ Tenant eliminado exitosamente de Supabase');

    return NextResponse.json({
      success: true,
      message: 'Tenant eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
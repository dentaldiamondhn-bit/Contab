import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabase, getAllTenants } from '@/lib/supabase-db';
import { randomBytes } from 'crypto';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    let userRole: string | undefined;
    try {
      const clerkUser = await clerk.users.getUser(userId);
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const tenants = await getAllTenants();

    const { data: allUsers, error: usersError } = await supabase
      .from('User')
      .select('tenantid, isactive');
    
    if (usersError) {
      console.error('Error fetching users count:', usersError);
    }

    // Calcular conteos por tenant
    const userCounts: Record<string, { total: number; active: number }> = {};
    allUsers?.forEach((user: any) => {
      const tenantId = user.tenantid;
      if (!userCounts[tenantId]) {
        userCounts[tenantId] = { total: 0, active: 0 };
      }
      userCounts[tenantId].total++;
      if (user.isactive) {
        userCounts[tenantId].active++;
      }
    });
    
    // Filtrar tenants
    let filteredTenants = tenants;
    
    if (search) {
      filteredTenants = filteredTenants.filter((tenant: any) =>
        tenant.businessname.toLowerCase().includes(search.toLowerCase()) ||
        tenant.tenant_code.toLowerCase().includes(search.toLowerCase()) ||
        tenant.businessemail.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      filteredTenants = filteredTenants.filter((tenant: any) => tenant.isactive === isActive);
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

    // Formatear datos para compatibilidad con frontend (mapear snake_case a camelCase)
    const formattedTenants = paginatedTenants.map((tenant: any) => {
      let subscriptionPlans = [];
      try {
        // Intentar parsear como JSON primero
        subscriptionPlans = JSON.parse(tenant.subscriptionplan || '[]');
      } catch {
        // Si falla, intentar como string separado por comas
        if (tenant.subscriptionplan && typeof tenant.subscriptionplan === 'string') {
          subscriptionPlans = tenant.subscriptionplan.split(',').map((code: string) => ({
            code: code.trim(),
            quantity: 1
          }));
        }
      }

      // Asegurar que subscriptionPlans sea un array válido
      if (!Array.isArray(subscriptionPlans)) {
        subscriptionPlans = [];
      }

      let modules: string[] = [];
      if (tenant.modules) {
        modules = tenant.modules.split(',').filter((m: string) => m.trim());
      }

      // Obtener conteos de usuarios para este tenant
      const counts = userCounts[tenant.id] || { total: 0, active: 0 };

      return {
        id: tenant.id,
        businessName: tenant.businessname,
        businessRTN: tenant.businessrtn,
        businessEmail: tenant.businessemail,
        businessAddress: tenant.businessaddress,
        tenantCode: tenant.tenant_code,
        phoneNumber: tenant.phonenumber || tenant.phoneNumber || null,
        country: tenant.country,
        timezone: tenant.timezone,
        currency: tenant.currency,
        subscriptionPlan: tenant.subscriptionplan,
        subscriptionPlans,
        maxUsers: tenant.maxusers,
        maxStorage: tenant.maxstorage,
        maxTransactions: tenant.maxtransactions,
        monthlyCost: tenant.monthlycost,
        modules,
        isActive: tenant.isactive,
        createdAt: tenant.createdat,
        updatedAt: tenant.updatedat,
        userCounts: {},
        totalUsers: counts.total,
        activeUsers: counts.active
      };
    });

    return NextResponse.json({
      success: true,
      tenants: formattedTenants,
      pagination: {
        page,
        limit,
        total: filteredTenants.length,
        pages: Math.ceil(filteredTenants.length / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/tenants:', error);
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
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id } = await params;

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string))) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const updateData = await req.json();

    const { data: updated, error: updateError } = await supabase
      .from('Tenant')
      .update({
        ...(updateData.maxStorage !== undefined && { maxstorage: updateData.maxStorage }),
        ...(updateData.maxUsers !== undefined && { maxusers: updateData.maxUsers }),
        ...(updateData.maxTransactions !== undefined && { maxtransactions: updateData.maxTransactions }),
        ...(updateData.monthlyCost !== undefined && { monthlycost: updateData.monthlyCost }),
        ...(updateData.modules !== undefined && { modules: updateData.modules }),
        updatedat: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant: updated });

  } catch (error: any) {
    console.error('Error en PATCH /api/admin/tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let userRole: string | undefined;
    let email = '';
    try {
      const clerkUser = await clerk.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress || '';
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const newTenant = await req.json();
    
    // Generar tenant_code si no viene
    const tenantCode = newTenant.tenantCode || (newTenant.businessName || 'EMP')
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X') + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Manejar subscriptionPlans
    let subscriptionPlan = newTenant.subscriptionPlans;
    if (typeof subscriptionPlan === 'string') {
      subscriptionPlan = subscriptionPlan;
    } else if (Array.isArray(subscriptionPlan)) {
      subscriptionPlan = JSON.stringify(subscriptionPlan);
    } else {
      subscriptionPlan = '[]';
    }

    // Generar ID único
    const tenantId = 'c' + randomBytes(24).toString('base64url').substring(0, 24);
    
    const now = new Date().toISOString();
    
    // Usar Supabase REST client (funciona con este proyecto)
    const { data: createdTenant, error: insertError } = await supabase
      .from('Tenant')
      .insert({
        id: tenantId,
        businessname: newTenant.businessName || '',
        businessrtn: newTenant.businessRTN || '',
        businessemail: newTenant.businessEmail || '',
        businessaddress: newTenant.businessAddress || '',
        tenant_code: tenantCode,
        phonenumber: newTenant.phoneNumber || '',
        subscriptionplan: subscriptionPlan,
        maxusers: newTenant.maxUsers ?? 5,
        maxstorage: newTenant.maxStorage ?? 100,
        maxtransactions: newTenant.maxTransactions ?? 10000,
        monthlycost: newTenant.monthlyCost || 0,
        modules: newTenant.modules || null,
        country: 'HN',
        timezone: 'America/Tegucigalpa',
        currency: 'HNL',
        isactive: true,
        createdat: now,
        updatedat: now,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Supabase insert error:', JSON.stringify(insertError, null, 2));
      let errorMsg = `Error al crear tenant: ${insertError.message || 'Error desconocido'}`;
      if (insertError.code === '23505') {
        if (insertError.message?.includes('businessrtn') || insertError.message?.includes('business_rtn')) {
          errorMsg = 'Ya existe un tenant con ese RTN. Use un RTN diferente.';
        } else if (insertError.message?.includes('businessemail') || insertError.message?.includes('business_email')) {
          errorMsg = 'Ya existe un tenant con ese email. Use un email diferente.';
        } else if (insertError.message?.includes('tenant_code')) {
          errorMsg = 'Ya existe un tenant con ese código.';
        } else {
          errorMsg = 'Ya existe un registro con esos datos. Verifique la información ingresada.';
        }
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: 409 }
      );
    }

    if (!createdTenant?.id) {
      console.error('Tenant created but no ID returned:', JSON.stringify(createdTenant, null, 2));
      return NextResponse.json(
        { error: 'Tenant creado pero no se pudo obtener el ID' },
        { status: 500 }
      );
    }

    // Verificar que el tenant existe en la BD antes de crear el usuario
    const { data: verifyTenant } = await supabase
      .from('Tenant')
      .select('id')
      .eq('id', createdTenant.id)
      .single();

    if (!verifyTenant) {
      console.error('Tenant not found after insert. ID:', createdTenant.id);
      return NextResponse.json(
        { error: 'Tenant creado pero no se encontró en la base de datos' },
        { status: 500 }
      );
    }

    // Crear usuario admin en Clerk y en la BD
    const adminUser = newTenant.adminUser;
    let createdAdmin = null;
    let adminError = null;

    if (adminUser?.email) {
      try {
        const tempPassword = 'Contab' + Math.random().toString(36).slice(-6).toUpperCase() + '1!';
        
        // Llamada directa a la API REST de Clerk
        let clerkResponse = await fetch('https://api.clerk.com/v1/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: [adminUser.email],
            username: adminUser.email.split('@')[0],
            first_name: adminUser.firstName || '',
            last_name: adminUser.lastName || '',
            password: tempPassword,
            public_metadata: {
              role: 'ADMIN',
              tenant_id: tenantId,
              tenant_code: tenantCode,
            },
          }),
        });

        let clerkData = await clerkResponse.json();
        let clerkUserId = clerkData.id;
        let isNewUser = true;

        // Si el email ya existe, buscar el usuario existente y actualizar su metadata
        if (!clerkResponse.ok && clerkData.errors?.[0]?.message?.includes('taken')) {
          const searchResp = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(adminUser.email)}`, {
            headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` },
          });
          const searchData = await searchResp.json();
          if (searchData.data?.length > 0) {
            clerkUserId = searchData.data[0].id;
            isNewUser = false;

            // Actualizar metadata del usuario existente
            await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                public_metadata: {
                  role: 'ADMIN',
                  tenant_id: tenantId,
                  tenant_code: tenantCode,
                },
              }),
            });
          } else {
            adminError = `Clerk API ${clerkResponse.status}: ${clerkData.errors?.[0]?.message || JSON.stringify(clerkData)}`;
          }
        } else if (!clerkResponse.ok) {
          adminError = `Clerk API ${clerkResponse.status}: ${clerkData.errors?.[0]?.message || JSON.stringify(clerkData)}`;
        }

        if (!adminError) {
          const { randomUUID } = await import('crypto');
          const { data: insertedUser, error: userInsertError } = await supabase
            .from('User')
            .insert([{
              id: randomUUID(),
              email: adminUser.email,
              firstname: adminUser.firstName || '',
              lastname: adminUser.lastName || '',
              role: 'ADMIN',
              tenantid: tenantId,
              isactive: true,
              passwordhash: tempPassword,
              createdat: now,
              updatedat: now,
            }])
            .select()
            .single();

          if (userInsertError) {
            console.error('USER INSERT ERROR:', JSON.stringify(userInsertError, null, 2));
          }
          createdAdmin = { email: adminUser.email, tempPassword: isNewUser ? tempPassword : '(ya existía en Clerk)', dbId: insertedUser?.id };
        }
      } catch (userError: any) {
        adminError = `Clerk error: ${userError.message || String(userError)}`;
        console.error('CLERK ERROR FULL:', JSON.stringify(userError, null, 2));
        console.error('CLERK ERROR RESPONSE:', JSON.stringify(userError?.response, null, 2));
        console.error('CLERK ERROR ERRORS:', JSON.stringify(userError?.errors, null, 2));
      }
    } else {
      adminError = 'No se proporcionó email de administrador';
    }

    return NextResponse.json({
      success: true,
      message: adminUser?.email ? 'Tenant y usuario admin creados exitosamente' : 'Tenant creado exitosamente',
      tenant: createdTenant,
      admin: createdAdmin,
      ...(adminError ? { adminError } : {})
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/admin/tenants:', error);
    return NextResponse.json(
      { error: `Error del servidor: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}

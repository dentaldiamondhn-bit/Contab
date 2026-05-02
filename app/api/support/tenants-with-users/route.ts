import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    
    // Get email from Clerk user
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isTestEmail = email === 'dentaldiamondhn@gmail.com';

    // Allow SUPPORT, SUPER_ADMIN, or test emails
    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail && !isTestEmail)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener todos los tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('id, businessname, tenant_code, businessemail, businessaddress, businessrtn, subscriptionplan, maxusers, isactive, createdat, updatedat');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      return NextResponse.json(
        { error: 'Error al obtener tenants' },
        { status: 500 }
      );
    }

    // Obtener todos los usuarios de la base de datos
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, email, firstname, lastname, role, isactive, tenantid, createdat, authid');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    // Asociar usuarios a cada tenant
    const tenantsWithUsers = tenants.map((tenant: any) => {
      const tenantUsers = users.filter((user: any) => user.tenantid === tenant.id);
      
      return {
        id: tenant.id,
        businessName: tenant.businessname,
        tenantCode: tenant.tenant_code,
        businessEmail: tenant.businessemail,
        businessAddress: tenant.businessaddress,
        businessRTN: tenant.businessrtn,
        subscriptionPlan: tenant.subscriptionplan,
        maxUsers: tenant.maxusers,
        isActive: tenant.isactive,
        createdAt: tenant.createdat,
        updatedAt: tenant.updatedat,
        users: tenantUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstname,
          lastName: user.lastname,
          role: user.role,
          isActive: user.isactive,
          authId: user.authid,
          createdAt: user.createdat
        })),
        userCount: tenantUsers.length,
        activeUserCount: tenantUsers.filter((u: any) => u.isactive).length
      };
    });

    return NextResponse.json({
      success: true,
      tenants: tenantsWithUsers,
      totalTenants: tenants.length,
      totalUsers: users.length
    });

  } catch (error: any) {
    console.error('Error in tenants-with-users:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

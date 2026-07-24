import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    // Get user from Clerk to check role
    let userRole: string | undefined;
    let email = '';
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress || '';
      
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
      
      console.log('API /admin/stats - Clerk role:', userRole);
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
      console.log('API /admin/stats - Access denied, role:', userRole);
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('API /admin/stats - Access granted for role:', userRole);

    // Obtener estadísticas del sistema usando Supabase
    const { count: totalTenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeTenants, error: activeTenantsError } = await supabase
      .from('Tenant')
      .select('*', { count: 'exact', head: true })
      .eq('isactive', true);
    
    const { count: totalUsers, error: usersError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('isactive', true);

    // Obtener datos de almacenamiento por tenant
    const { data: tenantsStorage, error: storageError } = await supabase
      .from('Tenant')
      .select('id, businessname, tenant_code, maxstorage, isactive')
      .eq('isactive', true);

    if (tenantsError || usersError) {
      console.error('Error fetching stats:', { tenantsError, usersError });
    }

    // Calcular totales de almacenamiento
    const totalAllocatedGB = tenantsStorage?.reduce((sum, t) => sum + (t.maxstorage || 100), 0) || 0;
    const tenantStorageBreakdown = tenantsStorage?.map(t => ({
      tenantId: t.id,
      businessName: t.businessname,
      tenantCode: t.tenant_code,
      maxStorageGB: t.maxstorage || 100,
    })) || [];

    console.log('Stats:', { 
      totalTenants: totalTenants || 0, 
      activeTenants: activeTenants || 0, 
      totalUsers: totalUsers || 0, 
      activeUsers: activeUsers || 0 
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalRevenue: 0,
        storage: {
          totalAllocatedGB,
          tenantBreakdown: tenantStorageBreakdown,
        },
        recentActivity: []
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

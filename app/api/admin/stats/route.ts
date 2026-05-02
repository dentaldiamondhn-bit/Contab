import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
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

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

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

    if (tenantsError || usersError) {
      console.error('Error fetching stats:', { tenantsError, usersError });
    }

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

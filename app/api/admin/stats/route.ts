import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

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

    // Obtener estadísticas del sistema
    const totalTenants = await db.tenant.count();
    const activeTenants = await db.tenant.count({ where: { isActive: true } });
    const totalUsers = await db.user.count();
    const activeUsers = await db.user.count({ where: { isActive: true } });

    console.log('Stats:', { totalTenants, activeTenants, totalUsers, activeUsers });

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        totalUsers,
        activeUsers,
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

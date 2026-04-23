import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || !['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener estadísticas del sistema
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      recentActivity,
      monthlyRevenue
    ] = await Promise.all([
      // Total tenants
      db.tenant.count(),
      
      // Active tenants
      db.tenant.count({ where: { isActive: true } }),
      
      // Total users
      db.user.count(),
      
      // Active users
      db.user.count({ where: { isActive: true } }),
      
      // Recent activity (simulado - en producción sería de una tabla de logs)
      db.$queryRaw<Array<{
        type: string;
        description: string;
        timestamp: Date;
        tenantName: string;
      }>>`
        SELECT 
          'tenant_created' as type,
          'Nuevo tenant registrado' as description,
          created_at as timestamp,
          business_name as tenantName
        FROM Tenant 
        WHERE datetime(created_at) >= datetime('now', '-1 day')
        
        UNION ALL
        
        SELECT 
          'user_created' as type,
          'Nuevo usuario registrado' as description,
          created_at as timestamp,
          t.business_name as tenantName
        FROM users u
        JOIN Tenant t ON u.tenant_id = t.id
        WHERE datetime(u.created_at) >= datetime('now', '-1 day')
        
        ORDER BY timestamp DESC
        LIMIT 10
      `,
      
      // Monthly revenue (simulado basado en subscription plans)
      db.tenant.groupBy({
        by: ['subscriptionPlan'],
        where: { isActive: true },
        _count: true
      }).then(groups => {
        const planPrices = {
          BASIC: 500,
          PROFESSIONAL: 1500,
          ENTERPRISE: 5000
        };
        
        return groups.reduce((total, group) => {
          const price = planPrices[group.subscriptionPlan as keyof typeof planPrices] || 0;
          return total + (group._count * price);
        }, 0);
      })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        totalUsers,
        activeUsers,
        totalRevenue: monthlyRevenue,
        recentActivity: recentActivity.map((activity) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: activity.type,
          description: activity.description,
          timestamp: activity.timestamp,
          tenantName: activity.tenantName
        }))
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

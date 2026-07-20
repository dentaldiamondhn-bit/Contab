import { NextResponse } from 'next/server';
import { getEnhancedAuth } from '@/lib/auth-server';
import { selectGlobalServer } from '@/lib/supabase/server-final';

export async function GET() {
  try {
    const auth = await getEnhancedAuth();
    
    // Seguridad: Solo Super Admin o Soporte
    if (!auth.canAccessAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 1. Obtener todos los tenants
    const tenants = await selectGlobalServer<any>('Tenant');
    
    // 2. Obtener total de usuarios
    const users = await selectGlobalServer<any>('User');

    // 3. Obtener transacciones recientes (ejemplo de volumen global)
    const recentTransactions = await selectGlobalServer<any>('Transaction', {
      limit: 10,
      orderBy: { column: 'createdAt', ascending: false }
    });

    // 4. Calcular mÃ©tricas agregadas
    const metrics = {
      summary: {
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.isActive).length,
        totalUsers: users.length,
        trialTenants: tenants.filter(t => t.planid === 'BASIC').length,
        premiumTenants: tenants.filter(t => t.planid === 'PRO').length,
      },
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.businessName,
        plan: t.planid,
        status: t.isActive ? 'active' : 'inactive'
      })),
      recentActivity: recentTransactions
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching global metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


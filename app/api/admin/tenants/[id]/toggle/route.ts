import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('PATCH /api/admin/tenants/[id]/toggle llamado');
    
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    console.log('Auth check:', { userId, userRole });

    // Get email from Clerk user
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        console.log('User email:', email);
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    console.log('Super admin check:', { email, isSuperAdminEmail });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('Unauthorized access');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id: tenantId } = await context.params;
    console.log('Tenant ID:', tenantId);

    // Obtener el tenant actual
    const currentTenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    console.log('Current tenant:', currentTenant);

    if (!currentTenant) {
      console.log('Tenant not found');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Cambiar el estado del tenant
    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: !currentTenant.isActive
      }
    });

    console.log('Updated tenant:', updatedTenant);

    return NextResponse.json({
      success: true,
      tenant: updatedTenant,
      message: `Tenant ${updatedTenant.isActive ? 'activado' : 'suspendido'} exitosamente`
    });

  } catch (error: any) {
    console.error('Error al cambiar estado del tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

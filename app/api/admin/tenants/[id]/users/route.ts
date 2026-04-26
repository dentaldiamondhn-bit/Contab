import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { RealDB } from '@/lib/real-db';

// Inicializar Clerk con la secret key del servidor
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id: tenantId } = await params;

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

    const body = await req.json();
    const { email: userEmail, firstName, lastName, username, password, role } = body;

    // Validar datos requeridos
    if (!userEmail || !firstName || !lastName || !password || !role) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el tenant exista
    const tenants = await RealDB.getRealTenants();
    const tenant = tenants.find(t => t.id === tenantId);

    if (!tenant) {
      console.log('❌ Tenant no encontrado:', tenantId);
      console.log('📊 Tenants disponibles:', tenants.map(t => t.id));
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el email no exista ya en Clerk
    const existingUsers = await clerk.users.getUserList({
      emailAddress: [userEmail],
      limit: 1
    });

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'El email ya está registrado en Clerk' },
        { status: 409 }
      );
    }

    // TODO: Implementar verificación y creación en base de datos local cuando esté disponible
    // Por ahora, solo creamos usuarios en Clerk

    // Crear usuario en Clerk
    console.log('Intentando crear usuario en Clerk:', {
      email: userEmail,
      firstName,
      lastName,
      role,
      tenantId: tenant.id,
      tenantCode: tenant.tenantCode
    });

    const clerkUser = await clerk.users.createUser({
      emailAddress: [userEmail],
      firstName,
      lastName,
      password,
      username: username || `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
      publicMetadata: {
        role,
        tenantId: tenant.id,
        tenantCode: tenant.tenantCode,
        permissions: getPermissionsForRole(role),
        isolation: {
          tenantScope: true,
          crossTenantAccess: false,
          dataVisibility: 'tenant_only'
        }
      }
    });

    console.log('Usuario creado en Clerk exitosamente:', clerkUser.id);

    return NextResponse.json({
      success: true,
      user: {
        id: clerkUser.id,
        email: userEmail,
        firstName,
        lastName,
        role,
        tenantId: tenant.id,
        tenantCode: tenant.tenantCode
      },
      message: 'Usuario creado exitosamente en Clerk'
    });

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message || 'Unknown error',
        clerkError: error.clerkError || null
      },
      { status: 500 }
    );
  }
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'ADMIN':
      return [
        'tenant:admin',
        'users:tenant_manage',
        'inventory:manage',
        'accounting:manage',
        'reports:tenant'
      ];
    case 'MANAGER':
      return [
        'tenant:manage',
        'users:tenant_view',
        'inventory:manage',
        'accounting:manage',
        'reports:tenant'
      ];
    case 'ACCOUNTANT':
      return [
        'accounting:manage',
        'reports:tenant'
      ];
    case 'VIEWER':
      return [
        'reports:tenant'
      ];
    case 'USER':
      return [
        'reports:tenant'
      ];
    default:
      return [];
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id: tenantId } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToDelete = searchParams.get('userId');

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

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: 'Se requiere el ID del usuario a eliminar' },
        { status: 400 }
      );
    }

    // Protección: No permitir eliminar al super admin principal
    try {
      const client = await clerkClient();
      const userToDelete = await client.users.getUser(userIdToDelete);
      const userToDeleteEmail = userToDelete.emailAddresses[0]?.emailAddress || '';
      
      if (userToDeleteEmail === 'sucachi.123@gmail.com') {
        console.log('🔒 Intento de eliminar super admin bloqueado:', userToDeleteEmail);
        return NextResponse.json(
          { error: 'No se puede eliminar al super admin principal' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error verificando usuario a eliminar:', error);
      return NextResponse.json(
        { error: 'Error verificando usuario a eliminar' },
        { status: 500 }
      );
    }

    // TODO: Implementar verificación en base de datos local cuando esté disponible
    // Por ahora, solo eliminamos de Clerk

    // Eliminar usuario de Clerk
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userIdToDelete);
    } catch (error) {
      console.error(`Error eliminando usuario ${userIdToDelete} de Clerk:`, error);
      return NextResponse.json(
        { error: 'Error eliminando usuario de Clerk' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

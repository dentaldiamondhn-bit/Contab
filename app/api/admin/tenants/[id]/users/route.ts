import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { db } from '@/lib/db';

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
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
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

    // Verificar que el email no exista en la base de datos local
    const existingLocalUser = await db.user.findUnique({
      where: { email: userEmail }
    });

    if (existingLocalUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado en el sistema' },
        { status: 409 }
      );
    }

    // Validar límite de usuarios del tenant
    const currentUserCount = await db.user.count({
      where: { 
        tenantId: tenantId,
        isActive: true 
      }
    });

    if (currentUserCount >= (tenant.maxUsers || 5)) {
      return NextResponse.json(
        { error: `El tenant ha alcanzado su límite de ${tenant.maxUsers || 5} usuarios` },
        { status: 400 }
      );
    }

    // Crear usuario en Clerk
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

    // Crear usuario en base de datos local
    const localUser = await db.user.create({
      data: {
        authId: clerkUser.id,
        email: userEmail,
        firstName,
        lastName,
        role,
        tenantId: tenant.id,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      user: localUser,
      message: 'Usuario creado exitosamente'
    });

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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

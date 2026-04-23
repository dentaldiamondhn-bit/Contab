import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { db } from '@/lib/db';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo SUPER_ADMIN puede sincronizar metadatos.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    console.log('Syncing metadata for email:', email);

    // Buscar usuario en Clerk
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en Clerk' },
        { status: 404 }
      );
    }

    const clerkUser = users[0];
    console.log('Found Clerk user:', {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      currentMetadata: clerkUser.publicMetadata
    });

    // Verificar si el usuario existe en la base de datos local
    const localUser = await db.user.findUnique({
      where: { email },
      select: { id: true, role: true, tenantId: true, isActive: true }
    });

    if (!localUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos local' },
        { status: 404 }
      );
    }

    console.log('Found local user:', localUser);

    // Actualizar metadatos en Clerk si es necesario
    const currentRole = clerkUser.publicMetadata?.role;
    const needsUpdate = currentRole !== localUser.role;

    if (needsUpdate) {
      console.log('Updating Clerk metadata:', {
        currentRole,
        newRole: localUser.role
      });

      await clerk.users.updateUser(clerkUser.id, {
        publicMetadata: {
          role: localUser.role,
          tenantId: localUser.tenantId,
          tenantCode: localUser.tenantId ? (await db.tenant.findUnique({
            where: { id: localUser.tenantId },
            select: { tenantCode: true } as any
          }))?.tenantCode : null,
          permissions: getPermissionsForRole(localUser.role),
          isolation: getIsolationForRole(localUser.role)
        }
      });

      console.log('Clerk metadata updated successfully');
    } else {
      console.log('Clerk metadata already up to date');
    }

    return NextResponse.json({
      success: true,
      message: needsUpdate ? 'Metadatos sincronizados exitosamente' : 'Metadatos ya están actualizados',
      clerkUser: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: needsUpdate ? localUser.role : currentRole
      },
      localUser
    });

  } catch (error: any) {
    console.error('Error syncing user metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        'system:admin',
        'users:manage',
        'tenants:manage',
        'audit:view',
        'reports:all',
        'tenant:*:access'
      ];
    case 'SUPPORT':
      return [
        'users:view',
        'tenants:view',
        'audit:view',
        'reports:view',
        'tenant:*:view'
      ];
    case 'ADMIN':
      return [
        'users:manage',
        'inventory:manage',
        'invoices:manage',
        'reports:view'
      ];
    case 'MANAGER':
      return [
        'inventory:view',
        'invoices:view',
        'reports:view'
      ];
    case 'USER':
      return [
        'inventory:view',
        'invoices:view'
      ];
    case 'VIEWER':
      return [
        'inventory:read',
        'invoices:read'
      ];
    default:
      return [];
  }
}

function getIsolationForRole(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        tenantScope: false,
        crossTenantAccess: true,
        dataVisibility: 'all_tenants'
      };
    case 'SUPPORT':
      return {
        tenantScope: false,
        crossTenantAccess: true,
        dataVisibility: 'all_tenants'
      };
    default:
      return {
        tenantScope: true,
        crossTenantAccess: false,
        dataVisibility: 'own_tenant'
      };
  }
}

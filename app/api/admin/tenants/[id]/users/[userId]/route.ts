import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// Función para obtener permisos según el rol
function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        'system:admin',
        'tenants:manage',
        'users:global_manage',
        'billing:manage',
        'reports:global'
      ];
    case 'ADMIN':
      return [
        'tenant:admin',
        'users:tenant_manage',
        'inventory:manage',
        'accounting:manage',
        'reports:tenant',
        'billing:tenant_manage'
      ];
    case 'MANAGER':
      return [
        'users:tenant_manage',
        'inventory:manage',
        'accounting:view',
        'reports:tenant',
        'billing:tenant_view'
      ];
    case 'ACCOUNTANT':
      return [
        'accounting:manage',
        'reports:financial',
        'inventory:view'
      ];
    case 'USER':
      return [
        'inventory:view',
        'accounting:view',
        'reports:basic'
      ];
    case 'VIEWER':
      return [
        'reports:view'
      ];
    default:
      return [];
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;
    const { id: tenantId, userId: targetUserId } = await params;

    console.log('Auth check - PUT:', { userId, sessionClaims, userRole, userEmail, targetUserId });

    // Verificar autorización
    if (!userId) {
      console.log('No userId found');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Intentar obtener email del usuario si sessionClaims no funciona
    let currentUserEmail = userEmail;
    if (!currentUserEmail) {
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        currentUserEmail = user.primaryEmailAddress?.emailAddress;
        console.log('Email obtenido de Clerk:', currentUserEmail);
      } catch (clerkError) {
        console.error('Error obteniendo email de Clerk:', clerkError);
      }
    }

    // Verificar si es SUPER_ADMIN por rol o por email específico
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || currentUserEmail === 'sucachi.123@gmail.com';
    
    console.log('SuperAdmin check:', { userRole, currentUserEmail, isSuperAdmin });
    
    if (!isSuperAdmin) {
      console.log('Not authorized - userRole:', userRole, 'email:', currentUserEmail);
      return NextResponse.json({ 
        error: `No autorizado. Rol: ${userRole}, Email: ${currentUserEmail}. Se requiere SUPER_ADMIN o email sucachi.123@gmail.com` 
      }, { status: 403 });
    }

    // Protección: No permitir modificar al super admin principal
    try {
      const clerk = await clerkClient();
      const targetUser = await clerk.users.getUser(targetUserId);
      const targetUserEmail = targetUser.emailAddresses[0]?.emailAddress || '';
      
      if (targetUserEmail === 'sucachi.123@gmail.com') {
        console.log('🔒 Intento de modificar super admin bloqueado:', targetUserEmail);
        return NextResponse.json(
          { error: 'No se puede modificar al super admin principal' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error verificando usuario a modificar:', error);
      return NextResponse.json(
        { error: 'Error verificando usuario a modificar' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, role, isActive, password } = body;

    console.log('Datos recibidos en PUT:', { firstName, lastName, role, isActive, password: !!password });

    // Validar datos requeridos
    if (!firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario existe y pertenece al tenant
    const existingUser = await db.user.findFirst({
      where: {
        id: targetUserId,
        tenantId: tenantId
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar contraseña en Clerk si se proporciona
    if (password && password.trim() !== '' && existingUser.authId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(existingUser.authId, {
          password: password
        });
        console.log('Contraseña actualizada en Clerk para usuario:', existingUser.authId);
      } catch (clerkError: any) {
        console.error('Error actualizando contraseña en Clerk:', clerkError);
        return NextResponse.json(
          { error: 'Error al actualizar contraseña en Clerk: ' + clerkError.message },
          { status: 500 }
        );
      }
    }

    // Actualizar metadata en Clerk si el rol cambió
    if (existingUser.authId && role !== existingUser.role) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(existingUser.authId, {
          publicMetadata: {
            role: role,
            tenantId: tenantId,
            permissions: getPermissionsForRole(role)
          }
        });
        console.log('Metadata actualizada en Clerk para usuario:', existingUser.authId, 'nuevo rol:', role);
      } catch (clerkError: any) {
        console.error('Error actualizando metadata en Clerk:', clerkError);
        // No fallar completamente si la metadata no se actualiza
        console.log('Continuando con actualización local...');
      }
    }

    // Actualizar usuario en la base de datos local
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        firstName,
        lastName,
        role,
        isActive
      }
    });

    console.log('Usuario actualizado en base de datos:', updatedUser);

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;
    const { id: tenantId, userId: targetUserId } = await params;

    // Verificar autorización
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si es SUPER_ADMIN por rol o por email específico
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'sucachi.123@gmail.com';
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener usuario específico del tenant
    const user = await db.user.findFirst({
      where: {
        id: targetUserId,
        tenantId: tenantId
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Error obteniendo usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

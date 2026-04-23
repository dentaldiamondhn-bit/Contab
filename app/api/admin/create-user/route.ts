import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// Inicializar Clerk con la secret key del servidor
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  publicMetadata: {
    role: string;
    tenantId: string;
    tenantCode: string;
    permissions: string[];
    isolation: {
      tenantScope: boolean;
      crossTenantAccess: boolean;
      dataVisibility: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo SUPER_ADMIN puede crear usuarios.' },
        { status: 403 }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { email, firstName, lastName, password, publicMetadata } = body;

    // Validar datos requeridos
    if (!email || !firstName || !lastName || !password || !publicMetadata) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Validar que el tenant exista
    const tenant = await db.tenant.findUnique({
      where: { id: publicMetadata.tenantId },
      select: { id: true, businessName: true, tenantCode: true, isActive: true }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'El tenant especificado no existe' },
        { status: 404 }
      );
    }

    if (!tenant.isActive) {
      return NextResponse.json(
        { error: 'El tenant especificado no está activo' },
        { status: 400 }
      );
    }

    // Validar que el tenantCode coincida
    if (tenant.tenantCode !== publicMetadata.tenantCode) {
      return NextResponse.json(
        { error: 'El código de tenant no coincide' },
        { status: 400 }
      );
    }

    // Verificar que el email no exista ya en Clerk
    try {
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1
      });

      if (existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'El email ya está registrado en Clerk' },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error('Error verificando usuario existente en Clerk:', error);
    }

    // Verificar que el email no exista en la base de datos local
    const existingLocalUser = await db.user.findUnique({
      where: { email }
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
        tenantId: publicMetadata.tenantId,
        isActive: true 
      }
    });

    const tenantDetails = await db.tenant.findUnique({
      where: { id: publicMetadata.tenantId },
      select: { maxUsers: true }
    });

    if (currentUserCount >= (tenantDetails?.maxUsers || 5)) {
      return NextResponse.json(
        { error: `El tenant ha alcanzado su límite de ${tenantDetails?.maxUsers || 5} usuarios` },
        { status: 400 }
      );
    }

    // Crear usuario en Clerk
    let clerkUser: any;
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        password,
        publicMetadata: {
          role: publicMetadata.role,
          tenantId: publicMetadata.tenantId,
          tenantCode: publicMetadata.tenantCode,
          permissions: publicMetadata.permissions,
          isolation: publicMetadata.isolation
        }
      });
    } catch (clerkError: any) {
      console.error('Error creando usuario en Clerk:', clerkError);
      return NextResponse.json(
        { error: `Error en Clerk: ${clerkError.errors?.[0]?.message || clerkError.message}` },
        { status: 500 }
      );
    }

    // Crear usuario en base de datos local
    let localUser: any;
    try {
      localUser = await db.user.create({
        data: {
          authId: clerkUser.id,
          email,
          firstName,
          lastName,
          role: publicMetadata.role,
          tenantId: publicMetadata.tenantId,
          isActive: true
        }
      });
    } catch (dbError: any) {
      console.error('Error creando usuario en BD local:', dbError);
      
      // Intentar rollback en Clerk
      if (clerkUser?.id) {
        try {
          await clerk.users.deleteUser(clerkUser.id);
        } catch (rollbackError) {
          console.error('Error en rollback de Clerk:', rollbackError);
        }
      }

      return NextResponse.json(
        { error: 'Error creando usuario en base de datos local' },
        { status: 500 }
      );
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        role: localUser.role,
        tenantId: localUser.tenantId || null,
        clerkId: clerkUser.id
      },
      message: 'Usuario creado exitosamente'
    });

  } catch (error: any) {
    console.error('Error general en create-user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información de tenants (solo SUPER_ADMIN)
export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        businessName: true,
        tenantCode: true,
        businessEmail: true,
        subscriptionPlan: true,
        maxUsers: true,
        isActive: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        businessName: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      tenants
    });

  } catch (error: any) {
    console.error('Error obteniendo tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

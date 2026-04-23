import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Solo SUPER_ADMIN y SUPPORT pueden acceder
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Para SUPPORT, información básica de usuarios
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        tenant: {
          select: {
            businessName: true,
            tenantCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear la respuesta
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      tenantName: user.tenant?.businessName || 'Sin tenant',
      tenantCode: user.tenant?.tenantCode || 'N/A',
      createdAt: user.createdAt
    }));

    return NextResponse.json({ 
      success: true,
      users: formattedUsers 
    });

  } catch (error: any) {
    console.error('Error en API de support/users:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Solo SUPER_ADMIN puede crear usuarios
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { email, firstName, lastName, role, tenantId, password } = body;

    // Validaciones básicas
    if (!email || !role || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el tenant exista
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
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

    // Verificar que el email no exista
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
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

    const tenantDetails = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true }
    });

    if (currentUserCount >= (tenantDetails?.maxUsers || 5)) {
      return NextResponse.json(
        { error: `El tenant ha alcanzado su límite de ${tenantDetails?.maxUsers || 5} usuarios` },
        { status: 400 }
      );
    }

    // Crear usuario en base de datos local
    const newUser = await db.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        tenantId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        tenant: {
          select: {
            businessName: true,
            tenantCode: true
          }
        }
      }
    });

    // TODO: Crear usuario en Clerk con metadata aislada
    // Esto requeriría integración con Clerk SDK

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        tenantName: newUser.tenant?.businessName,
        tenantCode: newUser.tenant?.tenantCode,
        createdAt: newUser.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Solo SUPER_ADMIN puede actualizar usuarios
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { userId: targetUserId, isActive, role } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // No permitir modificar SUPER_ADMIN
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { role: true }
    });

    if (targetUser?.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No se puede modificar un SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Actualizar usuario
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(role !== undefined && { role })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        tenant: {
          select: {
            businessName: true,
            tenantCode: true
          }
        }
      }
    });

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

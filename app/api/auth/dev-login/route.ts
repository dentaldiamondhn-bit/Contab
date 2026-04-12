import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar campos
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario en la BD
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Cuenta desactivada' },
        { status: 401 }
      );
    }

    // En modo desarrollo, aceptamos cualquier contraseña para el usuario demo
    // o verificamos contra una contraseña simple
    const isDemoUser = email.toLowerCase() === 'demo@contab.com';
    const isTestUser = email.toLowerCase() === 'test@contab.com';
    
    // Para desarrollo: demo@contab.com / demo123
    //               test@contab.com / test123
    const expectedPassword = isDemoUser ? 'demo123' : isTestUser ? 'test123' : null;
    
    if (expectedPassword && password !== expectedPassword) {
      return NextResponse.json(
        { message: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Si no es usuario demo/test, rechazar (solo para desarrollo)
    if (!isDemoUser && !isTestUser) {
      return NextResponse.json(
        { message: 'Solo usuarios demo/test permitidos en modo desarrollo' },
        { status: 401 }
      );
    }

    // Actualizar último login
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Retornar datos de usuario (sin contraseña)
    return NextResponse.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Error en login de desarrollo:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

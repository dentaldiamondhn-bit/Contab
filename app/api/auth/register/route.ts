import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, firstName, lastName, role, authId } = body;

    // Validate required fields
    if (!id || !email || !firstName || !lastName) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Correo electrónico inválido' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este correo ya está registrado' },
        { status: 409 }
      );
    }

    // Check if user with same auth_id exists
    if (authId) {
      const existingAuthUser = await db.user.findFirst({
        where: { authId: authId }
      });

      if (existingAuthUser) {
        return NextResponse.json(
          { message: 'Usuario ya existe en el sistema' },
          { status: 409 }
        );
      }
    }

    // Create user in database
    const user = await db.user.create({
      data: {
        id: id,
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role || 'business_owner',
        authId: authId,
        isActive: true,
        isVerified: false,
        preferredLanguage: 'es',
        timezone: 'America/Tegucigalpa',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log user creation activity (optional - can be stored in user_activities table via SQL)
    console.log(`[REGISTER] User ${user.email} (${user.id}) registered successfully`);

    return NextResponse.json(
      {
        message: 'Usuario creado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Este correo o ID ya está registrado' },
        { status: 409 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Error de referencia en la base de datos' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

// GET method to check if email is available
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email es requerido' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    return NextResponse.json(
      {
        available: !existingUser,
        email: email.toLowerCase()
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

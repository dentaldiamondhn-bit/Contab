import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  try {
    console.log('GET /api/user/profile - Using Clerk');
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const userProfile = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phoneNumbers[0]?.phoneNumber || null,
      role: (user.publicMetadata as any)?.role || 'USER',
      company: (user.publicMetadata as any)?.company || null,
      department: (user.publicMetadata as any)?.department || null,
      timezone: (user.publicMetadata as any)?.timezone || 'America/Tegucigalpa',
      language: (user.publicMetadata as any)?.language || 'es',
      email_notifications: (user.publicMetadata as any)?.email_notifications ?? true,
      push_notifications: (user.publicMetadata as any)?.push_notifications ?? true,
      two_factor_enabled: user.twoFactorEnabled || false,
      avatar_url: user.imageUrl || null,
      subscription_plan: (user.publicMetadata as any)?.subscription_plan || null,
      api_access: (user.publicMetadata as any)?.api_access ?? false,
      is_active: true,
      email_verified: user.emailAddresses[0]?.verification?.status === 'verified',
      last_sign_in_at: user.lastSignInAt || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
    
    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error en GET /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log('PUT /api/user/profile - Using Clerk');
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Datos recibidos:', body);

    const client = await clerkClient();
    
    // Actualizar metadata del usuario en Clerk
    const updatedUser = await client.users.updateUser(userId, {
      publicMetadata: {
        ...body
      }
    });

    console.log('Perfil actualizado en Clerk:', updatedUser.id);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.emailAddresses[0]?.emailAddress || '',
        first_name: updatedUser.firstName || '',
        last_name: updatedUser.lastName || '',
        phone: updatedUser.phoneNumbers[0]?.phoneNumber || null,
        role: (updatedUser.publicMetadata as any)?.role || 'USER',
        company: (updatedUser.publicMetadata as any)?.company || null,
        department: (updatedUser.publicMetadata as any)?.department || null,
        timezone: (updatedUser.publicMetadata as any)?.timezone || 'America/Tegucigalpa',
        language: (updatedUser.publicMetadata as any)?.language || 'es',
        email_notifications: (updatedUser.publicMetadata as any)?.email_notifications ?? true,
        push_notifications: (updatedUser.publicMetadata as any)?.push_notifications ?? true,
        two_factor_enabled: updatedUser.twoFactorEnabled || false,
        avatar_url: updatedUser.imageUrl || null,
        subscription_plan: (updatedUser.publicMetadata as any)?.subscription_plan || null,
        api_access: (updatedUser.publicMetadata as any)?.api_access ?? false,
        is_active: true,
        email_verified: updatedUser.emailAddresses[0]?.verification?.status === 'verified',
        last_sign_in_at: updatedUser.lastSignInAt || null,
        created_at: updatedUser.createdAt,
        updated_at: updatedUser.updatedAt,
      },
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}

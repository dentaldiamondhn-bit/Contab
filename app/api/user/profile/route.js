import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    console.log('GET /api/user/profile - Using Clerk + Supabase');
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const clerkEmail = user.emailAddresses[0]?.emailAddress || '';

    // Read role from Supabase users table (source of truth)
    let dbRole = null;
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role,tenantid,firstname,lastname')
        .eq('email', clerkEmail.toLowerCase())
        .single();
      if (dbUser) {
        dbRole = dbUser.role;
      }
    } catch (e) {
      console.log('Supabase lookup failed, falling back to Clerk metadata');
    }

    const finalRole = dbRole || (user.publicMetadata || {})?.role || 'USER';

    const userProfile = {
      id: user.id,
      email: clerkEmail,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phoneNumbers[0]?.phoneNumber || null,
      role: finalRole,
      company: (user.publicMetadata || {})?.company || null,
      department: (user.publicMetadata || {})?.department || null,
      timezone: (user.publicMetadata || {})?.timezone || 'America/Tegucigalpa',
      language: (user.publicMetadata || {})?.language || 'es',
      email_notifications: (user.publicMetadata || {})?.email_notifications ?? true,
      push_notifications: (user.publicMetadata || {})?.push_notifications ?? true,
      two_factor_enabled: user.twoFactorEnabled || false,
      avatar_url: user.imageUrl || null,
      subscription_plan: (user.publicMetadata || {})?.subscription_plan || null,
      api_access: (user.publicMetadata || {})?.api_access ?? false,
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

export async function PUT(request) {
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
        role: (updatedUser.publicMetadata || {})?.role || 'USER',
        company: (updatedUser.publicMetadata || {})?.company || null,
        department: (updatedUser.publicMetadata || {})?.department || null,
        timezone: (updatedUser.publicMetadata || {})?.timezone || 'America/Tegucigalpa',
        language: (updatedUser.publicMetadata || {})?.language || 'es',
        email_notifications: (updatedUser.publicMetadata || {})?.email_notifications ?? true,
        push_notifications: (updatedUser.publicMetadata || {})?.push_notifications ?? true,
        two_factor_enabled: updatedUser.twoFactorEnabled || false,
        avatar_url: updatedUser.imageUrl || null,
        subscription_plan: (updatedUser.publicMetadata || {})?.subscription_plan || null,
        api_access: (updatedUser.publicMetadata || {})?.api_access ?? false,
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

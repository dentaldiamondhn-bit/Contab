import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';
import bcrypt from 'bcryptjs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Get user from Clerk to check role
    let userRole: string | undefined;
    let email = '';
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'La contraseña es requerida' },
        { status: 400 }
      );
    }

    // Validar longitud mínima
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Obtener el usuario a actualizar
    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // No permitir resetear la contraseña del super admin principal
    if (existingUser.email === 'sucachi.123@gmail.com' && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No se puede modificar la contraseña del super administrador principal' },
        { status: 403 }
      );
    }

    // No permitir que SUPPORT resetee la contraseña de cualquier usuario SUPER_ADMIN
    if (userRole === 'SUPPORT' && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'El rol de soporte no puede modificar contraseñas de usuarios SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña en Supabase
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({ 
        passwordhash: hashedPassword,
        updatedat: new Date().toISOString(),
        passwordresettoken: null,
        passwordresetexpires: null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando contraseña', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

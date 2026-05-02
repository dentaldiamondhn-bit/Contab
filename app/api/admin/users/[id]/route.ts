import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase-db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id } = await params;

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

    // Obtener el usuario a eliminar
    const userToDelete = await db.user.findUnique({
      where: { id },
      include: {
        tenant: true
      }
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar SUPER_ADMIN
    if (userToDelete.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No se puede eliminar un SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Eliminar usuario de Clerk
    if (userToDelete.authId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(userToDelete.authId);
      } catch (error) {
        console.error(`Error eliminando usuario ${userToDelete.authId} de Clerk:`, error);
      }
    }

    // Eliminar usuario de la base de datos local
    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    // Get user from Clerk to check role
    let userRole: string | undefined;
    let email = '';
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress || '';
      
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'El rol es requerido' },
        { status: 400 }
      );
    }

    // Validar que el rol sea válido
    const validRoles = ['USER', 'VIEWER', 'MANAGER', 'ADMIN', 'SUPPORT', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
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

    // No permitir que un usuario normal cambie a SUPER_ADMIN (solo super admin email puede hacerlo)
    if (role === 'SUPER_ADMIN' && !isSuperAdminEmail) {
      return NextResponse.json(
        { error: 'Solo el super administrador puede asignar el rol SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // No permitir cambiar el rol del super admin principal
    if (existingUser.email === 'sucachi.123@gmail.com' && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No se puede modificar el rol del super administrador principal' },
        { status: 403 }
      );
    }

    // No permitir que SUPPORT cambie el rol de cualquier usuario SUPER_ADMIN
    if (userRole === 'SUPPORT' && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'El rol de soporte no puede modificar usuarios SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Actualizar rol en Supabase
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({ 
        role: role,
        updatedat: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando rol', details: updateError },
        { status: 500 }
      );
    }

    // También actualizar el rol en Clerk si el usuario tiene authId
    if (existingUser.authId) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(existingUser.authId, {
          publicMetadata: { role },
          unsafeMetadata: { role }
        });
      } catch (clerkError) {
        console.error('Error updating role in Clerk:', clerkError);
        // No fallar si Clerk falla, pero loggear el error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

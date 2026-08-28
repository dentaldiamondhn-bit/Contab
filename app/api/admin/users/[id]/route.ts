import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { supabase } from '@/lib/supabase-db';
import { getUserRoleFromAuth } from '@/lib/auth-server';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const SUPER_ADMIN_EMAIL = 'sucachi.123@gmail.com';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    const { data: currentUser } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (currentUser.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'No se puede eliminar al super administrador' }, { status: 403 });
    }

    if (currentUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No se puede eliminar un SUPER_ADMIN' }, { status: 403 });
    }

    if (currentUser.authid) {
      try {
        await clerk.users.deleteUser(currentUser.authid);
      } catch (error) {
        console.error('Error eliminando usuario de Clerk:', error);
      }
    }

    await supabase.from('User').delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, tenantId } = body;

    const validRoles = ['USER', 'VIEWER', 'MANAGER', 'ADMIN', 'SUPPORT', 'SUPER_ADMIN', 'ACCOUNTANT'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (existingUser.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'No se puede modificar el super administrador principal' }, { status: 403 });
    }

    // SUPPORT role cannot modify SUPER_ADMIN users
    const callerRole = (await getUserRoleFromAuth()).toUpperCase();
    if (callerRole === 'SUPPORT' && existingUser.role?.toUpperCase() === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Los usuarios de soporte no pueden modificar super administradores' }, { status: 403 });
    }

    const updateData: any = {
      updatedat: new Date().toISOString()
    };
    if (role) updateData.role = role;
    if (tenantId !== undefined) {
      updateData.tenantid = tenantId || '';
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Error actualizando usuario', details: updateError }, { status: 500 });
    }

    if (existingUser.authid) {
      try {
        const clerkMetadata: any = { role: role || existingUser.role };
        if (tenantId !== undefined) {
          clerkMetadata.tenantId = tenantId || '';
          clerkMetadata.tenantCode = '';
          if (tenantId) {
            const { data: tenant } = await supabase
              .from('Tenant')
              .select('tenant_code')
              .eq('id', tenantId)
              .single();
            if (tenant) clerkMetadata.tenantCode = tenant.tenant_code;
          }
        }
        await clerk.users.updateUser(existingUser.authid, {
          publicMetadata: clerkMetadata,
          unsafeMetadata: { role: role || existingUser.role }
        });
      } catch (clerkError) {
        console.error('Error updating in Clerk:', clerkError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

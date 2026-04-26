import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

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

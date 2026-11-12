import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserRoleFromAuth } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();
    
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
    const isTestEmail = email === 'dentaldiamondhn@gmail.com';

    // Allow SUPPORT, SUPER_ADMIN, or test emails
    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole) && !isSuperAdminEmail && !isTestEmail)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId: targetUserId, newPassword } = body;

    if (!targetUserId || !newPassword) {
      return NextResponse.json(
        { error: 'Se requiere userId y newPassword' },
        { status: 400 }
      );
    }

    // Validar contraseña
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Obtener información del usuario objetivo para verificar su rol
    let targetUserRole: string | undefined;
    try {
      const client = await clerkClient();
      const targetUser = await client.users.getUser(targetUserId);
      targetUserRole = 
        targetUser.publicMetadata?.role || 
        targetUser.unsafeMetadata?.role ||
        (targetUser.privateMetadata as any)?.role;
    } catch (error) {
      console.error('Error getting target user from Clerk:', error);
    }

    // No permitir que SUPPORT resetee la contraseña de usuarios SUPER_ADMIN
    if (userRole === 'SUPPORT' && targetUserRole === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'El rol de soporte no puede modificar contraseñas de usuarios SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Actualizar contraseña en Clerk
    const client = await clerkClient();
    await client.users.updateUser(targetUserId, {
      password: newPassword
    });

    console.log('✅ Contraseña actualizada para usuario:', targetUserId);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('Error reseteando contraseña:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar contraseña',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

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

    const plans = await db.plan.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    const plansWithParsedFeatures = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]'),
      modules: JSON.parse(plan.modules || '[]')
    }));

    return NextResponse.json({
      success: true,
      plans: plansWithParsedFeatures
    });

  } catch (error: any) {
    console.error('Error obteniendo planes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/admin/plans llamado');
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

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
    console.log('Auth check:', { userId, userRole, isSuperAdminEmail });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('Body recibido:', body);
    const { name, code, price, maxUsers, maxStorage, maxTransactions, features, modules, isActive } = body;

    // Validar datos requeridos
    if (!name || !code || !price || !maxUsers || !maxStorage || !maxTransactions) {
      console.log('Faltan datos requeridos');
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el código no exista
    const existingPlan = await db.plan.findUnique({
      where: { code }
    });

    if (existingPlan) {
      console.log('El código ya existe:', code);
      return NextResponse.json(
        { error: 'El código del plan ya existe' },
        { status: 409 }
      );
    }

    console.log('Creando plan en base de datos...');
    const plan = await db.plan.create({
      data: {
        name,
        code,
        price,
        maxUsers,
        maxStorage,
        maxTransactions,
        features: JSON.stringify(features || []),
        modules: JSON.stringify(modules || []),
        isActive: isActive ?? true
      }
    });

    console.log('Plan creado exitosamente:', plan);

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        features: JSON.parse(plan.features),
        modules: JSON.parse(plan.modules)
      }
    });

  } catch (error: any) {
    console.error('Error creando plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

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

    const body = await req.json();
    const { id, name, code, price, maxUsers, maxStorage, maxTransactions, features, modules, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del plan requerido' },
        { status: 400 }
      );
    }

    const plan = await db.plan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(price !== undefined && { price }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(maxStorage !== undefined && { maxStorage }),
        ...(maxTransactions !== undefined && { maxTransactions }),
        ...(features && { features: JSON.stringify(features) }),
        ...(modules && { modules: JSON.stringify(modules) }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        features: JSON.parse(plan.features),
        modules: JSON.parse(plan.modules)
      }
    });

  } catch (error: any) {
    console.error('Error actualizando plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del plan requerido' },
        { status: 400 }
      );
    }

    await db.plan.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Plan eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

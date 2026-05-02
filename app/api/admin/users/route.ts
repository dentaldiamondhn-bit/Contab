import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const tenantId = searchParams.get('tenantId') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Construir query base - sin join inicial para evitar errores
    let usersQuery = supabase
      .from('User')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (tenantId) {
      usersQuery = usersQuery.eq('tenantid', tenantId);
    }

    if (role) {
      usersQuery = usersQuery.eq('role', role);
    }

    if (search) {
      // Supabase no soporta OR en ilike directamente, hacemos búsqueda simple en email
      usersQuery = usersQuery.ilike('email', `%${search}%`);
    }

    // Ejecutar query con paginación
    const { data: users, count: totalCount, error: usersError } = await usersQuery
      .order('createdat', { ascending: false })
      .range(from, to);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Error obteniendo usuarios', details: usersError },
        { status: 500 }
      );
    }

    // Obtener nombres de tenants por separado si hay usuarios
    let tenantNames: Record<string, string> = {};
    if (users && users.length > 0) {
      const tenantIds = users.map(u => u.tenantid).filter(Boolean);
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from('Tenant')
          .select('id, businessname')
          .in('id', tenantIds);
        
        if (tenants) {
          tenantNames = tenants.reduce((acc, t) => {
            acc[t.id] = t.businessname;
            return acc;
          }, {} as Record<string, string>);
        }
      }
    }

    // Formatear usuarios para incluir tenantName y mapear campos a camelCase
    const formattedUsers = users?.map(user => ({
      id: user.id,
      authId: user.authid,
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      role: user.role,
      isActive: user.isactive,
      tenantId: user.tenantid,
      tenantName: user.tenantid ? (tenantNames[user.tenantid] || null) : null,
      createdAt: user.createdat,
      updatedAt: user.updatedat
    })) || [];

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const { authId, email: userEmail, firstName, lastName, role, tenantId, isActive } = body;

    // Validar datos requeridos
    if (!authId || !userEmail || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Crear usuario usando Supabase
    const { data: user, error: createError } = await supabase
      .from('User')
      .insert([{
        authid: authId,
        email: userEmail,
        firstname: firstName,
        lastname: lastName,
        role: role || 'USER',
        tenantid: tenantId,
        isactive: isActive ?? true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Verificar si es error de duplicado
      if (createError.message?.includes('duplicate') || createError.code === '23505') {
        return NextResponse.json(
          { error: 'El email ya existe' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error creando usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Error creando usuario:', error);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

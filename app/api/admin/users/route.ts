import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get user from Clerk to check role (same as layouts)
    let userRole: string | undefined;
    let email = '';
    let clerkUser: any = null;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress || '';
      
      // Debug full metadata objects
      console.log('API /admin/users - Full publicMetadata:', JSON.stringify(clerkUser.publicMetadata, null, 2));
      console.log('API /admin/users - Full privateMetadata:', JSON.stringify(clerkUser.privateMetadata, null, 2));
      console.log('API /admin/users - Full unsafeMetadata:', JSON.stringify(clerkUser.unsafeMetadata, null, 2));
      
      // Check role from multiple metadata sources
      userRole = 
        clerkUser.publicMetadata?.role || 
        clerkUser.unsafeMetadata?.role ||
        (clerkUser.privateMetadata as any)?.role;
      
      console.log('API /admin/users - Extracted role:', userRole);
      console.log('API /admin/users - publicMetadata.role type:', typeof clerkUser.publicMetadata?.role);
      console.log('API /admin/users - publicMetadata.role value:', clerkUser.publicMetadata?.role);
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
      console.log('API /admin/users - Access denied, role:', userRole);
      return NextResponse.json(
        { error: 'No autorizado - Se requiere rol SUPER_ADMIN o SUPPORT' },
        { status: 403 }
      );
    }

    console.log('API /admin/users - Access granted for role:', userRole);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const tenantId = searchParams.get('tenantId') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log('API Query params:', { page, limit, from, to, search, role, tenantId });

    // Construir query base - obtener todos los usuarios primero
    let usersQuery = supabase
      .from('User')
      .select('*', { count: 'exact' });

    // Aplicar filtros solo si no están vacíos
    if (tenantId && tenantId !== '') {
      usersQuery = usersQuery.eq('tenantid', tenantId);
    }

    if (role && role !== 'ALL') {
      usersQuery = usersQuery.eq('role', role);
    }

    if (search && search !== '') {
      // Supabase no soporta OR en ilike directamente, hacemos búsqueda simple en email
      usersQuery = usersQuery.ilike('email', `%${search}%`);
    }

    // Ejecutar query con paginación
    const { data: users, count: totalCount, error: usersError } = await usersQuery
      .order('createdat', { ascending: false })
      .range(from, to);

    console.log('Supabase result:', { usersCount: users?.length || 0, totalCount, error: usersError?.message });

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

    // Función para limpiar email (remover sufijo +tenant)
    const cleanEmail = (email: string) => {
      if (!email) return '';
      // Remover todo después del + hasta el @
      return email.replace(/\+[^@]+@/, '@');
    };

    // Función para limpiar RTN (tomar solo los primeros 14 dígitos)
    const cleanRTN = (rtn: string) => {
      if (!rtn) return '';
      const match = rtn.match(/^\d{14}/);
      return match ? match[0] : rtn;
    };

    // Formatear usuarios para incluir tenantName y mapear campos a camelCase
    const formattedUsers = users?.map(user => ({
      id: user.id,
      authId: user.authid,
      email: cleanEmail(user.email),
      firstName: user.firstname,
      lastName: user.lastname,
      role: user.role,
      isActive: user.isactive,
      tenantId: user.tenantid,
      tenantName: user.tenantid ? (tenantNames[user.tenantid] || null) : null,
      createdAt: user.createdat,
      updatedAt: user.updatedat,
      // Incluir RTN limpio si existe en los metadatos o campos adicionales
      rtn: cleanRTN(user.rtn || user.businessrtn || user.businessRTN || '')
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

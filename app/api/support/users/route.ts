import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

async function safeGetUserRole(): Promise<string> {
  try {
    const { getUserRoleFromAuth } = await import('@/lib/auth-server');
    return await getUserRoleFromAuth();
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('GET /support/users - userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    const { data: users, error } = await supabase
      .from('User')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor', details: error.message },
        { status: 500 }
      );
    }

    const tenantIds = [...new Set(users?.map(u => u.tenant_id).filter(Boolean) || [])];
    let tenantMap = new Map();
    
    if (tenantIds.length > 0) {
      try {
        const { data: tenants } = await supabase
          .from('Tenant')
          .select('id, businessname, business_name, tenant_code')
          .in('id', tenantIds);
        
        if (tenants) {
          tenants.forEach((t: any) => {
            tenantMap.set(t.id, {
              businessName: t.businessname || t.business_name || '',
              tenantCode: t.tenant_code || ''
            });
          });
        }
      } catch (e) {
        console.warn('Tenant lookup failed:', e);
      }
    }

    const cleanEmail = (email: string) => {
      if (!email) return '';
      return email.replace(/\+[^@]+@/, '@');
    };

    const formattedUsers = users?.map((user: any) => ({
      id: user.id,
      email: cleanEmail(user.email),
      firstName: user.firstname,
      lastName: user.lastname,
      role: user.role,
      isActive: user.isactive,
      tenantId: user.tenantid,
      tenantName: user.tenantid ? (tenantMap.get(user.tenantid)?.businessName || 'Sin tenant') : 'Sin tenant',
      tenantCode: user.tenantid ? (tenantMap.get(user.tenantid)?.tenantCode || 'N/A') : 'N/A',
      createdAt: user.createdat
    })) || [];

    return NextResponse.json({ 
      success: true,
      users: formattedUsers 
    });

  } catch (error: any) {
    console.error('Error en API de support/users:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await safeGetUserRole();

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { email, firstName, lastName, role, tenantId, password } = body;

    if (!email || !role || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verificar que el tenant exista
    const { data: tenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('id, isactive, maxusers')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'El tenant especificado no existe' },
        { status: 404 }
      );
    }

    if (!tenant.isactive) {
      return NextResponse.json(
        { error: 'El tenant especificado no está activo' },
        { status: 400 }
      );
    }

    // Verificar que el email no exista
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409 }
      );
    }

    // Validar límite de usuarios del tenant
    const { count: currentUserCount, error: countError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('tenantid', tenantId)
      .eq('isactive', true);

    const maxUsers = tenant.maxusers || 5;
    if ((currentUserCount || 0) >= maxUsers) {
      return NextResponse.json(
        { error: `El tenant ha alcanzado su límite de ${maxUsers} usuarios` },
        { status: 400 }
      );
    }

    // Crear usuario
    const { data: newUser, error: createError } = await supabase
      .from('User')
      .insert({
        email,
        firstname: firstName,
        lastname: lastName,
        role,
        tenantid: tenantId,
        isactive: true,
        createdat: new Date().toISOString()
      })
      .select('id, email, firstname, lastname, role, isactive, createdat, tenantid')
      .single();

    if (createError) {
      console.error('Error creando usuario:', createError);
      return NextResponse.json(
        { error: 'Error creando usuario', details: createError.message },
        { status: 500 }
      );
    }

    // Get tenant info
    let tenantInfo = null;
    if (newUser.tenantid) {
      const { data: t } = await supabase
        .from('Tenant')
        .select('businessname, business_name, tenant_code')
        .eq('id', newUser.tenantid)
        .single();
      tenantInfo = t;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstname,
        lastName: newUser.lastname,
        role: newUser.role,
        isActive: newUser.isactive,
        tenantName: tenantInfo?.businessname || tenantInfo?.business_name,
        tenantCode: tenantInfo?.tenant_code,
        createdAt: newUser.createdat
      }
    });

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await safeGetUserRole();

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { userId: targetUserId, isActive, role } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // No permitir modificar SUPER_ADMIN
    const { data: targetUser, error: checkError } = await supabase
      .from('User')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (checkError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No se puede modificar un SUPER_ADMIN' },
        { status: 403 }
      );
    }

    // Actualizar usuario
    const updateData: any = {};
    if (isActive !== undefined) updateData.isactive = isActive;
    if (role !== undefined) updateData.role = role;

    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', targetUserId)
      .select('id, email, firstname, lastname, role, isactive, tenantid')
      .single();

    if (updateError) {
      console.error('Error actualizando usuario:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando usuario', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
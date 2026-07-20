import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { RealDB } from '@/lib/real-db';
import { supabase } from '@/lib/supabase-db';
import { sendModuleUpdateEmail } from '../../../../../lib/mail';
import { sendPushToTenantUsers } from '@/lib/push-notifications';
import { getEnhancedAuth } from '@/lib/auth-server';
import { SUPER_ADMIN_EMAIL } from '@/lib/auth-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('ðŸ”„ GET /api/admin/tenants/[id] - Iniciando...');
    
    const auth = await getEnhancedAuth();
    const { id } = await params;

    console.log('âœ… Auth check:', { 
      userId: auth.userId, 
      role: auth.role, 
      email: auth.email, 
      isSuperAdmin: auth.isSuperAdmin, 
      tenantId: id 
    });

    // Buscar tenant en RealDB
    const tenants = await RealDB.getRealTenants();
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
      console.log('âŒ Tenant no encontrado en base de datos');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log('âœ… Tenant encontrado:', tenant.businessName, 'Email:', tenant.businessEmail);

    // Validar que el usuario autenticado sea SUPER_ADMIN o tenga el mismo email del tenant
    const isTenantOwner = auth.email === tenant.businessEmail;
    
    if (!auth.userId || (!auth.canAccessAdmin && !isTenantOwner)) {
      console.log('âŒ No autorizado - Email no coincide con tenant');
      console.log('  Email usuario:', auth.email);
      console.log('  Email tenant:', tenant.businessEmail);
      return NextResponse.json(
        { error: 'No autorizado - Solo el propietario del tenant puede acceder' },
        { status: 403 }
      );
    }

    console.log('âœ… AutorizaciÃ³n concedida - Usuario es propietario del tenant o admin');

    // Obtener usuarios de Clerk para este tenant
    let users: any[] = [];
    try {
      const client = await clerkClient();
      const { data: allUsers } = await client.users.getUserList();
      console.log('ðŸ” Todos los usuarios en Clerk:', allUsers.length);
      console.log('ðŸ” Buscando usuarios para tenantId:', id);
      console.log('ðŸ” Usuario es Super Admin:', auth.isSuperAdmin);
      
      allUsers.forEach((user: any, index: number) => {
        const metadata = user.publicMetadata as any;
        console.log(`ðŸ‘¤ Usuario ${index}:`, {
          email: user.emailAddresses[0]?.emailAddress,
          tenantId: metadata.tenantId,
          role: metadata.role
        });
      });
      
      // Si es super admin, mostrar todos los usuarios
      if (auth.isSuperAdmin) {
        console.log('ðŸ‘‘ Super Admin: Mostrando todos los usuarios');
        users = await Promise.all(allUsers.map(async (user: any) => {
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          let role = (user.publicMetadata as any)?.role || 'USER';

          // ðŸ” AUTO-SINCRONIZACIÃ“N: Si es el email del super admin pero no tiene el rol en Clerk
          if (userEmail === SUPER_ADMIN_EMAIL && role !== 'SUPER_ADMIN') {
            console.log('âœ¨ Sincronizando rol SUPER_ADMIN en Clerk para:', userEmail);
            role = 'SUPER_ADMIN';
            try {
              await client.users.updateUser(user.id, {
                publicMetadata: { 
                  role: 'SUPER_ADMIN', 
                  tenantId: 'tenant_001',
                  tenantCode: 'tenant_001',
                  permissions: ['admin', 'super_admin', 'system_manage', 'tenant_admin'],
                  isolation: {
                    mode: 'global', // Cambiamos de 'strict' a 'global'
                    tenantId: 'tenant_001'
                  }
                }
              });
            } catch (err) {
              console.error('Error al sincronizar rol en Clerk:', err);
            }
          }

          return {
            id: user.id,
            email: userEmail,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: role,
            tenantId: (user.publicMetadata as any)?.tenantId || '',
            tenantCode: (user.publicMetadata as any)?.tenantCode || '',
            isActive: true
          };
        }));
      } else {
        // Si no es super admin, mostrar solo usuarios del tenant
        console.log('ðŸ¢ Usuario normal: Mostrando solo usuarios del tenant');
        users = allUsers.filter((user: any) => {
          const metadata = user.publicMetadata as any;
          return metadata.tenantId === id;
        }).map((user: any) => ({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: (user.publicMetadata as any)?.role || 'USER',
          tenantId: (user.publicMetadata as any)?.tenantId || '',
          tenantCode: (user.publicMetadata as any)?.tenantCode || '',
          isActive: true
        }));
      }
      
      console.log('ðŸ“Š Usuarios encontrados en Clerk:', users.length);
    } catch (error) {
      console.error('Error obteniendo usuarios de Clerk:', error);
    }

    // Enriquecer datos del tenant
    const enrichedTenant = {
      ...tenant,
      subscriptionPlans: JSON.parse(tenant.subscriptionPlans || '["BASICO"]'),
      modules: tenant.modules ? tenant.modules.split(',') : [],
      users,
      userCounts: {
        total: users.length,
        active: users.filter(u => u.isActive).length
      },
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length, 
      // Agregar planes como items de factura basados en subscriptionPlans
      tenantPlans: JSON.parse(tenant.subscriptionPlans || '["BASICO"]').map((planCode: string, index: number) => {
        // Definir precios y detalles para cada plan
        const planDetails: Record<string, any> = {
          'BASICO': {
            id: 'plan-basic',
            code: 'BASICO',
            name: 'Plan BÃ¡sico',
            description: 'Plan bÃ¡sico de contabilidad con facturaciÃ³n electrÃ³nica y reportes bÃ¡sicos',
            quantity: 1,
            unitPrice: 500,
            subtotal: 500,
            taxRate: 15,
            taxAmount: 75,
            total: 575
          },
          'PREMIUM': {
            id: 'plan-premium',
            code: 'PREMIUM',
            name: 'Plan Premium',
            description: 'Plan premium con contabilidad completa, nÃ³mina, inventario y reportes avanzados',
            quantity: 1,
            unitPrice: 1000,
            subtotal: 1000,
            taxRate: 15,
            taxAmount: 150,
            total: 1150
          },
          'ENTERPRISE': {
            id: 'plan-enterprise',
            code: 'ENTERPRISE',
            name: 'Plan Enterprise',
            description: 'Plan enterprise con todos los mÃ³dulos, soporte prioritario y personalizaciÃ³n',
            quantity: 1,
            unitPrice: 2000,
            subtotal: 2000,
            taxRate: 15,
            taxAmount: 300,
            total: 2300
          }
        };

        return planDetails[planCode] || {
          id: `plan-${index}`,
          code: planCode,
          name: `Plan ${planCode}`,
          description: `Servicios incluidos en el plan ${planCode}`,
          quantity: 1,
          unitPrice: 500,
          subtotal: 500,
          taxRate: 15,
          taxAmount: 75,
          total: 575
        };
      })
    };

    console.log('âœ… Tenant enriquecido devuelto');

    return NextResponse.json(enrichedTenant);

  } catch (error: any) {
    console.error('âŒ Error en GET /api/admin/tenants/[id]:', error);
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
    console.log('ðŸ”„ PATCH /api/admin/tenants/[id] - Actualizando tenant...');
    
    const auth = await getEnhancedAuth();
    const { id } = await params;

    // Buscar tenant en RealDB
    const tenants = await RealDB.getRealTenants();
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
      console.log('âŒ Tenant no encontrado en base de datos');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el usuario autenticado sea SUPER_ADMIN o tenga el mismo email del tenant
    const isTenantOwner = auth.email === tenant.businessEmail;
    
    if (!auth.userId || (!auth.canAccessAdmin && !isTenantOwner)) {
      console.log('âŒ No autorizado - Email no coincide con tenant');
      console.log('  Email usuario:', auth.email);
      console.log('  Email tenant:', tenant.businessEmail);
      return NextResponse.json(
        { error: 'No autorizado - Solo el propietario del tenant puede acceder' },
        { status: 403 }
      );
    }

    // Parse request body
    const updateData = await req.json();
    console.log('ðŸ“¦ Datos a actualizar:', updateData);

    if (!auth.canAccessAdmin) {
      return NextResponse.json(
        { error: 'No autorizado - Solo administradores del sistema pueden modificar estos datos' },
        { status: 403 }
      );
    }

    const { modules, planId, isActive } = updateData;
    const updatePayload: any = {};

    if (modules !== undefined) updatePayload.modules = Array.isArray(modules) ? modules.join(',') : modules;
    if (planId !== undefined) updatePayload.planid = planId;
    if (isActive !== undefined) updatePayload.isactive = isActive;
    
    updatePayload.updatedat = new Date().toISOString();

    // 1. Capturar el estado actual antes de la actualizaciÃ³n para auditorÃ­a
    const { data: oldState } = await supabase
      .from('Tenant')
      .select('modules, businessname, planid, isactive')
      .eq('id', id)
      .single();

    // 2. Realizar la actualizaciÃ³n
    const { data, error } = await supabase 
      .from('Tenant')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('âŒ Error al actualizar tenant en Supabase:', error);
      return NextResponse.json({ error: 'Error al actualizar el tenant' }, { status: 500 });
    }

    // 3. Registrar en el Log de AuditorÃ­a
    if (data) {
      try {
        await supabase.from('AuditLog').insert([{
          tenantId: id,
          userId: auth.userId,
          action: 'UPDATE_TENANT_CONFIG',
          category: 'ADMIN',
          description: `El Super Admin actualizÃ³ la configuraciÃ³n de la empresa: ${oldState?.businessname || id}`,
          oldData: oldState,
          newData: {
            modules: data.modules,
            planId: data.planid,
            isActive: data.isactive
          },
          metadata: {
            source: 'Tenant Module Manager',
            ip: req.headers.get('x-forwarded-for') || 'unknown'
          }
        }]);
        console.log('ðŸ“ Log de auditorÃ­a creado exitosamente');
      } catch (logError) {
        // Importante: No bloqueamos la respuesta al usuario si el log falla
        console.error('âš ï¸ Error al registrar log de auditorÃ­a:', logError);
      }
    }

    // 4. Enviar notificaciÃ³n por correo al dueÃ±o del tenant si cambiaron los mÃ³dulos
    if (data && modules !== undefined) {
      try {
        const activeModules = data.modules ? data.modules.split(',') : [];
        const baseUrl = req.nextUrl.origin;
        const dashboardUrl = `${baseUrl}/dashboard`;

        await sendModuleUpdateEmail(
          tenant.businessEmail, 
          tenant.businessName, 
          activeModules,
          dashboardUrl,
          data.planid || tenant.subscriptionPlans
        );
      } catch (mailError) {
        console.error('âš ï¸ Error al enviar correo de notificaciÃ³n:', mailError);
      }
    }

    // 5. Enviar notificaciÃ³n PUSH si hubo cambios importantes
    if (data && modules !== undefined) {
      try {
        await sendPushToTenantUsers(id, {
          title: 'ConfiguraciÃ³n Actualizada',
          body: `Se han modificado los mÃ³dulos activos de tu empresa: ${data.businessname || id}`,
          url: `${req.nextUrl.origin}/dashboard`
        });
      } catch (pushError) {
        console.error('âš ï¸ Error al enviar push:', pushError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant actualizado exitosamente',
      tenant: data
    });

  } catch (error: any) {
    console.error('âŒ Error en PATCH /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

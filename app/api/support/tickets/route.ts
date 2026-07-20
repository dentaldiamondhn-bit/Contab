import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRoleFromAuth } from '@/lib/auth-server';

// Mock data para tickets - en producción esto vendría de una tabla de tickets
const mockTickets = [
  {
    id: '1',
    subject: 'Problema con inicio de sesión',
    description: 'Usuario no puede acceder a su cuenta',
    priority: 'high' as const,
    status: 'open' as const,
    user_email: 'usuario@ejemplo.com',
    user_name: 'Juan Pérez',
    tenant_name: 'Dental Diamond',
    tenant_code: 'DEN001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    subject: 'Error en reporte de inventario',
    description: 'El reporte no muestra los datos correctos',
    priority: 'medium' as const,
    status: 'in_progress' as const,
    user_email: 'manager@contadora.hn',
    user_name: 'María González',
    tenant_name: 'Contadora Profesional',
    tenant_code: 'CON001',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: '3',
    subject: 'Solicitud de nueva funcionalidad',
    description: 'Necesitamos poder exportar a Excel',
    priority: 'low' as const,
    status: 'resolved' as const,
    user_email: 'admin@dental.hn',
    user_name: 'Carlos Rodríguez',
    tenant_name: 'Dental Diamond',
    tenant_code: 'DEN001',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    // Solo SUPER_ADMIN y SUPPORT pueden acceder
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // En producción, esto sería una consulta real a la base de datos
    // const tickets = await db.supportTicket.findMany({
    //   include: {
    //     user: {
    //       select: { email: true, firstName: true, lastName: true },
    //       include: {
    //         tenant: {
    //           select: { businessName: true, tenantCode: true }
    //         }
    //       }
    //     }
    //   },
    //   orderBy: { createdAt: 'desc' }
    // });

    return NextResponse.json({ 
      success: true,
      tickets: mockTickets 
    });

  } catch (error: any) {
    console.error('Error en API de support/tickets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    // Solo SUPER_ADMIN y SUPPORT pueden crear tickets
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { subject, description, priority, userEmail, tenantId } = body;

    // Validaciones básicas
    if (!subject || !description || !priority || !userEmail) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // En producción, esto crearía un ticket real en la base de datos
    const newTicket = {
      id: Date.now().toString(),
      subject,
      description,
      priority,
      status: 'open',
      user_email: userEmail,
      user_name: 'Soporte Sistema', // El nombre se obtendría del usuario
      tenant_name: 'Tenant Actual', // Se obtendría del tenantId
      tenant_code: 'TEN001', // Se obtendría del tenant
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      ticket: newTicket
    });

  } catch (error: any) {
    console.error('Error creando ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    // Solo SUPER_ADMIN y SUPPORT pueden actualizar tickets
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { ticketId, status, priority } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ID de ticket requerido' },
        { status: 400 }
      );
    }

    // En producción, esto actualizaría un ticket real
    const updatedTicket = mockTickets.find(t => t.id === ticketId);
    
    if (!updatedTicket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar campos
    if (status) updatedTicket.status = status;
    if (priority) updatedTicket.priority = priority;
    updatedTicket.updated_at = new Date().toISOString();

    return NextResponse.json({
      success: true,
      ticket: updatedTicket
    });

  } catch (error: any) {
    console.error('Error actualizando ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

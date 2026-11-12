import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserRoleFromAuth } from '@/lib/auth-server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let userRole = 'USER';
    let email = '';
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress || '';
      userRole = (user.publicMetadata as any)?.role || 'USER';
    } catch {}

    const isSupportOrAdmin = ['SUPER_ADMIN', 'SUPPORT', 'ADMIN'].includes(userRole) || email === 'sucachi.123@gmail.com';

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('SupportTicket')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isSupportOrAdmin) {
      query = query.eq('user_email', email);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json({ success: true, tickets: [] });
    }

    return NextResponse.json({ success: true, tickets: tickets || [] });
  } catch (error: any) {
    console.error('Error en API de support/tickets:', error);
    return NextResponse.json({ success: true, tickets: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description, priority, ticketType, userEmail, userName, assignedTo, assignedName } = body;

    if (!subject || !description || !priority) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const finalEmail = userEmail || email;
    let finalTenantName = '';
    let finalTenantCode = '';
    let finalTenantId: string | null = null;

    if (finalEmail) {
      try {
        const { data: dbUser } = await supabase
          .from('User')
          .select('tenantid')
          .eq('email', finalEmail.toLowerCase())
          .single();
        if (dbUser?.tenantid) {
          finalTenantId = dbUser.tenantid;
          const { data: tenant } = await supabase
            .from('Tenant')
            .select('businessname,tenant_code')
            .eq('id', dbUser.tenantid)
            .single();
          if (tenant) {
            finalTenantName = tenant.businessname || '';
            finalTenantCode = tenant.tenant_code || '';
          }
        }
      } catch {}
    }

    const newTicket = {
      subject,
      description,
      priority,
      ticket_type: ticketType || 'support',
      status: 'open',
      user_email: finalEmail || '',
      user_name: userName || '',
      tenant_name: finalTenantName,
      tenant_code: finalTenantCode,
      tenant_id: finalTenantId,
      assigned_to: assignedTo || null,
      assigned_name: assignedName || null,
      created_by: userId,
      timeline: [{
        type: 'created',
        message: 'Ticket creado',
        user: userName || finalEmail || '',
        timestamp: new Date().toLocaleString('es-HN')
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: ticket, error } = await supabase
      .from('SupportTicket')
      .insert([newTicket])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error.message, error.details, error.hint);
      return NextResponse.json({ error: 'Error creando ticket', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error('Error creando ticket:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, status, priority, comment, attachments } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'ID de ticket requerido' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let userName = '';
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || '';
    } catch {}

    const updates: any = { updated_at: new Date().toISOString() };
    const newEvents: any[] = [];

    if (status) {
      const { data: currentTicket } = await supabase
        .from('SupportTicket')
        .select('status')
        .eq('id', ticketId)
        .single();

      const oldStatus = currentTicket?.status || 'open';
      const statusLabel: Record<string, string> = { open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado' };

      newEvents.push({
        type: 'status_change',
        from: statusLabel[oldStatus] || oldStatus,
        to: statusLabel[status] || status,
        message: comment || null,
        attachments: attachments || undefined,
        user: userName,
        timestamp: new Date().toLocaleString('es-HN')
      });

      updates.status = status;
    }

    if (priority) updates.priority = priority;

    if (comment && !status) {
      newEvents.push({
        type: 'comment',
        message: comment,
        attachments: attachments || undefined,
        user: userName,
        timestamp: new Date().toLocaleString('es-HN')
      });
    }

    if (attachments && attachments.length > 0) {
      const { data: currentTicket } = await supabase
        .from('SupportTicket')
        .select('attachments')
        .eq('id', ticketId)
        .single();
      const existingAttachments = Array.isArray(currentTicket?.attachments) ? currentTicket.attachments : [];
      updates.attachments = [...existingAttachments, ...attachments];
    }

    if (newEvents.length > 0) {
      const { data: currentTicket } = await supabase
        .from('SupportTicket')
        .select('timeline')
        .eq('id', ticketId)
        .single();
      const existingTimeline = Array.isArray(currentTicket?.timeline) ? currentTicket.timeline : [];
      updates.timeline = [...existingTimeline, ...newEvents];
    }

    const { data: ticket, error } = await supabase
      .from('SupportTicket')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: 'Error actualizando ticket' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error('Error actualizando ticket:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

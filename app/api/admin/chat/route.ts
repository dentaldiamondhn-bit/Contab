import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getUserRoleFromAuth } from '@/lib/auth-server';

// GET /api/admin/chat - Get chat messages (with optional filtering)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    console.log('GET /admin/chat - userId:', userId, 'userRole:', userRole);

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const tenantId = searchParams.get('tenantId');
    const userIdFilter = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from('chat_message')
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        is_read,
        created_at,
        updated_at,
        sender:sender_id (
          id,
          first_name,
          last_name,
          email,
          role,
          tenant_id
        ),
        receiver:receiver_id (
          id,
          first_name,
          last_name,
          email,
          role,
          tenant_id
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (userRole === 'SUPPORT') {
      query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId},receiver_id.is.null`);
    }

    if (tenantId) {
      query = query.or(`sender:tenant_id.eq.${tenantId},receiver:tenant_id.eq.${tenantId}`);
    }

    if (userIdFilter) {
      query = query.or(`sender_id.eq.${userIdFilter},receiver_id.eq.${userIdFilter}`);
    }

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('Error fetching chat messages:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor', details: error.message },
        { status: 500 }
      );
    }

     // Get tenant info separately
     const tenantIds = [...new Set([
       ...messages?.map((m: any) => m.sender?.tenant_id).filter(Boolean) || [],
       ...messages?.map((m: any) => m.receiver?.tenant_id).filter(Boolean) || []
     ])];

     let tenantMap = new Map();
     if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
          .from('Tenant')
          .select('id, business_name, tenant_code')
          .in('id', tenantIds);
       tenants?.forEach((t: any) => tenantMap.set(t.id, t));
     }

     const formattedMessages = messages?.map((msg: any) => {
       const senderTenant = msg.sender?.tenant_id ? tenantMap.get(msg.sender.tenant_id) : null;
       const receiverTenant = msg.receiver?.tenant_id ? tenantMap.get(msg.receiver.tenant_id) : null;
       
       return {
         id: msg.id,
         sender: {
           id: msg.sender?.id,
           name: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || msg.sender?.email,
           email: msg.sender?.email,
           role: msg.sender?.role,
           tenant: senderTenant ? {
             id: senderTenant.id,
             businessName: senderTenant.business_name,
             tenantCode: senderTenant.tenant_code
           } : null
         },
         receiver: msg.receiver ? {
           id: msg.receiver.id,
           name: `${msg.receiver.first_name || ''} ${msg.receiver.last_name || ''}`.trim() || msg.receiver.email,
           email: msg.receiver.email,
           role: msg.receiver.role,
           tenant: receiverTenant ? {
             id: receiverTenant.id,
             businessName: receiverTenant.business_name,
             tenantCode: receiverTenant.tenant_code
           } : null
         } : null,
         message: msg.message,
         isRead: msg.is_read,
         createdAt: msg.created_at,
         updatedAt: msg.updated_at
       };
     }) || [];

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/chat - Send a new chat message
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { receiverId, message } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Validate receiver exists if specified
    if (receiverId) {
      const { data: receiver, error: receiverError } = await supabase
        .from('users')
        .select('id')
        .eq('id', receiverId)
        .single();

      if (receiverError || !receiver) {
        return NextResponse.json(
          { error: 'Usuario destinatario no encontrado' },
          { status: 404 }
        );
      }
    }

    // Create message
    const { data: chatMessage, error } = await supabase
      .from('chat_message')
      .insert({
        sender_id: userId,
        receiver_id: receiverId || null,
        message: message.trim()
      })
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        is_read,
        created_at,
        updated_at,
        sender:sender_id (
          id,
          first_name,
          last_name,
          email,
          role,
          tenant_id
        ),
        receiver:receiver_id (
          id,
          first_name,
          last_name,
          email,
          role,
          tenant_id
        )
      `)
      .single();

    if (error) {
      console.error('Error creating chat message:', error);
      return NextResponse.json(
        { error: 'Error creando mensaje', details: error.message },
        { status: 500 }
      );
    }

    // Get tenant info
    let senderTenant = null;
    let receiverTenant = null;
    
     if (chatMessage.sender?.tenant_id) {
       const { data: t } = await supabase
         .from('Tenant')
         .select('id, business_name, tenant_code')
         .eq('id', chatMessage.sender.tenant_id)
         .single();
       senderTenant = t;
     }
     
     if (chatMessage.receiver?.tenant_id) {
       const { data: t } = await supabase
         .from('Tenant')
         .select('id, business_name, tenant_code')
         .eq('id', chatMessage.receiver.tenant_id)
         .single();
       receiverTenant = t;
     }

     const formattedMessage = {
       id: chatMessage.id,
       sender: {
         id: chatMessage.sender?.id,
         name: `${chatMessage.sender?.first_name || ''} ${chatMessage.sender?.last_name || ''}`.trim() || chatMessage.sender?.email,
         email: chatMessage.sender?.email,
         role: chatMessage.sender?.role,
         tenant: senderTenant ? {
           id: senderTenant.id,
           businessName: senderTenant.business_name,
           tenantCode: senderTenant.tenant_code
         } : null
       },
       receiver: chatMessage.receiver ? {
         id: chatMessage.receiver.id,
         name: `${chatMessage.receiver.first_name || ''} ${chatMessage.receiver.last_name || ''}`.trim() || chatMessage.receiver.email,
         email: chatMessage.receiver.email,
         role: chatMessage.receiver.role,
         tenant: receiverTenant ? {
           id: receiverTenant.id,
           businessName: receiverTenant.business_name,
           tenantCode: receiverTenant.tenant_code
         } : null
       } : null,
       message: chatMessage.message,
       isRead: chatMessage.is_read,
       createdAt: chatMessage.created_at,
       updatedAt: chatMessage.updated_at
     };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error: any) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/admin/chat/:id/read - Mark message as read
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    const userRole = await getUserRoleFromAuth();

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de mensaje requerido' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify message exists
    const { data: message, error: msgError } = await supabase
      .from('chat_message')
      .select('id, receiver_id')
      .eq('id', id)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Check if user can read
    const canRead = !message.receiver_id || message.receiver_id === userId;

    if (!canRead) {
      return NextResponse.json(
        { error: 'No tienes permiso para marcar este mensaje como leído' },
        { status: 403 }
      );
    }

    // Mark as read
    const { data: updatedMessage, error } = await supabase
      .from('chat_message')
      .update({ is_read: true })
      .eq('id', id)
      .select('id, is_read, updated_at')
      .single();

    if (error) {
      console.error('Error marking message as read:', error);
      return NextResponse.json(
        { error: 'Error actualizando mensaje', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });

  } catch (error: any) {
    console.error('Error marking chat message as read:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
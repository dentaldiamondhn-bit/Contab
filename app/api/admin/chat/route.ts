import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function emptyResponse(limit = 50, offset = 0) {
  return NextResponse.json({
    success: true,
    messages: [],
    pagination: { total: 0, limit, offset, hasMore: false }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return emptyResponse();
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return emptyResponse(limit, offset);
    }

    const { data: messages, error, count } = await supabase
      .from('chat_message')
      .select('id, sender_id, receiver_id, message, is_read, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('chat_message query error:', JSON.stringify(error));
      return emptyResponse(limit, offset);
    }

    const userIds = [...new Set([
      ...messages?.map((m: any) => m.sender_id).filter(Boolean) || [],
      ...messages?.map((m: any) => m.receiver_id).filter(Boolean) || []
    ])];

    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, tenant_id')
        .in('id', userIds);
      users?.forEach((u: any) => userMap.set(u.id, u));
    }

    const formattedMessages = messages?.map((msg: any) => {
      const sender = userMap.get(msg.sender_id);
      const receiver = msg.receiver_id ? userMap.get(msg.receiver_id) : null;

      return {
        id: msg.id,
        sender: {
          id: sender?.id || msg.sender_id,
          name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.email : msg.sender_id,
          email: sender?.email,
          role: sender?.role,
          tenant: sender?.tenant_id ? { id: sender.tenant_id } : null
        },
        receiver: receiver ? {
          id: receiver.id,
          name: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim() || receiver.email,
          email: receiver.email,
          role: receiver.role,
          tenant: receiver.tenant_id ? { id: receiver.tenant_id } : null
        } : null,
        message: msg.message,
        isRead: msg.is_read,
        createdAt: msg.created_at,
        updatedAt: msg.created_at
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
    console.error('Error in GET /admin/chat:', error);
    return emptyResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { receiverId, message } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return NextResponse.json({ error: 'Service role no configurado' }, { status: 500 });
    }

    const { data: chatMessage, error } = await supabase
      .from('chat_message')
      .insert({
        sender_id: userId,
        receiver_id: receiverId || null,
        message: message.trim()
      })
      .select('id, sender_id, receiver_id, message, is_read, created_at')
      .single();

    if (error) {
      console.error('Error creating chat message:', error);
      return NextResponse.json({ error: 'Error creando mensaje', details: error.message }, { status: 500 });
    }

    const { data: sender } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, tenant_id')
      .eq('id', chatMessage.sender_id)
      .single();

    const formattedMessage = {
      id: chatMessage.id,
      sender: {
        id: sender?.id || chatMessage.sender_id,
        name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.email : chatMessage.sender_id,
        email: sender?.email,
        role: sender?.role,
        tenant: sender?.tenant_id ? { id: sender.tenant_id } : null
      },
      receiver: null,
      message: chatMessage.message,
      isRead: chatMessage.is_read,
      createdAt: chatMessage.created_at,
      updatedAt: chatMessage.created_at
    };

    return NextResponse.json({ success: true, message: formattedMessage });

  } catch (error: any) {
    console.error('Error in POST /admin/chat:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de mensaje requerido' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return NextResponse.json({ error: 'Service role no configurado' }, { status: 500 });
    }

    const { data: message, error: msgError } = await supabase
      .from('chat_message')
      .select('id, receiver_id')
      .eq('id', id)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.receiver_id && message.receiver_id !== userId) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }

    const { error } = await supabase
      .from('chat_message')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Error actualizando mensaje' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in PUT /admin/chat:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

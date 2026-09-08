import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    let userId: string | null = null;
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authErr: any) {
      return NextResponse.json({ error: 'Auth not available', detail: authErr?.message }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured', detail: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Usuario no encontrado', detail: error.message }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: data.id,
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        role: data.role || 'USER',
        company: data.company || '',
        department: data.department || '',
        timezone: data.timezone || 'America/Tegucigalpa',
        language: data.language || 'es',
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? false,
        two_factor_enabled: data.two_factor_enabled ?? false,
        avatar_url: data.avatar_url || '',
        subscription_plan: data.subscription_plan || 'BASIC',
        api_access: data.api_access ?? false,
        is_active: data.is_active ?? true,
        email_verified: data.email_verified ?? false,
        last_sign_in_at: data.last_sign_in_at || '',
        created_at: data.created_at || '',
        updated_at: data.updated_at || '',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno', detail: error?.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET() {
  try {
    let userId: string | null = null;
    const clerkUser = await (async () => {
      try {
        const { auth, currentUser } = await import('@clerk/nextjs/server');
        const authResult = await auth();
        userId = authResult.userId;
        return userId ? currentUser() : null;
      } catch {
        return null;
      }
    })();

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured', detail: 'Missing env vars' }, { status: 500 });
    }

    

    let { data, error } = await getSupabaseServer()
      .from('users')
      .select('*')
      .eq('auth_id', userId)
      .single();

    if (error) {
      const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress || '';
      const { data: inserted, error: insertError } = await getSupabaseServer()
        .from('users')
        .insert({
          auth_id: userId,
          email: primaryEmail,
          first_name: clerkUser?.firstName || '',
          last_name: clerkUser?.lastName || '',
          role: (clerkUser?.publicMetadata?.role as string) || 'USER',
          is_active: true,
          timezone: 'America/Tegucigalpa',
          language: 'es',
        })
        .select()
        .maybeSingle();

      const { data: reFetched, error: reFetchErr } = await getSupabaseServer()
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (reFetchErr || (!inserted && !reFetched)) {
        console.error('❌ Usuario no encontrado/creado en users:', { reFetchErr, insertError });
        return NextResponse.json({ error: 'Usuario no encontrado', detail: reFetchErr?.message || insertError?.message }, { status: 404 });
      }

      data = inserted || reFetched;
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

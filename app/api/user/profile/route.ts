import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getAuthUser } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = createSupabaseClient();
    
    // Intentar obtener el usuario existente
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.userId)
      .single();

    if (error) {
      // Usuario no existe, crear uno nuevo
      const clerkUser = authUser.user;
      const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
      
      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.userId,
          email: primaryEmail,
          first_name: clerkUser.firstName || '',
          last_name: clerkUser.lastName || '',
          role: clerkUser.publicMetadata?.role || 'USER',
          is_active: true,
          timezone: 'America/Tegucigalpa',
          language: 'es',
        })
        .select()
        .maybeSingle();

      if (inserted) {
        data = inserted;
      } else if (!inserted && error) {
        console.error('❌ Error creando usuario:', { error: insertError?.message });
        return NextResponse.json({ error: 'Error creando usuario', detail: insertError?.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      user: {
        id: data?.id,
        email: data?.email || '',
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        phone: data?.phone || '',
        role: data?.role || 'USER',
        company: data?.company || '',
        department: data?.department || '',
        timezone: data?.timezone || 'America/Tegucigalpa',
        language: data?.language || 'es',
        email_notifications: data?.email_notifications ?? true,
        push_notifications: data?.push_notifications ?? false,
        two_factor_enabled: data?.two_factor_enabled ?? false,
        avatar_url: data?.avatar_url || '',
        subscription_plan: data?.subscription_plan || 'BASIC',
        api_access: data?.api_access ?? false,
        is_active: data?.is_active ?? true,
        email_verified: data?.email_verified ?? false,
        last_sign_in_at: data?.last_sign_in_at || '',
        created_at: data?.created_at || '',
        updated_at: data?.updated_at || '',
      }
    });
  } catch (error: any) {
    console.error('❌ Error en perfil usuario:', error);
    return NextResponse.json({ error: 'Error interno', detail: error?.message }, { status: 500 });
  }
}
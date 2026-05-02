import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function GET() {
  try {
    console.log('DEBUG: Fetching raw users...');
    
    // Obtener usuarios sin procesar
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .order('createdat', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('DEBUG: Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Error obteniendo usuarios', details: usersError },
        { status: 500 }
      );
    }

    console.log('DEBUG: Raw users data:', users);

    return NextResponse.json({
      success: true,
      users: users || [],
      debug: {
        count: users?.length || 0,
        sample: users?.[0] || null
      }
    });
    
  } catch (error: any) {
    console.error('DEBUG: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

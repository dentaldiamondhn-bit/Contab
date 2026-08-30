import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ message: 'Email requerido' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ exists: false, valid: false });
  }

  try {
    const trimmed = email.toLowerCase().trim();
    // Intentar con tabla "users" (Prisma @@map) y fallback a "User"
    let { data, error } = await supabase.from('users').select('id').eq('email', trimmed).maybeSingle();
    if (error && error.code === '42P01') {
      // tabla no existe con minúscula, probar capitalizada
      const res = await supabase.from('User').select('id').eq('email', trimmed).maybeSingle();
      data = res.data;
      error = res.error;
    }
    if (error && error.code !== 'PGRST116') {
      console.error('[CHECK-EMAIL] Supabase error:', error);
      // No bloquear registro si hay error de BD, asumir no existe para no impedir flujo
      return NextResponse.json({ exists: false, email: trimmed });
    }

    return NextResponse.json({
      exists: !!data,
      email: trimmed,
    });
  } catch (error) {
    console.error('[CHECK-EMAIL] Error:', error);
    return NextResponse.json({ message: 'Error verificando email' }, { status: 500 });
  }
}

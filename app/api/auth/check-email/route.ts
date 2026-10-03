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

    // La tabla de auth es `"User"` (con comillas: Prisma la creo en mayuscula).
    // Antes esto miraba `users`, que es OTRA tabla legacy: tiene 3 filas de
    // `SUPER_ADMIN`, una columna `password` y nada que ver con el registro de
    // Clerk. Peor: el fallback a `"User"` solo se disparaba con `42P01`
    // (tabla inexistente), y como `users` SI existe, ese codigo nunca salia.
    // El fallback era codigo muerto y la comprobacion iba a la tabla errada.

    // `.limit(1)` y no `.maybeSingle()`: hay correos legitimamente repetidos.
    // Medido: gcalix12@hotmail.com y azuna22@outlook.com tienen 2 filas cada
    // uno en `"User"`, porque son DOS identidades de Clerk distintas (una por
    // tenant). Con `maybeSingle()` eso revienta con `PGRST116`...
    // ...y el codigo de antes-filteraba `PGRST116` como "sin error", asi que
    // respondia `exists: false`: le decia a un usuario que su correo ESTABA
    // libre justo cuando ya estaba en uso. Para esta comprobacion lo unico que
    // importa es si existe AL MENOS una fila.
    const { data, error } = await supabase
      .from('User')
      .select('id')
      .eq('email', trimmed)
      .limit(1);

    if (error) {
      console.error('[CHECK-EMAIL] Supabase error:', error);
      // No bloquear registro si hay error de BD, asumir no existe para no impedir flujo
      return NextResponse.json({ exists: false, email: trimmed });
    }

    return NextResponse.json({
      exists: (data?.length ?? 0) > 0,
      email: trimmed,
    });
  } catch (error) {
    console.error('[CHECK-EMAIL] Error:', error);
    return NextResponse.json({ message: 'Error verificando email' }, { status: 500 });
  }
}

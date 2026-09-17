import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rtn = (searchParams.get('rtn') || '').trim();

  if (!rtn) {
    return NextResponse.json({ exists: false, error: 'RTN requerido' }, { status: 400 });
  }

  const clean = rtn.replace(/[\s-]/g, '');
  if (!/^\d{14}$/.test(clean)) {
    return NextResponse.json({ exists: false, valid: false });
  }

  try {
    const formatted = `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;

    // Buscar en companies por el RTN normalizado (soporta guiones o sin guiones)
    let { data, error } = await supabase.from('companies').select('id, name').eq('rtn', formatted).maybeSingle();
    if (!data && !error) {
      const res = await supabase.from('companies').select('id, name').eq('rtn', clean).maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('[CHECK-RTN] Supabase error:', error);
      return NextResponse.json({ exists: false, error: 'Error verificando RTN' }, { status: 500 });
    }

    return NextResponse.json({
      exists: !!data,
      valid: true,
      company: data ? { id: data.id, name: data.name } : null,
    });
  } catch (error) {
    console.error('[CHECK-RTN] Error:', error);
    return NextResponse.json({ exists: false, error: 'Error verificando RTN' }, { status: 500 });
  }
}
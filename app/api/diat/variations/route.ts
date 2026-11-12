import { NextRequest, NextResponse } from 'next/server';
import { getDiatVariations } from '@/lib/services/diat-generator';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/diat/variations?companyId=&from=YYYY-MM&to=YYYY-MM
// Resúmenes fiscales de dos períodos para comparativo.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 },
      );
    }
    if (!PERIOD_RE.test(from) || !PERIOD_RE.test(to)) {
      return NextResponse.json(
        { success: false, error: 'from y to deben tener formato YYYY-MM (mes 01-12)' },
        { status: 400 },
      );
    }
    if (from === to) {
      return NextResponse.json(
        { success: false, error: 'from y to deben ser períodos diferentes' },
        { status: 400 },
      );
    }
    const variations = await getDiatVariations(companyId, from, to);
    if (!variations) {
      return NextResponse.json(
        { success: false, error: 'No hay datos para la empresa indicada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { variations } });
  } catch (error) {
    console.error('Error in DIAT variations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    );
  }
}

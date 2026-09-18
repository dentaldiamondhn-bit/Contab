import { NextRequest, NextResponse } from 'next/server';
import { getBudgetComparison, isValidPeriod } from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> },
) {
  try {
    const { id: companyId, budgetId } = await params;
    if (!companyId || !budgetId) {
      return NextResponse.json(
        { success: false, error: 'companyId y budgetId son requeridos' },
        { status: 400 },
      );
    }
    const period = new URL(request.url).searchParams.get('period');
    if (!period) {
      return NextResponse.json(
        { success: false, error: 'period es requerido (formato YYYY-MM)' },
        { status: 400 },
      );
    }
    if (!isValidPeriod(period)) {
      return NextResponse.json(
        { success: false, error: 'period debe tener el formato YYYY-MM (mes 01-12)' },
        { status: 400 },
      );
    }
    const comparison = await getBudgetComparison(
      companyId,
      budgetId,
      period,
      tenantHint(request),
    );
    if (!comparison) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { comparison } });
  } catch (error) {
    console.error('Error in budget comparison:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/formato|pertenece/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

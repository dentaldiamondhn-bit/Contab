import { NextRequest, NextResponse } from 'next/server';
import { getBudgetTrend } from '@/lib/services/budget-service';

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
    const trend = await getBudgetTrend(companyId, budgetId, tenantHint(request));
    if (!trend) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { trend } });
  } catch (error) {
    console.error('Error in budget trend:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

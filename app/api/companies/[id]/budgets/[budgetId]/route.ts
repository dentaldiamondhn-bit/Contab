import { NextRequest, NextResponse } from 'next/server';
import {
  deleteBudget,
  getBudget,
  isMissingTableError,
  updateBudget,
} from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

interface RouteParams {
  params: Promise<{ id: string; budgetId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: companyId, budgetId } = await params;
    if (!companyId || !budgetId) {
      return NextResponse.json(
        { success: false, error: 'companyId y budgetId son requeridos' },
        { status: 400 },
      );
    }
    const budget = await getBudget(companyId, budgetId, tenantHint(request));
    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { budget } });
  } catch (error) {
    console.error('Error fetching budget:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: companyId, budgetId } = await params;
    if (!companyId || !budgetId) {
      return NextResponse.json(
        { success: false, error: 'companyId y budgetId son requeridos' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const budget = await updateBudget(companyId, budgetId, body, tenantHint(request));
    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { budget } });
  } catch (error) {
    console.error('Error updating budget:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/inválido|debe|reabrirse/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: companyId, budgetId } = await params;
    if (!companyId || !budgetId) {
      return NextResponse.json(
        { success: false, error: 'companyId y budgetId son requeridos' },
        { status: 400 },
      );
    }
    const deleted = await deleteBudget(companyId, budgetId, tenantHint(request));
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting budget:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

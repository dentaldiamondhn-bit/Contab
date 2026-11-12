import { NextRequest, NextResponse } from 'next/server';
import { createBudget, isMissingTableError, listBudgets } from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get('year');
    const year = yearRaw ? Number(yearRaw) : undefined;
    if (yearRaw && !Number.isInteger(year)) {
      return NextResponse.json(
        { success: false, error: 'year debe ser un entero' },
        { status: 400 },
      );
    }
    const budgets = await listBudgets(companyId, tenantHint(request), {
      year,
      status: searchParams.get('status') || undefined,
    });
    return NextResponse.json({ success: true, data: { companyId, budgets } });
  } catch (error) {
    console.error('Error in budgets API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(isMissingTableError(error) ? { hint: message } : {}),
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const budget = await createBudget(companyId, body, tenantHint(request));
    return NextResponse.json({ success: true, data: { budget } }, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isMissingTableError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    // Errores de validación del servicio.
    if (/requerido|debe|inválido|formato/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

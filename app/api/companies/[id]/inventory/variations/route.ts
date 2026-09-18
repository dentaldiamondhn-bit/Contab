import { NextRequest, NextResponse } from 'next/server';
import { getInventoryVariations } from '@/lib/services/warehouse-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

// GET /api/companies/[id]/inventory/variations?from=YYYY-MM&to=YYYY-MM[&warehouseId=]
// Stock acumulado al cierre de cada mes + flujos IN/OUT por almacén y producto.
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
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const variations = await getInventoryVariations(companyId, from, to, tenantHint(request), {
      warehouseId: searchParams.get('warehouseId') || undefined,
    });
    return NextResponse.json({ success: true, data: { companyId, variations } });
  } catch (error) {
    console.error('Error in inventory variations:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/requerido|formato|diferentes/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

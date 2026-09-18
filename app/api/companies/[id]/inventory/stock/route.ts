import { NextRequest, NextResponse } from 'next/server';
import { getWarehouseStock } from '@/lib/services/warehouse-service';

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
    const stock = await getWarehouseStock(companyId, tenantHint(request), {
      warehouseId: searchParams.get('warehouseId') || undefined,
      productId: searchParams.get('productId') || undefined,
    });
    return NextResponse.json({ success: true, data: { companyId, stock } });
  } catch (error) {
    console.error('Error in warehouse stock API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

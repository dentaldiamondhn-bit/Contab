import { NextRequest, NextResponse } from 'next/server';
import { updateWarehouse } from '@/lib/services/warehouse-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; warehouseId: string }> },
) {
  try {
    const { id: companyId, warehouseId } = await params;
    if (!companyId || !warehouseId) {
      return NextResponse.json(
        { success: false, error: 'companyId y warehouseId son requeridos' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const warehouse = await updateWarehouse(
      companyId,
      warehouseId,
      {
        name: body.name,
        location: body.location,
        description: body.description,
        is_active: body.is_active,
      },
      tenantHint(request),
    );
    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: 'Almacén no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { warehouse } });
  } catch (error) {
    console.error('Error updating warehouse:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/inválido|desactivar/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

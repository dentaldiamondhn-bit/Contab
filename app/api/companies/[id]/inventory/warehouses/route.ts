import { NextRequest, NextResponse } from 'next/server';
import {
  createWarehouse,
  isMigrationMissingError,
  listWarehouses,
} from '@/lib/services/warehouse-service';

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
    const warehouses = await listWarehouses(companyId, tenantHint(request), {
      activeOnly: searchParams.get('activeOnly') !== 'false',
    });
    return NextResponse.json({ success: true, data: { companyId, warehouses } });
  } catch (error) {
    console.error('Error in warehouses API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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
    const warehouse = await createWarehouse(companyId, body, tenantHint(request));
    return NextResponse.json({ success: true, data: { warehouse } }, { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    if (/requerido/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

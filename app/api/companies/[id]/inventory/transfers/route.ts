import { NextRequest, NextResponse } from 'next/server';
import {
  createTransfer,
  isMigrationMissingError,
  listTransfers,
} from '@/lib/services/warehouse-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

const VALIDATION_RE =
  /requerido|debe|inválido|diferentes|insuficiente|no existe|activos/i;

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
    const transfers = await listTransfers(companyId, tenantHint(request), {
      status: searchParams.get('status') || undefined,
    });
    return NextResponse.json({ success: true, data: { companyId, transfers } });
  } catch (error) {
    console.error('Error in transfers API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/status inválido/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
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
    const transfer = await createTransfer(companyId, body, tenantHint(request));
    return NextResponse.json({ success: true, data: { transfer } }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    if (VALIDATION_RE.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

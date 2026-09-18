import { NextRequest, NextResponse } from 'next/server';
import { getTransfer, setTransferStatus } from '@/lib/services/warehouse-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

interface RouteParams {
  params: Promise<{ id: string; transferId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: companyId, transferId } = await params;
    if (!companyId || !transferId) {
      return NextResponse.json(
        { success: false, error: 'companyId y transferId son requeridos' },
        { status: 400 },
      );
    }
    const transfer = await getTransfer(companyId, transferId, tenantHint(request));
    if (!transfer) {
      return NextResponse.json(
        { success: false, error: 'Traslado no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { transfer } });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: companyId, transferId } = await params;
    if (!companyId || !transferId) {
      return NextResponse.json(
        { success: false, error: 'companyId y transferId son requeridos' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const transfer = await setTransferStatus(
      companyId,
      transferId,
      body.action,
      { by: body.by, receivedBy: body.receivedBy },
      tenantHint(request),
    );
    return NextResponse.json({ success: true, data: { transfer } });
  } catch (error) {
    console.error('Error updating transfer status:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (message === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Traslado no encontrado' },
        { status: 404 },
      );
    }
    if (/action debe|Transición inválida|insuficiente/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

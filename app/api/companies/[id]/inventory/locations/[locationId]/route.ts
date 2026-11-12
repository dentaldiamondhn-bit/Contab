import { NextRequest, NextResponse } from 'next/server';
import {
  deleteLocation,
  isLocationMigrationMissingError,
  updateLocation,
} from '@/lib/services/location-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  try {
    const { id: companyId, locationId } = await params;
    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'companyId y locationId son requeridos' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const location = await updateLocation(
      companyId,
      locationId,
      {
        code: body.code,
        name: body.name,
        aisle: body.aisle,
        shelf: body.shelf,
        description: body.description,
        image_url: body.image_url,
        warehouse_id: body.warehouse_id,
        is_active: body.is_active,
      },
      tenantHint(request),
    );
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { location } });
  } catch (error) {
    console.error('Error updating location:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isLocationMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    if (/inválido/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  try {
    const { id: companyId, locationId } = await params;
    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'companyId y locationId son requeridos' },
        { status: 400 },
      );
    }
    const deleted = await deleteLocation(companyId, locationId, tenantHint(request));
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isLocationMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
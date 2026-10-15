import { NextRequest, NextResponse } from 'next/server';
import {
  deleteLocation,
  isLocationMigrationMissingError,
  updateLocation,
} from '@/lib/services/location-service';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

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
    // Contexto validado: sin esto, el `[id]` de la ruta ni se comprobaba y el
    // `updateLocation` de `location-service` solo verificaba `id` + `tenant_id`,
    // o sea que un PUT alcanzaba la fila de la empresa hermana del mismo tenant.
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId || !empresa.tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa de la petición' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const location = await updateLocation(
      empresa.companyId,
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
      empresa.tenantId,
    );
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { location } });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
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
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId || !empresa.tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa de la petición' },
        { status: 400 },
      );
    }
    const deleted = await deleteLocation(empresa.companyId, locationId, empresa.tenantId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error deleting location:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isLocationMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
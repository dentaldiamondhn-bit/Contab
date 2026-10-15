import { NextRequest, NextResponse } from 'next/server';
import {
  createLocation,
  isLocationMigrationMissingError,
  listLocations,
} from '@/lib/services/location-service';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

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
    // Antes el tenant salia de `x-tenant-id`/`?tenantId` (lo manda el cliente) y
    // el `[id]` no se validaba. Ahora el contexto valida pertenencia (403 si la
    // empresa no es del tenant de la sesion) y el tenant se resuelve en servidor.
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId || !empresa.tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa de la petición' },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(request.url);
    const locations = await listLocations(empresa.companyId, empresa.tenantId, {
      activeOnly: searchParams.get('activeOnly') !== 'false',
      includeCount: searchParams.get('hideCount') !== 'true',
    });
    return NextResponse.json({ success: true, data: { companyId, locations } });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in locations API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isLocationMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
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
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId || !empresa.tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa de la petición' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const location = await createLocation(empresa.companyId, body, empresa.tenantId);
    return NextResponse.json({ success: true, data: { location } }, { status: 201 });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error creating location:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (isLocationMigrationMissingError(error)) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    if (/requerido|inválido/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
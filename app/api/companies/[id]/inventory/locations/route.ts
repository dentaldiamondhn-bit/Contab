import { NextRequest, NextResponse } from 'next/server';
import {
  createLocation,
  isLocationMigrationMissingError,
  listLocations,
} from '@/lib/services/location-service';

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
    const locations = await listLocations(companyId, tenantHint(request), {
      activeOnly: searchParams.get('activeOnly') !== 'false',
      includeCount: searchParams.get('hideCount') !== 'true',
    });
    return NextResponse.json({ success: true, data: { companyId, locations } });
  } catch (error) {
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
    const body = await request.json();
    const location = await createLocation(companyId, body, tenantHint(request));
    return NextResponse.json({ success: true, data: { location } }, { status: 201 });
  } catch (error) {
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
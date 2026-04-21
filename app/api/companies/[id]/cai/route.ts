import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    
    // Check if table exists by attempting a raw query first
    try {
      await prisma.$queryRaw`SELECT 1 FROM cai_authorizations LIMIT 1`;
    } catch (tableError) {
      console.log('CAI table does not exist yet, returning empty array');
      return NextResponse.json([]);
    }
    
    const authorizations = await (prisma as any).cAIAuthorization?.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    }) || [];

    return NextResponse.json(authorizations);
  } catch (error) {
    console.error('Error fetching CAI authorizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAI authorizations', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await request.json();
    
    const { codigo, tipoDocumento, rangoInicial, rangoFinal, fechaLimite } = body;

    if (!codigo || !tipoDocumento || !rangoInicial || !rangoFinal || !fechaLimite) {
      return NextResponse.json(
        { error: 'Missing required fields: codigo, tipoDocumento, rangoInicial, rangoFinal, fechaLimite' },
        { status: 400 }
      );
    }

    // Check if table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM cai_authorizations LIMIT 1`;
    } catch (tableError) {
      return NextResponse.json(
        { error: 'Database table not found. Please run: npx prisma migrate dev --name add_cai_authorizations' },
        { status: 500 }
      );
    }

    const authorization = await (prisma as any).cAIAuthorization?.create({
      data: {
        companyId,
        codigo,
        tipoDocumento,
        rangoInicial,
        rangoFinal,
        fechaLimite: new Date(fechaLimite),
        estado: 'activo',
        currentNumber: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'CAI authorization created successfully',
      data: authorization
    });
  } catch (error) {
    console.error('Error creating CAI authorization:', error);
    return NextResponse.json(
      { error: 'Failed to create CAI authorization', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id, codigo, tipoDocumento, rangoInicial, rangoFinal, fechaLimite, estado } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (codigo) updateData.codigo = codigo;
    if (tipoDocumento) updateData.tipoDocumento = tipoDocumento;
    if (rangoInicial) updateData.rangoInicial = rangoInicial;
    if (rangoFinal) updateData.rangoFinal = rangoFinal;
    if (fechaLimite) updateData.fechaLimite = new Date(fechaLimite);
    if (estado) updateData.estado = estado;

    const authorization = await (prisma as any).cAIAuthorization?.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'CAI authorization updated successfully',
      data: authorization
    });
  } catch (error) {
    console.error('Error updating CAI authorization:', error);
    return NextResponse.json(
      { error: 'Failed to update CAI authorization' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('id');

    if (!authorizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    await (prisma as any).cAIAuthorization?.delete({
      where: { id: authorizationId }
    });

    return NextResponse.json({
      success: true,
      message: 'CAI authorization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CAI authorization:', error);
    return NextResponse.json(
      { error: 'Failed to delete CAI authorization' },
      { status: 500 }
    );
  }
}

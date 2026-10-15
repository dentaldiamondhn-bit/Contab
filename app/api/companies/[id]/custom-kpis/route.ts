import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

// Obtener ingresos y número de transacciones reales por EMPRESA.
// OJO: antes se pasaba el `[id]` de la ruta (un `companies.id`, casi siempre
// UUID) como valor de `tenant_id`/`tenantId`, asi que devolvia 0 filas sin error;
// ademas `Transaction.company_id` es el filtro correcto (49/50 filas, medido;
// ver AGENTS.md, la columna SI existe).
async function getTicketPromedio(companyId: string): Promise<{ value: number | null; ingresos: number; transacciones: number }> {
  const { data: tx } = await supabaseService
    .from('Transaction')
    .select('id, voucherType, voucher_type, totalAmount, total_amount')
    .eq('company_id', companyId);

  const data = tx || [];

  let ingresos = 0;
  let transacciones = 0;
  data.forEach((t: any) => {
    const voucherType = t.voucherType || t.voucher_type;
    const amount = Number(t.totalAmount ?? t.total_amount ?? 0) / 100;
    if (voucherType === 'INGRESO') {
      ingresos += amount;
      transacciones += 1;
    }
  });

  const value = transacciones > 0 ? Math.round((ingresos / transacciones) * 100) / 100 : null;
  return { value, ingresos: Math.round(ingresos * 100) / 100, transacciones };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId) {
      return NextResponse.json([], { status: 400 });
    }

    // KPIs derivados de datos reales: solo los que tienen fuente en el sistema
    const ticket = await getTicketPromedio(empresa.companyId);

    const kpis: any[] = [];

    if (ticket.value !== null) {
      kpis.push({
        id: 'kpi-ticket-promedio',
        name: 'Ticket Promedio',
        description: 'Valor promedio de ingresos por transacción (dato real)',
        unit: 'HNL',
        value: ticket.value,
        target: null,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString()
      });
      kpis.push({
        id: 'kpi-ingresos',
        name: 'Ingresos Totales',
        description: 'Suma de ingresos registrados (dato real)',
        unit: 'HNL',
        value: ticket.ingresos,
        target: null,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    // ROI de marketing y satisfacción no tienen fuente de datos real → no se inventan
    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching custom KPIs:', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json([]);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId) {
      return NextResponse.json({ error: 'Company no encontrada' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, unit, value, target, category = 'custom' } = body;

    if (!name || !unit || value === undefined || target === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, unit, value, target' },
        { status: 400 }
      );
    }

    // No existe tabla de KPIs personalizados en la base de datos:
    // se devuelve el KPI para que el navegador lo persista localmente.
    const kpi = {
      id: `kpi-${Date.now()}`,
      name,
      description: description || null,
      value: Number(value),
      target: Number(target),
      unit,
      category,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'El KPI se almacenará en el navegador (no existe tabla de KPIs personalizados en el servidor)',
      data: kpi
    });
  } catch (error) {
    console.error('Error creating custom KPI:', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json(
      { error: 'Failed to create custom KPI' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId) {
      return NextResponse.json({ error: 'Company no encontrada' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('id');

    if (!kpiId) {
      return NextResponse.json(
        { error: 'KPI ID is required' },
        { status: 400 }
      );
    }

    // Los KPIs personalizados viven solo en el navegador del usuario
    return NextResponse.json({
      success: true,
      message: 'KPI eliminado del almacenamiento local del navegador'
    });
  } catch (error) {
    console.error('Error deleting custom KPI:', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json(
      { error: 'Failed to delete custom KPI' },
      { status: 500 }
    );
  }
}
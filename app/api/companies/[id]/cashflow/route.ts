import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { supabase as supabaseService } from '@/lib/supabase-db';

// Meses de flujo a mostrar (últimos 6 meses reales)
const MONTHS_TO_SHOW = 6;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    // Contexto de empresa validada: el `[id]` de la ruta es companies.id.
    // Antes esta ruta usaba `?companyId` del cliente o `tenantId` directo,
    // lo que dejaba la aislacion en falso para empresas del mismo tenant
    // (test 1 y test 2 comparten TEST1DS).
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.tenantId) {
      return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 400 });
    }
    const tenantId = empresa.tenantId;
    const company = empresa.companyId;

    // Obtener transacciones reales de la empresa para los últimos meses
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (MONTHS_TO_SHOW - 1), 1);

    let transactions: any[] = [];
    let query = supabaseService
      .from('Transaction')
      .select('id, voucherType, voucher_type, totalAmount, total_amount, date');
    // Aislamiento por company_id (empresa) en lugar de tenant_id solo.
    // Si la empresa no tiene company_id (pre-074), caemos back a tenant_id.
    if (company) {
      query = query.eq('company_id', company);
    } else {
      query = query.eq('tenant_id', tenantId);
    }
    let { data, error } = await query
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error || !data || data.length === 0) {
      // Fallback: intentar también por tenant_id si company_id no trae resultados
      const alt = await supabaseService
        .from('Transaction')
        .select('id, voucherType, voucher_type, totalAmount, total_amount, date')
        .eq('tenant_id', tenantId)
        .gte('date', startDate.toISOString().split('T')[0]);
      if (!alt.error && alt.data) {
        data = alt.data;
      }
    }

    if (error && !data) {
      console.error('Error fetching cash flow transactions:', error);
      return NextResponse.json([]);
    }

    transactions = data || [];

    // Agrupar por mes (YYYY-MM)
    const months: Record<string, { income: number; expenses: number }> = {};

    for (let i = MONTHS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { income: 0, expenses: 0 };
    }

    transactions.forEach((t: any) => {
      const rawDate = t.date || t.created_at;
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) return;

      const voucherType = t.voucherType || t.voucher_type;
      const amount = Number(t.totalAmount ?? t.total_amount ?? 0) / 100;
      if (voucherType === 'INGRESO') {
        months[key].income += amount;
      } else if (voucherType === 'EGRESO') {
        months[key].expenses += amount;
      }
    });

    // Construir serie con neto y acumulado
    let cumulative = 0;
    const cashFlow = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expenses }]) => {
        const netCashFlow = income - expenses;
        cumulative += netCashFlow;
        return {
          month,
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          netCashFlow: Math.round(netCashFlow * 100) / 100,
          cumulativeCashFlow: Math.round(cumulative * 100) / 100,
        };
      });

    return NextResponse.json(cashFlow);
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { month, income, expenses, periodMonth, periodYear } = body;

    if (!month || income === undefined || expenses === undefined || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: month, income, expenses, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    // El flujo de efectivo se calcula automáticamente desde las transacciones reales
    return NextResponse.json({
      success: false,
      error: 'El flujo de efectivo se calcula automáticamente desde las transacciones reales; no se puede sobrescribir manualmente.'
    }, { status: 501 });
  } catch (error) {
    console.error('Error updating cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to update cash flow' },
      { status: 500 }
    );
  }
}
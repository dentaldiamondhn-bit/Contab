import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    // Período actual (mes en curso), mismo patrón que dashboard/stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodoKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Transacciones reales del tenant en el período
    let transactions: any[] = [];
    let { data: txData, error: txError } = await supabaseService
      .from('Transaction')
      .select('id, voucherType, voucher_type, totalAmount, total_amount, date')
      .eq('tenant_id', companyId)
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    if (txError || !txData || txData.length === 0) {
      const alt = await supabaseService
        .from('Transaction')
        .select('id, voucherType, voucher_type, totalAmount, total_amount, date')
        .eq('tenantId', companyId)
        .gte('date', startOfMonth.toISOString().split('T')[0]);
      if (!alt.error && alt.data) {
        txData = alt.data;
      }
    }

    transactions = txData || [];

    let ingresos = 0;
    let egresos = 0;
    let transaccionesIngreso = 0;
    transactions.forEach((t: any) => {
      const voucherType = t.voucherType || t.voucher_type;
      const amount = Number(t.totalAmount ?? t.total_amount ?? 0) / 100;
      if (voucherType === 'INGRESO') {
        ingresos += amount;
        transaccionesIngreso += 1;
      } else if (voucherType === 'EGRESO') {
        egresos += amount;
      }
    });
    ingresos = Math.round(ingresos * 100) / 100;
    egresos = Math.round(egresos * 100) / 100;

    // Facturación y cobros reales desde Invoice (se omiten anuladas)
    let invoices: any[] = [];
    let { data: invData, error: invError } = await supabaseService
      .from('Invoice')
      .select('id, total, status, invoiceType, customerName, customer_name, tenantId, tenant_id')
      .eq('tenantId', companyId);

    if (invError || !invData || invData.length === 0) {
      const alt = await supabaseService
        .from('Invoice')
        .select('id, total, status, invoiceType, customerName, customer_name, tenantId, tenant_id')
        .eq('tenant_id', companyId);
      if (!alt.error && alt.data) {
        invData = alt.data;
      }
    }

    invoices = invData || [];

    let facturado = 0;
    let cobrado = 0;
    let facturas = 0;
    const clientesSet = new Set<string>();
    invoices.forEach((i: any) => {
      const status = String(i.status || '').toUpperCase();
      const total = Number(i.total || 0);
      if (status === 'CANCELLED') return;
      facturado += total;
      facturas += 1;
      if (status === 'PAID') {
        cobrado += total;
      }
      const customer = i.customerName || i.customer_name;
      if (customer) {
        clientesSet.add(String(customer).trim());
      }
    });
    facturado = Math.round(facturado * 100) / 100;
    cobrado = Math.round(cobrado * 100) / 100;

    // No existe tabla de citas/capacidad en el esquema → ocupación sin dato real
    const occupancyRate: number | null = null;

    // Derivaciones reales del período
    const revenuePerUnit = transaccionesIngreso > 0 ? Math.round((ingresos / transaccionesIngreso) * 100) / 100 : null;
    const operatingMargin = ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 100) : null;
    const cashFlow = Math.round((ingresos - egresos) * 100) / 100;

    // Costo de mantenimiento real desde cost_payments
    let maintenanceCost: number | null = null;
    const { data: costRows, error: costsError } = await supabaseService
      .from('cost_payments')
      .select('cost_type, cost_key, amount')
      .eq('tenant_id', companyId)
      .eq('cost_key', 'maintenance');
    if (!costsError && costRows && costRows.length > 0) {
      maintenanceCost = Math.round(
        costRows.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0) * 100
      ) / 100;
    }

    // Sin fuente real en el sistema → null (no se inventan métricas)
    const cac: number | null = null;
    const inventoryTurnover: number | null = null;
    const replacementFund: number | null = null;

    return NextResponse.json({
      occupancyRate,
      revenuePerUnit,
      cac,
      operatingMargin,
      cashFlow,
      inventoryTurnover,
      maintenanceCost,
      replacementFund,
      ingresosPeriodo: ingresos,
      egresosPeriodo: egresos,
      facturado,
      cobrado,
      facturaCount: facturas,
      clientes: clientesSet.size,
      periodo: {
        mes: periodoKey,
        desde: startOfMonth.toISOString().split('T')[0],
        hasta: endOfMonth.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const tenantId = req.nextUrl.searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

    const supabase = createServiceRoleClient();
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    // 1. Invoices (ventas del mes)
    const { data: currentInvoices } = await supabase
      .from('Invoice')
      .select('id,total,status,createdAt,customername')
      .eq('tenantid', tenantId)
      .gte('createdAt', currentMonthStart);

    const { data: prevInvoices } = await supabase
      .from('Invoice')
      .select('id,total,status,createdAt')
      .eq('tenantid', tenantId)
      .gte('createdAt', prevMonthStart)
      .lte('createdAt', prevMonthEnd);

    const currentSales = (currentInvoices || [])
      .filter((i: any) => i.status !== 'CANCELLED')
      .reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0);
    const prevSales = (prevInvoices || [])
      .filter((i: any) => i.status !== 'CANCELLED')
      .reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0);

    // 2. Cuentas por cobrar (pending invoices)
    const { data: pendingInvoices } = await supabase
      .from('Invoice')
      .select('id,total,status,createdAt')
      .eq('tenantid', tenantId)
      .in('status', ['PENDING', 'ACTIVE', 'SENT']);

    const accountsReceivable = (pendingInvoices || [])
      .reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0);

    // 3. Aging AR (antigüedad)
    const arAging = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
    (pendingInvoices || []).forEach((inv: any) => {
      const daysDiff = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.total) || 0;
      if (daysDiff <= 30) arAging.current += amount;
      else if (daysDiff <= 60) arAging.d1_30 += amount;
      else if (daysDiff <= 90) arAging.d31_60 += amount;
      else arAging.d60plus += amount;
    });

    // 4. Accounts payable (from accounting EGRESO transactions without matching payment)
    const { data: accounts } = await supabase
      .from('Account')
      .select('id,code,name,type')
      .eq('tenantid', tenantId);

    const payableAccountIds = (accounts || [])
      .filter((a: any) => a.code?.startsWith('2.1') || a.type === 'LIABILITY')
      .map((a: any) => a.id);

    let accountsPayable = 0;
    if (payableAccountIds.length > 0) {
      const { data: payables } = await supabase
        .from('JournalEntry')
        .select('id,amount,accountId')
        .in('accountId', payableAccountIds)
        .eq('type', 'CREDIT');
      accountsPayable = (payables || []).reduce((sum: number, p: any) => sum + (Math.abs(Number(p.amount)) || 0), 0);
    }

    // 5. Cash flow (bank + cash accounts)
    const cashAccountIds = (accounts || [])
      .filter((a: any) => a.code?.startsWith('1.1') || a.type === 'ASSET')
      .map((a: any) => a.id);

    let cashBalance = 0;
    if (cashAccountIds.length > 0) {
      const { data: cashEntries } = await supabase
        .from('JournalEntry')
        .select('id,amount,accountId')
        .in('accountId', cashAccountIds);
      cashBalance = (cashEntries || []).reduce((sum: number, e: any) => {
        const amt = Number(e.amount) || 0;
        return sum + (e.type === 'DEBIT' ? amt : -amt);
      }, 0);
    }

    // 6. Monthly cash flow evolution (last 6 months)
    const cashFlowMonths = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).toISOString();
      const monthLabel = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('es-HN', { month: 'short' });

      const { data: monthIncomes } = await supabase
        .from('Invoice')
        .select('total')
        .eq('tenantid', tenantId)
        .gte('createdAt', monthStart)
        .lte('createdAt', monthEnd)
        .neq('status', 'CANCELLED');

      const { data: monthExpenses } = await supabase
        .from('Transaction')
        .select('totalamount')
        .eq('tenantid', tenantId)
        .eq('type', 'EGRESO')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const ingresos = (monthIncomes || []).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      const egresos = (monthExpenses || []).reduce((s: number, e: any) => s + (Math.abs(Number(e.totalamount)) || 0), 0);

      cashFlowMonths.push({ month: monthLabel, ingresos, egresos, neto: ingresos - egresos });
    }

    // 7. Top clients
    const clientMap: Record<string, { name: string, total: number, count: number }> = {};
    (currentInvoices || []).forEach((inv: any) => {
      const name = inv.customername || 'Sin nombre';
      if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 };
      clientMap[name].total += Number(inv.total) || 0;
      clientMap[name].count++;
    });
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 8. Users count
    const { count: totalUsers } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('tenantid', tenantId);

    // 9. Tax alerts (simplified - next ISV declaration dates)
    const taxAlerts = [];
    const dayOfMonth = now.getDate();
    if (dayOfMonth <= 15) {
      taxAlerts.push({ tax: 'ISV Mensual', dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`, status: dayOfMonth <= 12 ? 'warning' : 'urgent' });
    }
    if (now.getMonth() % 3 === 2) {
      taxAlerts.push({ tax: 'ISV Trimestral (RTN)', dueDate: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-30`, status: 'info' });
    }
    taxAlerts.push({ tax: 'Renta Anual', dueDate: `${now.getFullYear() + 1}-03-31`, status: 'info' });

    return NextResponse.json({
      kpis: {
        cashBalance,
        accountsReceivable,
        accountsPayable,
        monthlySales: currentSales,
        prevMonthSales: prevSales,
        totalUsers: totalUsers || 0,
      },
      arAging,
      cashFlowMonths,
      topClients,
      taxAlerts,
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error?.message || error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

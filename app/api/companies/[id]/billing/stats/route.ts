import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
}

interface ItemRow {
  invoiceId: string;
  description: string;
  productCode: string | null;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

interface BillingStats {
  companyId: string;
  generatedAt: string;
  months: number;
  tenantId: string;
  kpis: {
    totalInvoices: number;
    issuedInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    cancelledInvoices: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    totalTax: number;
    totalSubtotal: number;
    avgInvoiceValue: number;
    monthlyGrowth: number;
  };
  monthly: Array<{ month: string; label: string; revenue: number; tax: number; count: number }>;
  byStatus: Array<{ status: string; count: number; value: number }>;
  topCustomers: Array<{ name: string; count: number; total: number }>;
  topProducts: Array<{ name: string; code: string; count: number; quantity: number; total: number }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    total: number;
    date: string;
    status: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagada',
  ACTIVE: 'Activa',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  CANCELLED: 'Anulada',
};

function monthBounds(months: number): Array<{ start: string; end: string; label: string }> {
  const out: Array<{ start: string; end: string; label: string }> = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const label = firstDay.toLocaleDateString('es-HN', { month: 'short', year: '2-digit' });
    out.push({
      start: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}T00:00:00`,
      end: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}T23:59:59`,
      label,
    });
  }
  return out;
}

function previousMonthStart(months: number): string {
  const target = new Date();
  target.setMonth(target.getMonth() - months);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-01T00:00:00`;
}

// GET /api/companies/[id]/billing/stats?months=6[&tenantId=][&status=]
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
    const months = Math.min(24, Math.max(1, parseInt(searchParams.get('months') || '6', 10) || 6));

    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const bounds = monthBounds(months);
    const startIso = bounds[0].start;
    const endIso = bounds[bounds.length - 1].end;

    const statusFilter = searchParams.get('status');
    let query = supabase
      .from('Invoice')
      .select('id, invoiceNumber, invoiceType, status, customerName, issueDate, dueDate, subtotal, tax, total')
      .eq('tenantId', tenantId)
      .gte('issueDate', startIso)
      .lte('issueDate', endIso);
    if (statusFilter) query = query.eq('status', statusFilter);

    const { data: invoicesRes, error } = await query.order('issueDate', { ascending: true });
    if (error) {
      console.error('Error fetching invoices for stats:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const invoices = ((invoicesRes || []) as InvoiceRow[]).filter(
      (i) => i && typeof i.id === 'string',
    );

    // Ingresos del período anterior (para cálculo de crecimiento)
    const previousStart = previousMonthStart(months);
    const { data: prevRes } = await supabase
      .from('Invoice')
      .select('total')
      .eq('tenantId', tenantId)
      .gte('issueDate', previousStart)
      .lt('issueDate', startIso)
      .neq('status', 'CANCELLED');
    const previousRevenue = ((prevRes || []) as Array<{ total: number | string }>).reduce(
      (s, i) => s + num(i.total),
      0,
    );

    const nonCancelled = invoices.filter((i) => i.status !== 'CANCELLED');
    const getStatus = (s: string) => STATUS_LABELS[s] || s;

    const totalRevenue = nonCancelled.reduce((s, i) => s + num(i.total), 0);
    const totalTax = nonCancelled.reduce((s, i) => s + num(i.tax), 0);
    const totalSubtotal = nonCancelled.reduce((s, i) => s + num(i.subtotal), 0);
    const issuedInvoices = nonCancelled.length;
    const paidInvoices = nonCancelled.filter((i) => i.status === 'PAID').length;
    const pendingInvoices = nonCancelled.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE').length;
    const overdueInvoices = nonCancelled.filter((i) => i.status === 'OVERDUE').length;
    const cancelledInvoices = invoices.filter((i) => i.status === 'CANCELLED').length;
    const paidRevenue = nonCancelled
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + num(i.total), 0);
    const overdueRevenue = nonCancelled
      .filter((i) => i.status === 'OVERDUE')
      .reduce((s, i) => s + num(i.total), 0);
    const pendingRevenue = nonCancelled
      .filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
      .reduce((s, i) => s + num(i.total), 0);
    const avgInvoiceValue = issuedInvoices > 0 ? totalRevenue / issuedInvoices : 0;
    const monthlyGrowth =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Tendencia mensual (por issueDate)
    const monthly = bounds.map((b) => {
      let revenue = 0;
      let tax = 0;
      let count = 0;
      for (const inv of nonCancelled) {
        if (!inv.issueDate || String(inv.issueDate) < b.start || String(inv.issueDate) > b.end) continue;
        revenue += num(inv.total);
        tax += num(inv.tax);
        count += 1;
      }
      return { month: b.start.slice(0, 7), label: b.label, revenue, tax, count };
    });

    // Distribución por estado
    const statusMap = new Map<string, { count: number; value: number }>();
    for (const inv of invoices) {
      const key = getStatus(inv.status);
      const cur = statusMap.get(key) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += num(inv.total);
      statusMap.set(key, cur);
    }
    const byStatus = Array.from(statusMap.entries())
      .map(([status, v]) => ({ status, count: v.count, value: v.value }));

    // Top clientes (agrupado por nombre)
    const customerMap = new Map<string, { count: number; total: number }>();
    for (const inv of nonCancelled) {
      const name = (inv.customerName || 'Consumidor Final').trim();
      const cur = customerMap.get(name) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += num(inv.total);
      customerMap.set(name, cur);
    }
    const topCustomers = Array.from(customerMap.entries())
      .map(([name, v]) => ({ name, count: v.count, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Top productos (desde InvoiceItem de las facturas del período)
    const invoiceIds = invoices.map((i) => i.id);
    let topProducts: Array<{ name: string; code: string; count: number; quantity: number; total: number }> = [];
    if (invoiceIds.length > 0) {
      const { data: itemsRes } = await supabase
        .from('InvoiceItem')
        .select('invoiceId, description, productCode, quantity, unitPrice, total')
        .in('invoiceId', invoiceIds);
      const items = ((itemsRes || []) as ItemRow[]).filter((it) => it && typeof it.invoiceId === 'string');
      const productMap = new Map<string, { name: string; code: string; count: number; quantity: number; total: number }>();
      for (const it of items) {
        const description = (it.description || it.productCode || 'Producto').trim();
        const key = it.productCode || description;
        const cur = productMap.get(key) || {
          name: description,
          code: it.productCode || '',
          count: 0,
          quantity: 0,
          total: 0,
        };
        cur.count += 1;
        cur.quantity += num(it.quantity);
        cur.total += num(it.total);
        productMap.set(key, cur);
      }
      topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }

    // Facturas recientes (descendente)
    const recentInvoices = invoices
      .slice()
      .sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')))
      .slice(0, 10)
      .map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName || 'Consumidor Final',
        total: num(inv.total),
        date: inv.issueDate,
        status: getStatus(inv.status),
      }));

    const stats: BillingStats = {
      companyId,
      generatedAt: new Date().toISOString(),
      months,
      tenantId,
      kpis: {
        totalInvoices: invoices.length,
        issuedInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        cancelledInvoices,
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        overdueRevenue,
        totalTax,
        totalSubtotal,
        avgInvoiceValue,
        monthlyGrowth,
      },
      monthly,
      byStatus,
      topCustomers,
      topProducts,
      recentInvoices,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in billing stats API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

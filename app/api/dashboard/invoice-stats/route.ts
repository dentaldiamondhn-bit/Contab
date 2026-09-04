import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const period = searchParams.get('period') || 'month';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Get invoices from Supabase
    const { data: invoices, error } = await supabase
      .from('Invoice')
      .select('*')
      .eq('tenantid', tenantId);

    if (error) {
      console.error('Error fetching invoices:', error);
      // If table doesn't exist, return empty stats
      return NextResponse.json({
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        totalRevenue: 0,
        pendingRevenue: 0,
        paidRevenue: 0,
        paymentMethods: { cash: 0, card: 0, transfer: 0, other: 0 },
        monthlyStats: { currentMonth: 0, previousMonth: 0, growth: 0 }
      });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const totalInvoices = invoices?.length || 0;
    const paidInvoices = invoices?.filter(i => i.status === 'paid' || i.status === 'PAID').length || 0;
    const pendingInvoices = invoices?.filter(i => i.status === 'pending' || i.status === 'PENDING').length || 0;
    const overdueInvoices = invoices?.filter(i => i.status === 'overdue' || i.status === 'OVERDUE').length || 0;

    const totalRevenue = invoices?.reduce((sum, i) => sum + (i.total || i.totalAmount || 0), 0) || 0;
    const paidRevenue = invoices?.filter(i => i.status === 'paid' || i.status === 'PAID').reduce((sum, i) => sum + (i.total || i.totalAmount || 0), 0) || 0;
    const pendingRevenue = totalRevenue - paidRevenue;

    // Payment methods
    const paymentMethods = { cash: 0, card: 0, transfer: 0, other: 0 };
    invoices?.forEach(i => {
      const method = (i.paymentMethod || i.payment_method || 'other').toLowerCase();
      if (method === 'cash' || method === 'efectivo') paymentMethods.cash++;
      else if (method === 'card' || method === 'tarjeta') paymentMethods.card++;
      else if (method === 'transfer' || method === 'transferencia') paymentMethods.transfer++;
      else paymentMethods.other++;
    });

    // Monthly stats
    const currentMonthInvoices = invoices?.filter(i => {
      const d = new Date(i.date || i.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }) || [];
    const lastMonthInvoices = invoices?.filter(i => {
      const d = new Date(i.date || i.created_at);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }) || [];

    const currentMonthTotal = currentMonthInvoices.reduce((sum, i) => sum + (i.total || i.totalAmount || 0), 0);
    const lastMonthTotal = lastMonthInvoices.reduce((sum, i) => sum + (i.total || i.totalAmount || 0), 0);
    const growth = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return NextResponse.json({
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue,
      pendingRevenue,
      paidRevenue,
      paymentMethods,
      monthlyStats: {
        currentMonth: currentMonthTotal,
        previousMonth: lastMonthTotal,
        growth: Math.round(growth * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice statistics' },
      { status: 500 }
    );
  }
}

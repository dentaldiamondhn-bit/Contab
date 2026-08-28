import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let userRole: string | undefined;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      userRole = clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role;
    } catch {}

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalTenantsRes,
      activeTenantsRes,
      trialTenantsRes,
      totalUsersRes,
      activeUsersRes,
      invoicesResult,
      lastMonthInvoicesResult,
      transactionsResult,
      supportTicketsResult,
      openTicketsRes,
      criticalTicketsRes,
      auditLogsResult,
      healthCheck,
    ] = await Promise.all([
      supabase.from('Tenant').select('*', { count: 'exact', head: true }),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).eq('isactive', true),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).eq('isactive', false),
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('User').select('*', { count: 'exact', head: true }).eq('isactive', true),
      supabase.from('Invoice').select('id, total, status, invoicetype, createdat').gte('createdat', startOfMonth.toISOString()),
      supabase.from('Invoice').select('id, total, status, createdat').gte('createdat', startOfLastMonth.toISOString()).lte('createdat', endOfLastMonth.toISOString()),
      supabase.from('Transaction').select('id, totalamount, date, currency').gte('date', startOfMonth.toISOString()),
      supabase.from('SupportTicket').select('id, status, priority, createdat'),
      supabase.from('SupportTicket').select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'IN_PROGRESS']),
      supabase.from('SupportTicket').select('*', { count: 'exact', head: true }).eq('priority', 'HIGH').in('status', ['OPEN', 'IN_PROGRESS']),
      supabase.from('auditlog').select('id, action, tablename, timestamp').gte('timestamp', startOfMonth.toISOString()),
      supabase.from('SystemConfig').select('key, value').in('key', ['system_status', 'last_health_check']),
    ]);

    const totalTenants = totalTenantsRes.count || 0;
    const activeTenants = activeTenantsRes.count || 0;
    const trialTenants = trialTenantsRes.count || 0;
    const totalUsers = totalUsersRes.count || 0;
    const activeUsers = activeUsersRes.count || 0;
    const openTicketsCount = openTicketsRes.count || 0;
    const criticalTicketsCount = criticalTicketsRes.count || 0;

    const totalRevenue = invoicesResult.data?.reduce((sum, inv) => {
      if (inv.status === 'ACTIVE' || inv.status === 'PAID') return sum + (inv.total || 0);
      return sum;
    }, 0) || 0;

    const lastMonthRevenue = lastMonthInvoicesResult.data?.reduce((sum, inv) => {
      if (inv.status === 'ACTIVE' || inv.status === 'PAID') return sum + (inv.total || 0);
      return sum;
    }, 0) || 0;

    const mrr = totalRevenue;
    const revenueGrowth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    const subscriptionInvoices = invoicesResult.data?.filter(i => i.invoicetype === 'SUBSCRIPTION') || [];
    const customerInvoices = invoicesResult.data?.filter(i => i.invoicetype === 'CUSTOMER') || [];
    const expenseInvoices = invoicesResult.data?.filter(i => i.invoicetype === 'EXPENSE') || [];

    const totalTransactions = transactionsResult.data?.length || 0;
    const totalTransactionVolume = transactionsResult.data?.reduce((sum, t) => sum + (t.totalamount || 0), 0) || 0;

    const tickets = supportTicketsResult.data || [];
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

    const tenantStorage = await supabase
      .from('Tenant')
      .select('id, businessname, tenant_code, maxstorage, isactive, monthlycost')
      .eq('isactive', true);

    const totalAllocatedStorage = tenantStorage.data?.reduce((sum, t) => sum + (t.maxstorage || 100), 0) || 0;
    const totalMonthlyCost = tenantStorage.data?.reduce((sum, t) => sum + (t.monthlycost || 0), 0) || 0;

    const tenantGrowth: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const { count } = await supabase
        .from('Tenant')
        .select('*', { count: 'exact', head: true })
        .gte('createdat', monthStart.toISOString())
        .lte('createdat', monthEnd.toISOString());
      tenantGrowth.push({
        month: monthStart.toLocaleDateString('es-HN', { month: 'short', year: '2-digit' }),
        count: count || 0,
      });
    }

    const invoiceTrend: Array<{ month: string; revenue: number; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const { data: monthInvoices } = await supabase
        .from('Invoice')
        .select('total, status')
        .gte('createdat', monthStart.toISOString())
        .lte('createdat', monthEnd.toISOString());
      const monthRevenue = monthInvoices?.reduce((sum, inv) => {
        if (inv.status === 'ACTIVE' || inv.status === 'PAID') return sum + (inv.total || 0);
        return sum;
      }, 0) || 0;
      invoiceTrend.push({
        month: monthStart.toLocaleDateString('es-HN', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        count: monthInvoices?.length || 0,
      });
    }

    const dbStart = Date.now();
    await supabase.from('Tenant').select('id', { count: 'exact', head: true }).limit(1);
    const dbLatency = Date.now() - dbStart;

    const recentActivity = auditLogsResult.data?.slice(0, 10).map(log => ({
      id: log.id,
      action: log.action,
      table: log.tablename,
      timestamp: log.timestamp,
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        tenants: {
          total: totalTenants || 0,
          active: activeTenants || 0,
          suspended: (totalTenants || 0) - (activeTenants || 0),
          trial: trialTenants || 0,
          growth: tenantGrowth,
        },
        users: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          inactive: (totalUsers || 0) - (activeUsers || 0),
        },
        revenue: {
          mrr,
          totalThisMonth: totalRevenue,
          lastMonth: lastMonthRevenue,
          growthPercent: Math.round(revenueGrowth * 100) / 100,
          trend: invoiceTrend,
        },
        invoices: {
          total: invoicesResult.data?.length || 0,
          subscription: subscriptionInvoices.length,
          customer: customerInvoices.length,
          expense: expenseInvoices.length,
          paid: invoicesResult.data?.filter(i => i.status === 'PAID' || i.status === 'ACTIVE').length || 0,
          pending: invoicesResult.data?.filter(i => i.status === 'PENDING').length || 0,
          overdue: invoicesResult.data?.filter(i => i.status === 'OVERDUE').length || 0,
          cancelled: invoicesResult.data?.filter(i => i.status === 'CANCELLED').length || 0,
        },
        transactions: {
          totalThisMonth: totalTransactions,
          volume: totalTransactionVolume,
        },
        storage: {
          totalAllocatedGB: totalAllocatedStorage,
          tenantCount: tenantStorage.data?.length || 0,
          breakdown: tenantStorage.data?.map(t => ({
            id: t.id,
            name: t.businessname,
            code: t.tenant_code,
            storageGB: t.maxstorage || 100,
          })) || [],
        },
        support: {
          open: openTicketsCount,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          total: tickets.length,
          critical: criticalTicketsCount,
        },
        system: {
          dbLatencyMs: dbLatency,
          dbStatus: dbLatency < 1000 ? 'healthy' : dbLatency < 3000 ? 'degraded' : 'critical',
          uptime: process.uptime?.() || 0,
          healthConfig: healthCheck.data || [],
        },
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error('Error in comprehensive-stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

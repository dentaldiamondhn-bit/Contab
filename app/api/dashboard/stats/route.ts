import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');

    // Helper para agregar filtro de company_id (snake_case en BD), patrón visto en tenant-admin/dashboard
    const withCompany = (query: any) => companyId ? query.eq('company_id', companyId) : query;

    // Get current month stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get transaction count for current month
    const currentMonthTransactions = await db.transaction.count({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get total transactions
    const totalTransactions = await db.transaction.count({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
      },
    });

    // Get total accounts
    const totalAccounts = await db.account.count({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
      },
    });

    // Sum real ingresos (voucherType INGRESO) and egresos (EGRESO) en céntimos
    const ingresos = await db.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        voucherType: 'INGRESO',
      },
    });
    const egresos = await db.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        voucherType: 'EGRESO',
      },
    });

    const totalRevenue = Number(ingresos._sum.totalAmount || 0n) / 100;
    const totalExpenses = Number(egresos._sum.totalAmount || 0n) / 100;
    const avgTransactionValue = currentMonthTransactions > 0 ? totalRevenue / currentMonthTransactions : 0;

    // Tasa de cobro real desde la tabla de facturas (pagos recibidos / facturado)
    let collectionRate = 0;
    try {
      const supabase = getSupabaseServer();
      const query = companyId ? supabase.from('Invoice').select('total, status').eq('company_id', companyId) : supabase.from('Invoice').select('total, status');
      const { data: invoices, error } = await query;

      if (!error && invoices) {
        const paidRevenue = invoices
          .filter((i: any) => i.status === 'paid' || i.status === 'PAID')
          .reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
        const invoicedRevenue = invoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
        collectionRate = invoicedRevenue > 0 ? Math.round((paidRevenue / invoicedRevenue) * 100) : 0;
      }
    } catch (invoiceError) {
      console.error('Error fetching invoice collection rate:', invoiceError);
    }

    // No existe tabla de pacientes en el esquema: sin dato inventado
    const totalPatients = 0;

    return NextResponse.json({
      totalAccounts,
      totalTransactions,
      currentMonthTransactions,
      totalRevenue,
      totalExpenses,
      avgTransactionValue,
      collectionRate,
      totalPatients,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
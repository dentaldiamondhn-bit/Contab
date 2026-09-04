import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Read purchases from JSON file
    let purchases: any[] = [];
    try {
      const filePath = join(process.cwd(), 'purchases-data.json');
      const fileContent = await readFile(filePath, 'utf-8');
      purchases = JSON.parse(fileContent);
    } catch (error) {
      // File might not exist yet
      purchases = [];
    }

    // Filter by tenant
    const tenantPurchases = purchases.filter(p => p.companyId === tenantId);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const totalPurchases = tenantPurchases.length;
    const completedPurchases = tenantPurchases.filter(p => p.status === 'completed').length;
    const pendingPurchases = tenantPurchases.filter(p => p.status === 'pending' || p.status === 'partial').length;

    const totalAmount = tenantPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const paidAmount = tenantPurchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const pendingAmount = totalAmount - paidAmount;
    const averagePurchase = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    const thisMonthPurchases = tenantPurchases.filter(p => {
      const d = new Date(p.created_at || p.invoice_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const lastMonthPurchases = tenantPurchases.filter(p => {
      const d = new Date(p.created_at || p.invoice_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    const growth = lastMonthPurchases > 0 
      ? ((thisMonthPurchases - lastMonthPurchases) / lastMonthPurchases) * 100 
      : 0;

    return NextResponse.json({
      totalPurchases,
      completedPurchases,
      pendingPurchases,
      totalAmount,
      paidAmount,
      pendingAmount,
      averagePurchase,
      thisMonthPurchases,
      lastMonthPurchases,
      growth: Math.round(growth * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching purchase stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase statistics' },
      { status: 500 }
    );
  }
}

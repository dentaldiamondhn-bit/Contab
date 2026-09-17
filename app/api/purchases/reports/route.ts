import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { fetchPurchases } from '@/lib/purchase-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const reportType = searchParams.get('type') || 'summary';

    const { data: purchases, error } = await fetchPurchases(getSupabaseServer(), { companyId });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }

    switch (reportType) {
      case 'summary':
        return generateSummaryReport(purchases || []);
      case 'monthly':
        return generateMonthlyReport(purchases || []);
      case 'category':
        return generateCategoryReport(purchases || []);
      case 'supplier':
        return generateSupplierReport(purchases || []);
      default:
        return generateSummaryReport(purchases || []);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateSummaryReport(purchases: any[]) {
  const total = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const pending = purchases.filter(p => p.status === 'PENDING' || p.status === 'PARTIAL').length;
  const completed = purchases.filter(p => p.status === 'PAID').length;
  const thisMonth = purchases.filter(p => {
    const purchaseDate = new Date(p.invoice_date || p.created_at || '');
    const now = new Date();
    return purchaseDate.getMonth() === now.getMonth() &&
           purchaseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (p.total || 0), 0);

  return NextResponse.json({
    totalPurchases: purchases.length,
    totalAmount: total,
    pendingCount: pending,
    completedCount: completed,
    thisMonthTotal: thisMonth,
    averagePurchase: purchases.length > 0 ? total / purchases.length : 0
  });
}

function generateMonthlyReport(purchases: any[]) {
  const monthlyData: { [key: string]: { count: number; total: number } } = {};

  purchases.forEach(purchase => {
    const date = new Date(purchase.invoice_date || purchase.created_at || '');
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { count: 0, total: 0 };
    }

    monthlyData[monthKey].count++;
    monthlyData[monthKey].total += purchase.total || 0;
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthlyReport = sortedMonths.map(month => ({
    month,
    count: monthlyData[month].count,
    total: monthlyData[month].total,
    average: monthlyData[month].total / monthlyData[month].count
  }));

  return NextResponse.json(monthlyReport);
}

function generateCategoryReport(purchases: any[]) {
  const categoryData: { [key: string]: { count: number; total: number } } = {};

  purchases.forEach(purchase => {
    const category = purchase.expense_category || 'Sin categoría';

    if (!categoryData[category]) {
      categoryData[category] = { count: 0, total: 0 };
    }

    categoryData[category].count++;
    categoryData[category].total += purchase.total || 0;
  });

  const categoryReport = Object.entries(categoryData).map(([category, data]) => ({
    category,
    count: data.count,
    total: data.total,
    percentage: 0 // Will be calculated client-side
  }));

  return NextResponse.json(categoryReport);
}

function generateSupplierReport(purchases: any[]) {
  const supplierData: { [key: string]: { count: number; total: number; name: string } } = {};

  purchases.forEach(purchase => {
    const supplier = purchase.supplier_name || 'Proveedor desconocido';

    if (!supplierData[supplier]) {
      supplierData[supplier] = { count: 0, total: 0, name: supplier };
    }

    supplierData[supplier].count++;
    supplierData[supplier].total += purchase.total || 0;
  });

  const supplierReport = Object.values(supplierData)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 suppliers

  return NextResponse.json(supplierReport);
}
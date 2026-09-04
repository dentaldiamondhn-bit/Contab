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

    // Get products from Supabase (lowercase table)
    const { data: products, error } = await supabase
      .from('product')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalInventoryValue: 0,
        totalStockValue: 0,
        categories: [],
        recentMovements: [],
        monthlyStats: { currentMonth: 0, previousMonth: 0, growth: 0 }
      });
    }

    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.is_active !== false).length || 0;
    const lowStockProducts = products?.filter(p => {
      const stock = p.current_stock || p.stock_quantity || 0;
      const min = p.min_stock || 0;
      return stock > 0 && stock <= min;
    }).length || 0;
    const outOfStockProducts = products?.filter(p => {
      const stock = p.current_stock || p.stock_quantity || 0;
      return stock === 0;
    }).length || 0;

    const totalInventoryValue = products?.reduce((sum, p) => {
      const stock = p.current_stock || p.stock_quantity || 0;
      const cost = p.current_cost || p.unit_price || 0;
      return sum + (stock * cost);
    }, 0) || 0;

    const totalStockValue = products?.reduce((sum, p) => {
      const stock = p.current_stock || p.stock_quantity || 0;
      const price = p.unit_price || p.price || 0;
      return sum + (stock * price);
    }, 0) || 0;

    // Categories
    const categoryMap = new Map<string, { count: number, totalValue: number, totalStock: number }>();
    products?.forEach(p => {
      const cat = p.category || 'Sin categoría';
      const stock = p.current_stock || p.stock_quantity || 0;
      const cost = p.current_cost || p.unit_price || 0;
      const existing = categoryMap.get(cat) || { count: 0, totalValue: 0, totalStock: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        totalValue: existing.totalValue + (stock * cost),
        totalStock: existing.totalStock + stock
      });
    });
    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      productCount: data.count,
      totalValue: data.totalValue,
      stockLevel: data.totalStock
    }));

    // Recent movements (products created recently)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentMovements = products
      ?.filter(p => new Date(p.created_at) > thirtyDaysAgo)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        productName: p.name,
        type: 'IN',
        quantity: p.current_stock || p.stock_quantity || 0,
        date: p.created_at,
        reference: 'Compra inicial',
        totalCost: (p.current_stock || p.stock_quantity || 0) * (p.current_cost || p.unit_price || 0)
      })) || [];

    // Monthly stats
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthProducts = products?.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length || 0;

    const lastMonthProducts = products?.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length || 0;

    const growth = lastMonthProducts > 0 
      ? ((currentMonthProducts - lastMonthProducts) / lastMonthProducts) * 100 
      : 0;

    return NextResponse.json({
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
      totalStockValue,
      categories,
      recentMovements,
      monthlyStats: {
        currentMonth: currentMonthProducts,
        previousMonth: lastMonthProducts,
        growth: Math.round(growth * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory statistics' },
      { status: 500 }
    );
  }
}

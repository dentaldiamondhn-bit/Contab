import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withTenants = searchParams.get('withTenants') === 'true';
    const planCode = searchParams.get('planCode');

    // Caso especial: listar tenants de un plan
    if (withTenants && planCode) {
      const { data: tenants, error } = await supabase
        .from('Tenant')
        .select('id, businessName, tenantCode, isActive')
        .ilike('subscriptionPlans', `%${planCode}%`);

      if (error) throw error;

      const mapped = (tenants || []).map((t: any) => ({
        id: t.id,
        businessName: t.businessName || t.businessname,
        tenantCode: t.tenantCode || t.tenant_code,
        isActive: t.isActive ?? t.isactive,
      }));

      return NextResponse.json({ tenants: mapped });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let query = supabase.from('Plan').select('*', { count: 'exact' }).order('price', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const { data, error, count } = await query;
    if (error) throw error;

    // Calcular tenantCount por plan
    let tenantsByPlan: Record<string, number> = {};
    try {
      const { data: tenants } = await supabase.from('Tenant').select('subscriptionPlans');
      (tenants || []).forEach((t: any) => {
        const plansStr = t.subscriptionPlans || t.subscription_plans || t.subscriptionplan || '';
        (data || []).forEach((p: any) => {
          if (plansStr && plansStr.includes(p.code)) {
            tenantsByPlan[p.code] = (tenantsByPlan[p.code] || 0) + 1;
          }
        });
      });
    } catch {}

    const plans = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      price: p.price,
      maxUsers: p.max_users ?? p.maxUsers,
      maxStorage: p.max_storage ?? p.maxStorage,
      maxTransactions: p.max_transactions ?? p.maxTransactions,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []),
      modules: typeof p.modules === 'string' ? JSON.parse(p.modules) : (p.modules || []),
      isActive: p.is_active ?? p.isActive,
      tenantCount: tenantsByPlan[p.code] || 0,
    }));

    // Paginación manual (supabase no pagina si no usamos range)
    const total = count || plans.length;
    const pages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = plans.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      plans: paginated,
      pagination: { pages, total, page, limit },
    });
  } catch (error: any) {
    console.error('GET /api/admin/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, code, price, maxUsers, maxStorage, maxTransactions, features, modules, isActive } = body;

    if (!name || !code) return NextResponse.json({ error: 'Nombre y código requeridos' }, { status: 400 });

    const { data, error } = await supabase
      .from('Plan')
      .insert([{
        name,
        code: code.toUpperCase(),
        price: price || 0,
        max_users: maxUsers || 5,
        max_storage: maxStorage || 100,
        max_transactions: maxTransactions || 10000,
        features: JSON.stringify(features || []),
        modules: JSON.stringify(modules || []),
        is_active: isActive ?? true,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, plan: data });
  } catch (error: any) {
    console.error('POST /api/admin/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { id, name, code, price, maxUsers, maxStorage, maxTransactions, features, modules, isActive } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (price !== undefined) updateData.price = price;
    if (maxUsers !== undefined) updateData.max_users = maxUsers;
    if (maxStorage !== undefined) updateData.max_storage = maxStorage;
    if (maxTransactions !== undefined) updateData.max_transactions = maxTransactions;
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (modules !== undefined) updateData.modules = JSON.stringify(modules);
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('Plan')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, plan: data });
  } catch (error: any) {
    console.error('PATCH /api/admin/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('Plan').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/admin/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

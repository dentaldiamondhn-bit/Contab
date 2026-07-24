import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

interface PlanDB {
  id: string;
  name: string;
  code: string;
  price: number;
  max_users: number;
  max_storage: number;
  max_transactions: number;
  features: string;
  modules: string;
  is_active: boolean;
}

function mapPlanFromDB(p: PlanDB) {
  let features: string[] = [];
  let modules: string[] = [];
  try { features = JSON.parse(p.features); } catch { features = []; }
  try { modules = JSON.parse(p.modules); } catch { modules = []; }
  if (!Array.isArray(features)) features = [];
  if (!Array.isArray(modules)) modules = [];

  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.name,
    unitPrice: p.price,
    subtotal: p.price,
    taxRate: 15,
    taxAmount: Math.round(p.price * 0.15),
    total: Math.round(p.price * 1.15),
    maxUsers: p.max_users,
    maxStorage: p.max_storage,
    maxTransactions: p.max_transactions,
    features,
    modules,
    isActive: p.is_active,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { data: plans, error } = await supabase
      .from('Plan')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching public plans:', error);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    const formattedPlans = (plans || []).map(mapPlanFromDB);

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
      total: formattedPlans.length
    });

  } catch (error: any) {
    console.error('Error en GET /api/admin/plans-public:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

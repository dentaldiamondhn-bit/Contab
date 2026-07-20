import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PlanDB {
  id: string;
  name: string;
  code: string;
  price: number;
  max_users: number;
  max_storage: number;
  max_transactions: number;
  features: string;     // JSON array almacenado como string en la BD
  modules: string;      // JSON array almacenado como string en la BD
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: string[];
  isActive: boolean;
  tenantCount?: number;
}

interface TenantInfo {
  id: string;
  businessName: string;
  tenantCode: string;
  isActive: boolean;
}

// ─── Planos estándar legacy ───────────────────────────────────────────────────
// Mapeo de códigos antiguos a códigos modernos usados antes de la migración
const LEGACY_PLAN_MAP: Record<string, string> = {
  'basic': 'BASIC',
  'standard': 'PREMIUM',
  'advanced': 'ENTERPRISE',
  'enterprise': 'ENTERPRISE',
};

/**
 * Normaliza un código de plan heredado al código moderno en mayúsculas.
 */
function normalizeLegacyPlan(code?: string | null): string | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return LEGACY_PLAN_MAP[upper] || upper || null;
}

/**
 * Extrae los códigos de plan desde el campo JSON o CSV de Supabase.
 */
function extractPlanCodes(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p: any) => (typeof p === 'string' ? normalizeLegacyPlan(p) : normalizeLegacyPlan(p?.code)))
        .filter((c): c is string => Boolean(c));
    }
  } catch {}
  return raw.split(',').map(s => normalizeLegacyPlan(s)).filter((c): c is string => Boolean(c));
}

/**
 * Transforma un registro de Supabase `Plan` al formato del frontend.
 */
function mapPlanFromDB(p: PlanDB): Plan {
  let features: string[] = [];
  let modules: string[] = [];

  try { features = JSON.parse(p.features); } catch { features = []; }
  if (!Array.isArray(features)) features = [];

  try { modules = JSON.parse(p.modules); } catch { modules = []; }
  if (!Array.isArray(modules)) modules = [];

  return {
    id: p.id,
    name: p.name,
    code: p.code,
    price: p.price,
    maxUsers: p.max_users,
    maxStorage: p.max_storage,
    maxTransactions: p.max_transactions,
    features,
    modules,
    isActive: p.is_active,
  };
}

// ─── Helpers de Supabase ───────────────────────────────────────────────────────

/**
 * Obtiene el conteo de tenants por cada plan code desde Supabase.
 * Lee el campo subscription_plan (CSV) de cada tenant.
 */
export async function getTenantsPerPlan(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const { data: tenants, error } = await supabase
    .from('Tenant')
    .select('subscription_plan');

  if (error) {
    console.error('❌ Error obteniendo tenants:', error.message);
    return counts;
  }

  (tenants || []).forEach((tenant: any) => {
    const raw = tenant.subscription_plan || '';
    const codes = raw
      .split(',')
      .map(s => normalizeLegacyPlan(s))
      .filter((c): c is string => Boolean(c));
    const uniqueCodes = Array.from(new Set(codes));
    uniqueCodes.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
  });

  return counts;
}

/**
 * Obtiene la lista de tenants que usan un plan específico.
 */
export async function getTenantsByPlan(planCode: string): Promise<TenantInfo[]> {
  const result: TenantInfo[] = [];

  const { data: tenants, error } = await supabase
    .from('Tenant')
    .select('id, businessname, tenant_code, is_active, subscription_plan');

  if (error) {
    console.error(`❌ Error obteniendo tenants para plan ${planCode}:`, error.message);
    return result;
  }

  const normalizedCode = planCode.toUpperCase();

  (tenants || []).forEach((tenant: any) => {
    const raw = tenant.subscription_plan || '';
    if (raw.split(',').map((s: string) => normalizeLegacyPlan(s)).filter(Boolean).includes(normalizedCode)) {
      result.push({
        id: tenant.id,
        businessName: tenant.businessname,
        tenantCode: tenant.tenant_code,
        isActive: tenant.is_active,
      });
    }
  });

  return result;
}

// ─── HTTP Handlers ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔄 POST /api/admin/plans - Creando plan:', body.name);

    // Generate UUID explicitly to avoid Supabase client sending null for id column
    const planId = crypto.randomUUID();

    const { data: created, error } = await supabase
      .from('Plan')
      .insert({
        id:           planId,
        name:         body.name,
        code:         (body.code || '').toUpperCase(),
        price:        Number(body.price) || 0,
        max_users:    Number(body.maxUsers) || 5,
        max_storage:  Number(body.maxStorage) || 100,
        max_transactions: Number(body.maxTransactions) || 10000,
        features:     JSON.stringify(body.features || []),
        modules:      JSON.stringify(body.modules || []),
        is_active:    body.isActive !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando plan:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Plan creado:', created.id);
    return NextResponse.json({
      success: true,
      message: 'Plan creado exitosamente',
      plan: mapPlanFromDB(created),
    });

  } catch (err: any) {
    console.error('❌ Error en POST /api/admin/plans:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del plan es requerido' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('Plan').delete().eq('id', id);
    if (error) {
      console.error('❌ Error eliminando plan:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Plan eliminado' });

  } catch (err: any) {
    console.error('❌ Error en DELETE /api/admin/plans:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔄 PATCH /api/admin/plans - Actualizando plan:', body.id);

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID del plan es requerido' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      name:        body.name,
      code:        body.code ? body.code.toUpperCase() : undefined,
      price:       Number(body.price),
      max_users:   Number(body.maxUsers),
      max_storage: Number(body.maxStorage),
      max_transactions: Number(body.maxTransactions),
      features:    JSON.stringify(body.features || []),
      modules:     JSON.stringify(body.modules || []),
      is_active:   body.isActive,
    };

    const { data: updated, error } = await supabase
      .from('Plan')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando plan:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Plan actualizado:', updated.id);
    return NextResponse.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      plan: mapPlanFromDB(updated),
    });

  } catch (err: any) {
    console.error('❌ Error en PATCH /api/admin/plans:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/plans');
    const { searchParams } = new URL(req.url);
    const withTenants = searchParams.get('withTenants');
    const planCodeFilter = searchParams.get('planCode');

    // 1. Leer planes directamente desde Supabase
    const { data: dbPlans, error } = await supabase
      .from('Plan')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error leyendo planes de Supabase:', error.message);
      return NextResponse.json({ error: 'Error leyendo planes' }, { status: 500 });
    }

    let plans = (dbPlans || []).map(mapPlanFromDB);

    // 2. Adjuntar tenantCount
    if (withTenants !== 'true') {
      const tenantsPerPlan = await getTenantsPerPlan();
      plans = plans.map(plan => ({
        ...plan,
        tenantCount: tenantsPerPlan[plan.code] || 0,
      }));
    }

    // 3. Si se solicita lista detallada de tenants para un plan
    if (withTenants === 'true' && planCodeFilter) {
      const tenants = await getTenantsByPlan(planCodeFilter);
      return NextResponse.json({
        success: true,
        tenants,
        tenantCount: tenants.length,
      });
    }

    return NextResponse.json({
      success: true,
      plans,
      total: plans.length,
    });

  } catch (err: any) {
    console.error('❌ Error en GET /api/admin/plans:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

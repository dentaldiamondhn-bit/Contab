import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

function diffDays(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [tenantsRes, compensationsRes] = await Promise.all([
      supabaseAdmin
        .from('Tenant')
        .select('id, businessname, businessrtn, tenant_code, subscriptionplan, isactive, createdat, monthlycost')
        .order('businessname'),
      supabaseAdmin
        .from('TenantCompensation')
        .select('tenantid, type, days, amount'),
    ]);

    if (tenantsRes.error) throw tenantsRes.error;

    // Calculate total compensation days per tenant
    const compDaysByTenant: Record<string, number> = {};
    const compAmountByTenant: Record<string, number> = {};
    for (const c of compensationsRes.data || []) {
      if (c.type === 'EXTEND_DAYS') {
        compDaysByTenant[c.tenantid] = (compDaysByTenant[c.tenantid] || 0) + (c.days || 0);
      }
      if (c.type === 'CREDIT') {
        compAmountByTenant[c.tenantid] = (compAmountByTenant[c.tenantid] || 0) + (c.amount || 0);
      }
    }

    const now = new Date();

    const result = (tenantsRes.data || []).map((t: any) => {
      const createdAt = new Date(t.createdat);
      const daysActive = diffDays(createdAt, now);
      const monthsActive = Math.floor(daysActive / 30);
      const plan = t.subscriptionplan || 'BASIC';
      const totalCompDays = compDaysByTenant[t.id] || 0;

      // Calculate next renewal (monthly cycle from creation, adjusted for compensation days)
      const dayOfMonth = createdAt.getDate();
      let nextRenewal = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      if (nextRenewal <= now) {
        nextRenewal = addMonths(nextRenewal, 1);
      }
      // Add compensation days to push renewal further
      nextRenewal = new Date(nextRenewal.getTime() + totalCompDays * 24 * 60 * 60 * 1000);
      const daysUntilRenewal = diffDays(now, nextRenewal);

      const totalMonths = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());

      return {
        tenantId: t.id,
        businessName: t.businessname,
        rtn: t.businessrtn,
        tenantCode: t.tenant_code,
        plan,
        isActive: t.isactive,
        monthlyCost: t.monthlycost || 0,
        createdAt: t.createdat,
        createdAtFormatted: formatDate(createdAt),
        daysActive,
        monthsActive,
        totalMonths,
        nextRenewal: nextRenewal.toISOString(),
        nextRenewalFormatted: formatDate(nextRenewal),
        daysUntilRenewal,
        totalCompensationDays: totalCompDays,
        totalCompensationCredit: compAmountByTenant[t.id] || 0,
      };
    });

    return NextResponse.json({ success: true, tenants: result });
  } catch (error: any) {
    console.error('Error in tenant activity report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

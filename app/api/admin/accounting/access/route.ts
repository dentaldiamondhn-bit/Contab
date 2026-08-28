import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const ACCOUNTING_BOOKS = [
  { id: 'ACCOUNTING', name: 'Contabilidad Central', description: 'Libro Diario, Libro Mayor, Asientos' },
  { id: 'FINANCIAL_STATEMENTS', name: 'Estados Financieros', description: 'Balance General, Estado de Resultados, Flujo de Efectivo' },
  { id: 'LEGAL_BOOKS', name: 'Libros Legales', description: 'Libros legales y registros fiscales obligatorios' },
];

async function checkAuth() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { error: 'No autorizado', status: 401 };

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress || '';
    const userRole = user.publicMetadata?.role || user.unsafeMetadata?.role || (sessionClaims?.metadata as any)?.role;
    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
      return { error: 'No autorizado', status: 403 };
    }
    return { userId, email };
  } catch {
    return { error: 'Error verifying auth', status: 500 };
  }
}

export async function GET() {
  const authResult = await checkAuth();
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { data: tenants, error } = await supabaseAdmin
      .from('Tenant')
      .select('id, businessname, businessrtn, tenant_code, modules, isactive')
      .order('businessname');

    if (error) throw error;

    const result = (tenants || []).map((t: any) => ({
      id: t.id,
      businessName: t.businessname,
      rtn: t.businessrtn,
      tenantCode: t.tenant_code,
      isActive: t.isactive,
      modules: t.modules ? t.modules.split(',').map((m: string) => m.trim()) : [],
    }));

    return NextResponse.json({ tenants: result, books: ACCOUNTING_BOOKS });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await checkAuth();
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { tenantId, moduleId, enabled } = await req.json();

    if (!tenantId || !moduleId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing tenantId, moduleId, or enabled' }, { status: 400 });
    }

    if (!ACCOUNTING_BOOKS.find(b => b.id === moduleId)) {
      return NextResponse.json({ error: 'Invalid accounting module' }, { status: 400 });
    }

    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from('Tenant')
      .select('modules')
      .eq('id', tenantId)
      .single();

    if (fetchError) throw fetchError;

    const currentModules: string[] = tenant.modules
      ? tenant.modules.split(',').map((m: string) => m.trim())
      : [];

    let updatedModules: string[];
    if (enabled) {
      updatedModules = currentModules.includes(moduleId)
        ? currentModules
        : [...currentModules, moduleId];
    } else {
      updatedModules = currentModules.filter(m => m !== moduleId);
    }

    const { error: updateError } = await supabaseAdmin
      .from('Tenant')
      .update({ modules: updatedModules.join(',') })
      .eq('id', tenantId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, modules: updatedModules });
  } catch (error: any) {
    console.error('Error updating tenant module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

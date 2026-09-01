import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';
import { InvoiceGenerator } from '@/lib/billing/invoice-generator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener tenant del usuario
    const { data: userData } = await supabase.from('User').select('tenantid').eq('authid', userId).maybeSingle();
    const tenantId = (userData as any)?.tenantid;
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario sin tenant' }, { status: 404 });
    }

    // Verificar si ya tiene factura pendiente para este mes (inmutable)
    const hasPending = await InvoiceGenerator.hasPendingInvoiceForMonth(tenantId);
    if (hasPending) {
      return NextResponse.json({ success: true, message: 'Ya existe factura del mes actual (inmutable)' });
    }

    // Obtener datos del tenant para generar factura con el plan activo en este momento (snapshot)
    const { data: tenant } = await supabase.from('Tenant').select('*').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

    // tenant.subscriptionplan puede ser JSON o string, InvoiceGenerator lo maneja
    const invoiceId = await InvoiceGenerator.generateInvoiceForTenant({
      tenant_id: tenant.id,
      tenant_code: tenant.tenant_code || tenant.id,
      business_name: tenant.businessname || tenant.business_name,
      subscription_plan: (tenant as any).subscriptionplan || (tenant as any).subscription_plan || 'BASIC',
    } as any);

    // Retornar la factura recién creada (inmutable)
    const { data: invoice } = await supabase.from('invoice').select('*').eq('id', invoiceId).single();

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('generate-current error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

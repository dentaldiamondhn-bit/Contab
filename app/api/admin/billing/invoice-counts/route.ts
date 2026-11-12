import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // SUBSCRIPTION, CUSTOMER, EXPENSE

    let query = supabase
      .from('Invoice')
      .select('tenantId, id, total, status, invoiceType, createdAt');

    if (type) {
      query = query.eq('invoiceType', type);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Error consultando facturas' }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: true, tenants: [] });
    }

    // Group by tenantId
    const tenantMap = new Map<string, {
      tenantId: string;
      totalInvoices: number;
      paidInvoices: number;
      pendingInvoices: number;
      overdueInvoices: number;
      cancelledInvoices: number;
      totalAmount: number;
      paidAmount: number;
    }>();

    for (const inv of invoices) {
      const tid = inv.tenantId || 'unknown';
      if (!tenantMap.has(tid)) {
        tenantMap.set(tid, {
          tenantId: tid,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          cancelledInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
        });
      }
      const t = tenantMap.get(tid)!;
      t.totalInvoices++;
      t.totalAmount += inv.total || 0;
      if (inv.status === 'PAID' || inv.status === 'ACTIVE') {
        t.paidInvoices++;
        t.paidAmount += inv.total || 0;
      } else if (inv.status === 'PENDING') {
        t.pendingInvoices++;
      } else if (inv.status === 'OVERDUE') {
        t.overdueInvoices++;
      } else if (inv.status === 'CANCELLED') {
        t.cancelledInvoices++;
      }
    }

    // Fetch tenant names
    const tenantIds = [...tenantMap.keys()].filter((id) => id !== 'unknown');
    let tenantNames: Record<string, string> = {};

    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('Tenant')
        .select('id, businessname')
        .in('id', tenantIds);

      if (tenants) {
        for (const t of tenants) {
          tenantNames[t.id] = t.businessname;
        }
      }
    }

    const result = [...tenantMap.values()]
      .map((t) => ({
        ...t,
        businessName: tenantNames[t.tenantId] || 'Desconocido',
      }))
      .sort((a, b) => b.totalInvoices - a.totalInvoices);

    return NextResponse.json({ success: true, tenants: result });
  } catch (error) {
    console.error('Error in invoice-counts:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

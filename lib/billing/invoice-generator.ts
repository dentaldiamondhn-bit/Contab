import { randomUUID } from 'node:crypto';
import { supabase } from '@/lib/supabase-db';

interface PlanWithQuantity {
  code: string;
  quantity: number;
}

interface TenantInput {
  tenant_id?: string;
  id?: string;
  tenant_code?: string;
  business_name?: string;
  businessname?: string;
  subscription_plan?: string;
  subscriptionplan?: string;
}

export class InvoiceGenerator {
  /**
   * Generate monthly invoices for all active tenants
   */
  static async generateMonthlyInvoices(): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };

    try {
      const { data: tenants, error } = await (supabase as any)
        .from('Tenant')
        .select('id,businessname,tenant_code,subscriptionplan,isactive')
        .eq('isactive', true);

      if (error) {
        results.errors.push(`System error: ${error.message}`);
        return results;
      }

      for (const tenant of tenants || []) {
        try {
          const tenantId = tenant.id;
          const hasPendingInvoice = await this.hasPendingInvoiceForMonth(tenantId);
          if (hasPendingInvoice) continue;

          await this.generateInvoiceForTenant({
            tenant_id: tenantId,
            tenant_code: tenant.tenant_code || tenantId,
            business_name: tenant.businessname,
            subscription_plan: tenant.subscriptionplan,
          });
          results.success++;
        } catch (error) {
          results.errors.push(`Error generating invoice for tenant ${tenant.businessname}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`System error: ${error}`);
      return results;
    }
  }

  /**
   * Generate invoice for a specific tenant
   */
  static async generateInvoiceForTenant(tenant: TenantInput): Promise<string> {
    const tenantId = tenant.tenant_id || tenant.id;
    if (!tenantId) throw new Error('tenant_id requerido');

    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);

    const rawPlan = tenant.subscription_plan || tenant.subscriptionplan;
    let subscriptionPlans: PlanWithQuantity[];
    try {
      subscriptionPlans = rawPlan ? JSON.parse(rawPlan) : [{ code: 'BASIC', quantity: 1 }];
      if (!Array.isArray(subscriptionPlans)) subscriptionPlans = [{ code: 'BASIC', quantity: 1 }];
    } catch {
      subscriptionPlans = [{ code: String(rawPlan), quantity: 1 }];
    }

    const planCodes = subscriptionPlans.map((p) => p.code);
    const { data: plans } = await (supabase as any)
      .from('Plan')
      .select('id,name,code,price')
      .in('code', planCodes)
      .eq('is_active', true);

    const invoiceItems: Array<{
      planId?: string;
      planName: string;
      planCode: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];
    let subtotal = 0;

    for (const subscriptionPlan of subscriptionPlans) {
      const plan = (plans || []).find((p: any) => p.code === subscriptionPlan.code);
      if (!plan) continue;

      const quantity = subscriptionPlan.quantity || 1;
      const unitPrice = Number(plan.price) || 0;
      const itemSubtotal = unitPrice * quantity;

      invoiceItems.push({
        planId: plan.id,
        planName: plan.name,
        planCode: plan.code,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    const taxRate = 15;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + tax;

    const invoiceNumber = await this.generateInvoiceNumber(tenant.tenant_code || tenantId);
    const id = randomUUID();

    const { error: invoiceError } = await (supabase as any).from('Invoice').insert({
      id,
      tenantId,
      invoiceNumber,
      invoiceType: 'SUBSCRIPTION',
      status: 'PENDING',
      customerName: tenant.business_name || 'Cliente',
      customerRTN: '00000000000000',
      customerEmail: null,
      customerAddress: '',
      issuerName: 'Diamond Accounting',
      issuerRTN: '00000000000000',
      issuerAddress: 'Tegucigalpa, Honduras',
      issueDate: now.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      cai: null,
      subtotal,
      tax,
      total,
      currency: 'HNL',
      taxRate,
      notes: JSON.stringify({
        subscriptionPlans,
        plans: (plans || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code, price: p.price })),
      }),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    if (invoiceError) throw new Error(invoiceError.message);

    for (const item of invoiceItems) {
      const { error: itemError } = await (supabase as any).from('InvoiceItem').insert({
        id: randomUUID(),
        invoiceId: id,
        description: item.planName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.subtotal + Math.round(item.unitPrice * item.quantity * (taxRate / 100) * 100) / 100,
        taxRate,
        taxAmount: Math.round(item.unitPrice * item.quantity * (taxRate / 100) * 100) / 100,
        isTaxable: true,
        productCode: item.planCode,
        serviceCode: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      if (itemError) throw new Error(itemError.message);
    }

    return id;
  }

  /**
   * Check if tenant already has a pending invoice for current month
   */
  static async hasPendingInvoiceForMonth(tenantId: string): Promise<boolean> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data } = await (supabase as any)
      .from('Invoice')
      .select('id')
      .eq('tenantId', tenantId)
      .eq('status', 'PENDING')
      .gte('createdAt', periodStart)
      .lte('createdAt', periodEnd)
      .limit(1);

    return !!(data && data.length > 0);
  }

  /**
   * Generate unique invoice number
   */
  static async generateInvoiceNumber(tenantCode: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${tenantCode}-${year}${month}`;

    const { count } = await (supabase as any)
      .from('Invoice')
      .select('id', { count: 'exact', head: true })
      .ilike('invoiceNumber', `${prefix}%`);

    const sequence = String((count || 0) + 1).padStart(3, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * Get invoice details with items
   */
  static async getInvoiceDetails(invoiceId: string) {
    const { data: invoice } = await (supabase as any)
      .from('Invoice')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    if (!invoice) return null;

    const { data: invoiceItems } = await (supabase as any)
      .from('InvoiceItem')
      .select('*')
      .eq('invoiceId', invoiceId);

    return { ...invoice, invoiceItems: invoiceItems || [] };
  }

  /**
   * Get invoices for a tenant
   */
  static async getTenantInvoices(tenantId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: invoices, count } = await (supabase as any)
      .from('Invoice')
      .select('*', { count: 'exact' })
      .eq('tenantId', tenantId)
      .order('issueDate', { ascending: false })
      .range(from, to);

    const total = count || 0;
    return {
      invoices: invoices || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId: string, status: string) {
    const { data } = await (supabase as any)
      .from('Invoice')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', invoiceId)
      .select()
      .single();
    return data;
  }
}

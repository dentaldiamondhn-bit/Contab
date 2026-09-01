import { db } from '@/lib/db';

interface PlanWithQuantity {
  code: string;
  quantity: number;
}

export class InvoiceGenerator {
  /**
   * Generate monthly invoices for all active tenants
   */
  static async generateMonthlyInvoices(): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] };

    try {
      // Get all active tenants using the tenant_plan_summary view
      const tenants = await (db as any).tenantPlanSummary.findMany({
        where: { is_active: true },
        select: {
          tenant_id: true,
          business_name: true,
          tenant_code: true,
          subscription_plan: true,
          monthly_cost: true,
          max_users: true,
          active_users: true,
          total_users: true
        }
      });

      for (const tenant of tenants) {
        try {
          // Check if tenant already has a pending invoice for this month
          const hasPendingInvoice = await this.hasPendingInvoiceForMonth(tenant.tenant_id);
          if (hasPendingInvoice) {
            continue;
          }

          // Generate invoice for this tenant
          await this.generateInvoiceForTenant(tenant);
          results.success++;
        } catch (error) {
          const errorMessage = `Error generating invoice for tenant ${tenant.business_name}: ${error}`;
          console.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in generateMonthlyInvoices:', error);
      results.errors.push(`System error: ${error}`);
      return results;
    }
  }

  /**
   * Generate invoice for a specific tenant
   */
  static async generateInvoiceForTenant(tenant: any): Promise<string> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15); // Due on 15th of current month

    // Parse tenant's subscription plans
    const subscriptionPlans: PlanWithQuantity[] = tenant.subscription_plan 
      ? JSON.parse(tenant.subscription_plan) 
      : [{ code: 'BASIC', quantity: 1 }];

    // Get plan details
    const planCodes = subscriptionPlans.map((p: any) => p.code);
    const plans = await (db as any).plan.findMany({
      where: { 
        code: { in: planCodes },
        isActive: true 
      }
    });

    // Calculate invoice items
    const invoiceItems = [];
    let subtotal = 0;

    for (const subscriptionPlan of subscriptionPlans) {
      const plan = plans.find((p: any) => p.code === subscriptionPlan.code);
      if (!plan) continue;

      const quantity = subscriptionPlan.quantity;
      const unitPrice = plan.price;
      const itemSubtotal = unitPrice * quantity;

      invoiceItems.push({
        planId: plan.id,
        planName: plan.name,
        quantity,
        unitPrice,
        subtotal: itemSubtotal
      });

      subtotal += itemSubtotal;
    }

    // Calculate tax (15% in Honduras)
    const taxRate = 0.15;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(tenant.tenant_code);

    // Create invoice - usar nombres Prisma correctos
    const invoice = await (db as any).invoice.create({
      data: {
        tenantId: tenant.tenant_id,
        invoiceNumber,
        invoiceDate: now.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        invoiceType: 'SUBSCRIPTION',
        customerId: tenant.tenant_id,
        customerRTN: '00000000000000',
        customerName: tenant.business_name || 'Cliente',
        customerAddress: '',
        issuerRTN: '00000000000000',
        issuerName: 'Diamond Accounting',
        issuerAddress: 'Tegucigalpa, Honduras',
        cai: '00000000000000',
        rangeStart: 1,
        rangeEnd: 1000,
        items: JSON.stringify(invoiceItems),
        subtotal,
        tax,
        totalTax: tax,
        total,
        currency: 'HNL',
        status: 'PENDING',
        notes: JSON.stringify({
          subscriptionPlans,
          plans: plans.map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            price: p.price
          }))
        })
      }
    });

    // Create invoice items - nombres Prisma correctos
    for (const item of invoiceItems) {
      await (db as any).invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          planId: item.planId,
          planName: item.planName,
          description: item.planName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxRate: 0.15,
          taxAmount: Math.round(item.unitPrice * item.quantity * 0.15),
          total: item.subtotal + Math.round(item.unitPrice * item.quantity * 0.15),
        }
      });
    }

    return invoice.id;
  }

  /**
   * Check if tenant already has a pending invoice for current month
   */
  static async hasPendingInvoiceForMonth(tenantId: string): Promise<boolean> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const existingInvoice = await (db as any).invoice.findFirst({
      where: {
        tenantId,
        status: 'PENDING',
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    return !!existingInvoice;
  }

  /**
   * Generate unique invoice number
   */
  static async generateInvoiceNumber(tenantCode: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices for this tenant and month (usar createdAt, tenantId via invoiceNumber prefix)
    const count = await (db as any).invoice.count({
      where: {
        invoiceNumber: { startsWith: `INV-${tenantCode}-${year}${month}` }
      }
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `INV-${tenantCode}-${year}${month}-${sequence}`;
  }

  /**
   * Get invoice details with items
   */
  static async getInvoiceDetails(invoiceId: string) {
    return await (db as any).invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          select: {
            businessName: true,
            businessEmail: true,
            businessRTN: true,
            businessAddress: true,
            phoneNumber: true
          }
        },
        invoiceItems: {
          include: {
            plan: {
              select: {
                name: true,
                code: true,
                features: true,
                modules: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get invoices for a tenant
   */
  static async getTenantInvoices(tenantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [invoices, totalCount] = await Promise.all([
      (db as any).invoice.findMany({
        where: { tenantId },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
        include: {
          invoiceItems: {
            include: {
              plan: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          }
        }
      }),
      (db as any).invoice.count({ where: { tenantId } })
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId: string, status: string) {
    return await (db as any).invoice.update({
      where: { id: invoiceId },
      data: { status }
    });
  }
}

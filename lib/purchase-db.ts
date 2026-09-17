import type { SupabaseClient } from '@supabase/supabase-js';

export const TENANT_ID = '1';

export interface PurchaseFilters {
  companyId?: string | null;
  supplierId?: string | null;
  search?: string | null;
}

export function transformPurchase(p: any): any {
  const supplier = Array.isArray(p.Supplier) ? p.Supplier[0] : p.Supplier;
  const rows = Array.isArray(p.items) ? p.items : Array.isArray(p.PurchaseItem) ? p.PurchaseItem : [];
  const items = rows.map((i: any) => ({ ...i }));

  const total = Number(p.total) || 0;
  const amountPaid = p.amount_paid === null || p.amount_paid === undefined ? 0 : Number(p.amount_paid);
  const balanceDue = p.balance_due === null || p.balance_due === undefined ? total - amountPaid : Number(p.balance_due);

  let status = p.status || '';
  if (status === 'completed' || status === 'paid') status = 'PAID';
  else if (status === 'partial') status = 'PARTIAL';
  else if (status === 'pending') status = 'PENDING';

  if (!['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'].includes(status)) {
    status = balanceDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
  }

  const { Supplier, PurchaseItem, ...rest } = p;

  return {
    ...rest,
    status,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    supplier,
    supplier_id: supplier?.id || p.supplier_id,
    supplier_name: supplier?.name || p.supplier_name || '',
    items,
    companyId: p.company_id,
  };
}

export async function fetchPurchases(supabase: SupabaseClient, filters: PurchaseFilters) {
  let query = supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('tenant_id', TENANT_ID)
    .order('invoice_date', { ascending: false });

  if (filters.companyId) {
    query = query.eq('company_id', filters.companyId);
  }
  if (filters.supplierId) {
    query = query.eq('supplier_id', filters.supplierId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  let rows = (data || []).map(transformPurchase);

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter(
      (p: any) =>
        String(p.invoice_number || '').toLowerCase().includes(term) ||
        String(p.supplier_name || '').toLowerCase().includes(term)
    );
  }

  return { data: rows, error: null };
}

export async function createPurchase(supabase: SupabaseClient, body: any) {
  const tenantId = TENANT_ID;
  const companyId = body.companyId || body.company_id || null;
  const isCredit = !!body.is_credit;
  const total = Math.round(Number(body.total) || 0);

  const { data: purchase, error: purchaseError } = await supabase
    .from('Purchase')
    .insert({
      supplier_id: body.supplier_id,
      invoice_number: body.invoice_number,
      cai: body.cai || null,
      invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
      subtotal: Math.round(Number(body.subtotal) || 0),
      tax_rate: body.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(body.tax_amount) || 0),
      total,
      purchase_type: body.purchase_type || 'expense',
      expense_category: body.expense_category || null,
      document_url: body.document_url || null,
      is_credit: isCredit,
      due_date: isCredit ? body.due_date || null : null,
      status: isCredit ? 'PENDING' : 'PAID',
      amount_paid: isCredit ? 0 : total,
      balance_due: isCredit ? total : 0,
      tenant_id: tenantId,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (purchaseError) return { data: null, error: purchaseError };

  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length > 0) {
    const purchaseItems = items.map((item: any) => ({
      purchase_id: purchase.id,
      product_id: item.product_id || null,
      product_code: item.product_code || null,
      product_name: item.product_name || item.description || '',
      description: item.description || null,
      quantity: Number(item.quantity) || 0,
      unit_price: Math.round(Number(item.unit_price) || 0),
      discount_percentage: Number(item.discount_percentage) || 0,
      discount_amount: Math.round(Number(item.discount_amount) || 0),
      subtotal: Math.round(Number(item.subtotal) || 0),
      tax_rate: item.tax_rate ?? body.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(item.tax_amount) || 0),
      total: Math.round(Number(item.total) || 0),
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase.from('PurchaseItem').insert(purchaseItems);
    if (itemsError) {
      console.error('Error creating purchase items:', itemsError);
    }
  }

  // Create/update products in Supabase product table
  if (items.length > 0 && companyId) {
    for (const item of items) {
      const productName = item.product_name || item.description || '';
      if (!productName) continue;

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Math.round(Number(item.unit_price) || 0);

      const { data: existing } = await supabase
        .from('product')
        .select('id, current_stock')
        .eq('tenant_id', companyId)
        .ilike('name', productName)
        .maybeSingle();

      if (existing) {
        const newStock = (Number(existing.current_stock) || 0) + quantity;
        await supabase
          .from('product')
          .update({
            current_stock: newStock,
            stock_quantity: newStock,
            unit_price: unitPrice || undefined,
            current_cost: unitPrice,
          })
          .eq('id', existing.id);
      } else {
        const productCode = 'PRD-' + Date.now().toString(36).toUpperCase().slice(-4);
        await supabase
          .from('product')
          .insert({
            tenant_id: companyId,
            code: productCode,
            name: productName,
            description: item.description || '',
            category: body.purchase_type === 'expense' ? 'Servicios' : 'Insumos',
            unit: item.unit || 'Unidad',
            unit_price: unitPrice,
            current_cost: unitPrice,
            current_stock: quantity,
            stock_quantity: quantity,
            min_stock: 0,
            max_stock: 0,
            tax_rate: 15,
            is_active: true,
            is_service: body.purchase_type === 'expense',
            product_type: body.purchase_type === 'expense' ? 'service' : 'product',
            valuation_method: 'weighted_average',
          });
      }
    }
  }

  // Journal entry (best-effort, never blocks the purchase)
  const journalEntryResult = await createPurchaseJournalEntry(supabase, purchase, items, tenantId, companyId);
  if (journalEntryResult) {
    await supabase.from('Purchase').update({ journal_entry_id: journalEntryResult.id }).eq('id', purchase.id);
  }

  return { data: transformPurchase({ ...purchase, items, journal_entry_id: journalEntryResult?.id }), error: null };
}

export async function updatePurchase(supabase: SupabaseClient, id: string, body: any) {
  const updates: any = {};
  const scalarFields = [
    'supplier_id', 'invoice_number', 'cai', 'invoice_date', 'subtotal', 'tax_rate', 'tax_amount', 'total',
    'purchase_type', 'expense_category', 'document_url', 'is_credit', 'due_date',
  ];
  for (const field of scalarFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const isCredit = body.is_credit !== undefined ? !!body.is_credit : undefined;
  const total = updates.total !== undefined ? Math.round(Number(updates.total)) : undefined;

  if (updates.subtotal !== undefined) updates.subtotal = Math.round(Number(updates.subtotal));
  if (updates.tax_amount !== undefined) updates.tax_amount = Math.round(Number(updates.tax_amount));
  if (updates.is_credit !== undefined) updates.is_credit = isCredit;
  if (isCredit && !updates.due_date) updates.due_date = null;

  // Preserve company/tenant
  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase.from('Purchase').update(updates).eq('id', id);
  if (updateError) return { data: null, error: updateError };

  // Replace items
  if (Array.isArray(body.items)) {
    await supabase.from('PurchaseItem').delete().eq('purchase_id', id);

    const purchaseItems = body.items.map((item: any) => ({
      purchase_id: id,
      product_id: item.product_id || null,
      product_code: item.product_code || null,
      product_name: item.product_name || item.description || '',
      description: item.description || null,
      quantity: Number(item.quantity) || 0,
      unit_price: Math.round(Number(item.unit_price) || 0),
      discount_percentage: Number(item.discount_percentage) || 0,
      discount_amount: Math.round(Number(item.discount_amount) || 0),
      subtotal: Math.round(Number(item.subtotal) || 0),
      tax_rate: item.tax_rate ?? updates.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(item.tax_amount) || 0),
      total: Math.round(Number(item.total) || 0),
      tenant_id: TENANT_ID,
      created_at: new Date().toISOString(),
    }));

    if (purchaseItems.length > 0) {
      await supabase.from('PurchaseItem').insert(purchaseItems);
    }
  }

  // Recompute payment state
  await recomputePurchase(supabase, id, { isCredit, total });

  const { data, error } = await supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('id', id)
    .single();

  if (error) return { data: null, error };

  return { data: transformPurchase(data), error: null };
}

export async function deletePurchase(supabase: SupabaseClient, id: string) {
  await supabase.from('PurchaseItem').delete().eq('purchase_id', id);
  await supabase.from('SupplierPayment').delete().eq('purchase_id', id);
  const { error } = await supabase.from('Purchase').delete().eq('id', id);
  if (error) return { error };
  return { error: null };
}

export async function recomputePurchase(
  supabase: SupabaseClient,
  purchaseId: string,
  overrides?: { isCredit?: boolean; total?: number }
) {
  const { data: payments } = await supabase
    .from('SupplierPayment')
    .select('amount')
    .eq('purchase_id', purchaseId);

  const paymentsRows = payments || [];
  const hasPayments = paymentsRows.length > 0;
  const { data: purchase } = await supabase
    .from('Purchase')
    .select('total, is_credit, amount_paid')
    .eq('id', purchaseId)
    .single();
  if (!purchase) return null;

  const paid = hasPayments
    ? paymentsRows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(purchase.amount_paid) || 0;

  const total = overrides?.total ?? (Number(purchase.total) || 0);
  const isCredit = overrides?.isCredit ?? !!purchase.is_credit;
  const balance = Math.max(total - paid, 0);

  let status: string;
  if (balance <= 0) {
    status = 'PAID';
  } else if (paid > 0) {
    status = 'PARTIAL';
  } else if (isCredit) {
    status = 'PENDING';
  } else {
    status = 'PARTIAL';
  }

  await supabase
    .from('Purchase')
    .update({
      amount_paid: paid,
      balance_due: balance,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId);

  const { data: updated } = await supabase
    .from('Purchase')
    .select('*, Supplier:supplier_id(id, name, rtn, commercial_name, phone, email), items:PurchaseItem(*)')
    .eq('id', purchaseId)
    .single();

  return updated ? transformPurchase(updated) : null;
}

async function createPurchaseJournalEntry(
  supabase: SupabaseClient,
  purchase: any,
  items: any[],
  tenantId: string,
  companyId: string | null
) {
  try {
    let debitAccountId: string | undefined;

    if (purchase.purchase_type === 'merchandise') {
      const { data: invAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '1105')
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = invAccount?.id;
    } else if (purchase.expense_category === 'administrative') {
      const { data: expAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '4101')
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = expAccount?.id;
    } else {
      const { data: expAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '4100')
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = expAccount?.id;
    }

    const { data: isvAccount } = await supabase
      .from('Account')
      .select('id')
      .eq('code', '1110')
      .eq('tenant_id', tenantId)
      .single();

    let creditAccountId: string | undefined;
    if (purchase.is_credit) {
      const { data: apAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '2101')
        .eq('tenant_id', tenantId)
        .single();
      creditAccountId = apAccount?.id;
    } else {
      const { data: bankAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '1101')
        .eq('tenant_id', tenantId)
        .single();
      creditAccountId = bankAccount?.id;
    }

    if (!debitAccountId || !creditAccountId) {
      console.error('Missing accounts for journal entry');
      return null;
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from('JournalEntry')
      .insert({
        date: purchase.invoice_date,
        reference: `COMP-${purchase.invoice_number}`,
        description: `Compra ${purchase.is_credit ? 'a crédito' : 'al contado'} - Factura ${purchase.invoice_number}`,
        is_posted: true,
        total_debit: purchase.total,
        total_credit: purchase.total,
        tenant_id: tenantId,
        company_id: companyId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jeError) {
      console.error('Error creating journal entry:', jeError);
      return null;
    }

    const lines: any[] = [];
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: debitAccountId,
      description: `Compra ${purchase.purchase_type === 'merchandise' ? 'de mercadería' : 'de gasto'}`,
      debit_amount: purchase.subtotal,
      credit_amount: 0,
      tenant_id: tenantId,
    });

    if (Number(purchase.tax_amount) > 0 && isvAccount?.id) {
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: isvAccount.id,
        description: 'ISV Crédito Fiscal',
        debit_amount: purchase.tax_amount,
        credit_amount: 0,
        tenant_id: tenantId,
      });
    }

    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: creditAccountId,
      description: purchase.is_credit ? 'Cuentas por Pagar' : 'Banco',
      debit_amount: 0,
      credit_amount: purchase.total,
      tenant_id: tenantId,
    });

    const { error: linesError } = await supabase.from('JournalEntryLine').insert(lines);
    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
    }

    return journalEntry;
  } catch (error) {
    console.error('Error in createPurchaseJournalEntry:', error);
    return null;
  }
}
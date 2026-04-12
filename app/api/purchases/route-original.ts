import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET - List purchases
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const supplierId = searchParams.get('supplierId');
    const tenantId = '1';

    let query = supabase
      .from('Purchase')
      .select(`
        *,
        Supplier:supplier_id(id, name, rtn)
      `)
      .eq('tenant_id', tenantId)
      .order('invoice_date', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new purchase
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplier_id,
      invoice_number,
      cai,
      invoice_date,
      items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      purchase_type,
      expense_category,
      document_url,
      is_credit,
      due_date,
      notes,
      companyId,
    } = body;

    const tenantId = '1';

    // Validate CAI format (37 characters for SAR Honduras)
    if (cai && cai.length !== 37) {
      return NextResponse.json(
        { error: 'El CAI debe tener exactamente 37 caracteres' },
        { status: 400 }
      );
    }

    // Start transaction
    const { data: purchase, error: purchaseError } = await supabase
      .from('Purchase')
      .insert({
        supplier_id,
        invoice_number,
        cai: cai || null,
        invoice_date,
        subtotal,
        tax_rate: tax_rate || 15.00,
        tax_amount,
        total,
        purchase_type: purchase_type || 'expense',
        expense_category: expense_category || null,
        document_url: document_url || null,
        is_credit: is_credit || false,
        due_date: is_credit ? due_date : null,
        status: is_credit ? 'PENDING' : 'PAID',
        amount_paid: is_credit ? 0 : total,
        balance_due: is_credit ? total : 0,
        tenant_id: tenantId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Supabase error creating purchase:', purchaseError);
      return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
    }

    // Insert purchase items
    if (items && items.length > 0) {
      const purchaseItems = items.map((item: any) => ({
        purchase_id: purchase.id,
        product_id: item.product_id || null,
        product_code: item.product_code || null,
        product_name: item.product_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_amount || 0,
        subtotal: item.subtotal,
        tax_rate: item.tax_rate || tax_rate || 15.00,
        tax_amount: item.tax_amount || 0,
        total: item.total,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from('PurchaseItem')
        .insert(purchaseItems);

      if (itemsError) {
        console.error('Error creating purchase items:', itemsError);
        // Don't fail the whole request, just log the error
      }

      // Update inventory stock if purchase is merchandise
      if (purchase_type === 'merchandise') {
        for (const item of items) {
          if (item.product_id) {
            // Increase stock
            await supabase.rpc('increase_product_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
              p_tenant_id: tenantId,
            });

            // Create inventory movement
            await supabase.from('InventoryMovement').insert({
              product_id: item.product_id,
              movement_type: 'IN_PURCHASE',
              quantity: item.quantity,
              unit_cost: item.unit_price,
              reference_type: 'PURCHASE',
              reference_id: purchase.id,
              notes: `Compra factura ${invoice_number}`,
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Create journal entry for accounting impact
    const journalEntryResult = await createPurchaseJournalEntry(
      purchase,
      items,
      tenantId,
      companyId
    );

    if (journalEntryResult) {
      // Update purchase with journal entry reference
      await supabase
        .from('Purchase')
        .update({ journal_entry_id: journalEntryResult.id })
        .eq('id', purchase.id);
    }

    return NextResponse.json({ ...purchase, journal_entry_id: journalEntryResult?.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update purchase
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('Purchase')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete purchase
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    // First delete purchase items
    await supabase.from('PurchaseItem').delete().eq('purchase_id', id);

    // Then delete the purchase
    const { error } = await supabase.from('Purchase').delete().eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to delete purchase' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create journal entry for purchase
async function createPurchaseJournalEntry(
  purchase: any,
  items: any[],
  tenantId: string,
  companyId: string
) {
  try {
    // Determine accounts based on purchase type
    let debitAccountId: string;
    
    if (purchase.purchase_type === 'merchandise') {
      // Inventory/Stock account
      const { data: invAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '1105') // Inventory account code
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = invAccount?.id;
    } else if (purchase.expense_category === 'administrative') {
      // Administrative expenses
      const { data: expAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '4101') // Admin expenses
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = expAccount?.id;
    } else {
      // General expenses
      const { data: expAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '4100') // General expenses
        .eq('tenant_id', tenantId)
        .single();
      debitAccountId = expAccount?.id;
    }

    // Credit Fiscal account (ISV)
    const { data: isvAccount } = await supabase
      .from('Account')
      .select('id')
      .eq('code', '1110') // ISV Credito Fiscal
      .eq('tenant_id', tenantId)
      .single();

    // Accounts Payable or Bank account
    let creditAccountId: string;
    if (purchase.is_credit) {
      const { data: apAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '2101') // Cuentas por Pagar
        .eq('tenant_id', tenantId)
        .single();
      creditAccountId = apAccount?.id;
    } else {
      const { data: bankAccount } = await supabase
        .from('Account')
        .select('id')
        .eq('code', '1101') // Bancos
        .eq('tenant_id', tenantId)
        .single();
      creditAccountId = bankAccount?.id;
    }

    if (!debitAccountId || !creditAccountId) {
      console.error('Missing accounts for journal entry');
      return null;
    }

    // Create journal entry
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

    // Create journal entry lines
    const lines = [];

    // 1. Debit: Inventory or Expense
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: debitAccountId,
      description: `Compra ${purchase.purchase_type === 'merchandise' ? 'de mercadería' : 'de gasto'}`,
      debit_amount: purchase.subtotal,
      credit_amount: 0,
      tenant_id: tenantId,
    });

    // 2. Debit: ISV Credito Fiscal
    if (purchase.tax_amount > 0 && isvAccount?.id) {
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: isvAccount.id,
        description: 'ISV Crédito Fiscal',
        debit_amount: purchase.tax_amount,
        credit_amount: 0,
        tenant_id: tenantId,
      });
    }

    // 3. Credit: Accounts Payable or Bank
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: creditAccountId,
      description: purchase.is_credit ? 'Cuentas por Pagar' : 'Banco',
      debit_amount: 0,
      credit_amount: purchase.total,
      tenant_id: tenantId,
    });

    const { error: linesError } = await supabase
      .from('JournalEntryLine')
      .insert(lines);

    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
    }

    return journalEntry;
  } catch (error) {
    console.error('Error in createPurchaseJournalEntry:', error);
    return null;
  }
}

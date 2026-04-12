import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET - List purchase orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const tenantId = '1';

    let query = supabase
      .from('PurchaseOrder')
      .select(`
        *,
        Supplier:supplier_id(id, name, rtn),
        PurchaseOrderItem:PurchaseOrderItem(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new purchase order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_number,
      supplier_id,
      order_date,
      expected_date,
      subtotal,
      tax_amount,
      total,
      notes,
      items,
      companyId,
    } = body;

    const tenantId = '1';

    // Create purchase order
    const { data: order, error: orderError } = await supabase
      .from('PurchaseOrder')
      .insert({
        order_number,
        supplier_id,
        order_date,
        expected_date: expected_date || null,
        subtotal,
        tax_amount,
        total,
        notes: notes || null,
        status: 'DRAFT',
        tenant_id: tenantId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating purchase order:', orderError);
      return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
    }

    // Insert purchase order items
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        purchase_order_id: order.id,
        product_id: item.product_id || null,
        product_code: item.product_code || null,
        product_name: item.product_name,
        quantity_requested: item.quantity_requested,
        quantity_received: 0,
        unit_price: item.unit_price,
        total: item.total,
        notes: item.notes || null,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from('PurchaseOrderItem')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update purchase order
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('PurchaseOrder')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete purchase order
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // First delete order items
    await supabase.from('PurchaseOrderItem').delete().eq('purchase_order_id', id);

    // Then delete the order
    const { error } = await supabase.from('PurchaseOrder').delete().eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

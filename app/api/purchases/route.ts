import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Purchase {
  id: string;
  [key: string]: any;
  created_at?: string;
  updated_at?: string;
}

const loadPurchases = (): Purchase[] => {
  try {
    if (require('fs').existsSync(DATA_FILE)) {
      const data = readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading purchases data:', error);
    return [];
  }
};

const savePurchases = (data: Purchase[]) => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving purchases data:', error);
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search') || '';
    
    let purchases = loadPurchases();
    
    if (companyId) {
      purchases = purchases.filter(p => p.companyId === companyId);
    }
    
    if (search) {
      purchases = purchases.filter(p => 
        p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier_name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return NextResponse.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const purchases = loadPurchases();
    const newPurchase: Purchase = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    purchases.push(newPurchase);
    savePurchases(purchases);

    // Create/update products in Supabase product table
    if (body.items && Array.isArray(body.items) && body.companyId) {
      const tenantId = body.companyId;
      
      for (const item of body.items) {
        const productName = item.product_name || item.description || '';
        if (!productName) continue;

        const quantity = Number(item.quantity) || 0;
        const unitPrice = Math.round(Number(item.unit_price) || 0);

        // Check if product already exists for this tenant (lowercase table)
        const { data: existing } = await supabase
          .from('product')
          .select('id, current_stock')
          .eq('tenant_id', tenantId)
          .ilike('name', productName)
          .maybeSingle();

        if (existing) {
          // Update stock and price
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
          // Create new product
          const productCode = 'PRD-' + Date.now().toString(36).toUpperCase().slice(-4);
          await supabase
            .from('product')
            .insert({
              tenant_id: tenantId,
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
    
    return NextResponse.json(newPurchase, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    console.log('PUT request - ID from query:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const purchases = loadPurchases();
    console.log('Available purchases IDs:', purchases.map(p => ({ id: p.id, invoice: p.invoice_number })));
    
    console.log('Looking for ID:', JSON.stringify(id));
    console.log('Available IDs:', purchases.map(p => JSON.stringify(p.id)));
    
    const index = purchases.findIndex(p => p.id === id);
    console.log('Found index for ID', id, ':', index);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    purchases[index] = {
      ...purchases[index],
      ...body,
      updated_at: new Date().toISOString(),
    };

    savePurchases(purchases);
    console.log('Purchase updated successfully');

    return NextResponse.json(purchases[index]);
  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('DELETE request - ID from query:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const purchases = loadPurchases();
    console.log('Available purchases IDs:', purchases.map(p => ({ id: p.id, invoice: p.invoice_number })));
    
    console.log('Looking for ID:', JSON.stringify(id));
    console.log('Available IDs:', purchases.map(p => JSON.stringify(p.id)));
    
    const index = purchases.findIndex(p => p.id === id);
    console.log('Found index for ID', id, ':', index);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    purchases.splice(index, 1);
    savePurchases(purchases);
    
    console.log('Total purchases after deletion:', purchases.length);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

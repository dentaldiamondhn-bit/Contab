import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');

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

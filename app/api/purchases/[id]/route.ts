import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');

console.log('=== PURCHASES [ID] ROUTE LOADED ===');

// Type definition for Purchase objects
interface Purchase {
  id: string;
  [key: string]: any;
  updated_at?: string;
}

// Función para cargar datos del archivo en cada petición
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

// Función para guardar datos en archivo
const savePurchases = (data: Purchase[]) => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving purchases data:', error);
  }
};

// PUT - Update purchase
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    console.log('Updating purchase - ID from params:', id);
    
    const purchases = loadPurchases();
    console.log('Available purchases IDs:', purchases.map(p => ({ id: p.id, invoice: p.invoice_number })));
    
    // Debug exact comparison
    console.log('Looking for ID:', JSON.stringify(id));
    console.log('Available IDs:', purchases.map(p => JSON.stringify(p.id)));
    
    const index = purchases.findIndex(p => p.id === id);
    console.log('Found index for ID', id, ':', index);
    
    // Try manual comparison
    for (let i = 0; i < purchases.length; i++) {
      console.log(`Comparison ${i}: "${purchases[i].id}" === "${id}" = ${purchases[i].id === id}`);
    }
    
    if (index === -1) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Update purchase
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

// DELETE - Delete purchase
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    console.log('Deleting purchase - ID from params:', id);
    
    const purchases = loadPurchases();
    console.log('Available purchases IDs:', purchases.map(p => ({ id: p.id, invoice: p.invoice_number })));
    
    // Debug exact comparison
    console.log('Looking for ID:', JSON.stringify(id));
    console.log('Available IDs:', purchases.map(p => JSON.stringify(p.id)));
    
    const index = purchases.findIndex(p => p.id === id);
    console.log('Found index for ID', id, ':', index);
    
    // Try manual comparison
    for (let i = 0; i < purchases.length; i++) {
      console.log(`Comparison ${i}: "${purchases[i].id}" === "${id}" = ${purchases[i].id === id}`);
    }
    
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

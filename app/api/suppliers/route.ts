import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'suppliers-data.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');

    const data = readFileSync(DATA_FILE, 'utf8');
    let suppliers = JSON.parse(data);
    
    console.log('SIMPLE ROUTE - Total suppliers:', suppliers.length);

    let filtered = suppliers;
    
    if (companyId) {
      filtered = filtered.filter((s: any) => s.company_id === companyId || s.companyId === companyId);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((s: any) =>
        s.name.toLowerCase().includes(term) ||
        s.rtn.toLowerCase().includes(term) ||
        s.commercial_name?.toLowerCase().includes(term)
      );
    }

    console.log('SIMPLE ROUTE - Filtered suppliers:', filtered.length);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('SIMPLE ROUTE - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('SIMPLE ROUTE - Creating supplier:', body);
    
    const data = readFileSync(DATA_FILE, 'utf8');
    let suppliers = JSON.parse(data);
    
    const newSupplier = {
      id: Math.random().toString(36).substring(2, 9),
      ...body,
      created_at: new Date().toISOString(),
    };

    suppliers.push(newSupplier);
    writeFileSync(DATA_FILE, JSON.stringify(suppliers, null, 2), 'utf8');
    
    console.log('SIMPLE ROUTE - Total suppliers after creation:', suppliers.length);

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error('SIMPLE ROUTE - Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('SIMPLE ROUTE - Deleting supplier:', id);
    
    const data = readFileSync(DATA_FILE, 'utf8');
    let suppliers = JSON.parse(data);
    
    const index = suppliers.findIndex((s: any) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    suppliers.splice(index, 1);
    writeFileSync(DATA_FILE, JSON.stringify(suppliers, null, 2), 'utf8');
    
    console.log('SIMPLE ROUTE - Total suppliers after deletion:', suppliers.length);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SIMPLE ROUTE - Error deleting supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

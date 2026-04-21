import { NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// MOCK DATA - Temporal hasta que configures Supabase
// Usar archivo para persistencia real entre llamadas
const DATA_FILE = join(process.cwd(), 'suppliers-data.json');

let mockSuppliers: any[] = [];

// Cargar datos desde archivo si existe
try {
  if (require('fs').existsSync(DATA_FILE)) {
    const data = readFileSync(DATA_FILE, 'utf8');
    mockSuppliers = JSON.parse(data);
  } else {
    // Datos iniciales
    mockSuppliers = [
      {
        id: '1',
        rtn: '08011985123456',
        name: 'Distribuidora El Progreso S.A.',
        commercial_name: 'DIPROSA',
        email: 'ventas@diprosa.com',
        phone: '2550-1234',
        mobile: '9999-8888',
        address: 'Barrio El Centro, 3ra Ave',
        city: 'San Pedro Sula',
        supplier_type: 'merchandise',
        category: 'Abarrotes',
        payment_terms: 30,
        payment_method: 'transfer',
        is_active: true,
        is_preferred: true,
        tenant_id: '1',
        company_id: '1',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        rtn: '05021990234567',
        name: 'Papelería Honduras',
        commercial_name: 'PAPELHND',
        email: 'info@papelhnd.com',
        phone: '2234-5678',
        mobile: '8888-7777',
        address: 'Colonia Palmira, Calle Principal',
        city: 'Tegucigalpa',
        supplier_type: 'merchandise',
        category: 'Papelería',
        payment_terms: 15,
        payment_method: 'cash',
        is_active: true,
        is_preferred: false,
        tenant_id: '1',
        company_id: '1',
        created_at: '2024-02-20T14:30:00Z',
      },
      {
        id: '3',
        rtn: '01012000111111',
        name: 'Servicios Eléctricos S de RL',
        commercial_name: 'SESEL',
        email: 'contacto@sesel.hn',
        phone: '2550-9999',
        supplier_type: 'services',
        category: 'Mantenimiento',
        payment_terms: 15,
        payment_method: 'check',
        is_active: true,
        is_preferred: false,
        tenant_id: '1',
        company_id: '1',
        created_at: '2024-03-10T09:00:00Z',
      },
    ];
  }
} catch (error) {
  console.error('Error loading suppliers data:', error);
}

// Función para guardar datos en archivo
const saveSuppliers = (data: any[]) => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving suppliers data:', error);
  }
};

// GET - List suppliers (MOCK)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');

    // Recargar datos del archivo en cada petición
    let currentSuppliers: any[] = [];
    try {
      console.log('Checking if file exists:', DATA_FILE);
      console.log('File exists:', require('fs').existsSync(DATA_FILE));
      
      if (require('fs').existsSync(DATA_FILE)) {
        const data = require('fs').readFileSync(DATA_FILE, 'utf8');
        console.log('Raw file data:', data);
        currentSuppliers = JSON.parse(data);
        console.log('Parsed suppliers count:', currentSuppliers.length);
      } else {
        console.log('File does not exist, using mock data');
        currentSuppliers = mockSuppliers;
      }
    } catch (error) {
      console.error('Error reloading suppliers data:', error);
      currentSuppliers = mockSuppliers;
    }

    console.log('GET suppliers - companyId:', companyId, 'search:', search);
    console.log('Total currentSuppliers:', currentSuppliers?.length || 0);

    let filtered = currentSuppliers || [];

    if (companyId) {
      filtered = filtered.filter(s => s.company_id === companyId);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.rtn.toLowerCase().includes(term) ||
        s.commercial_name?.toLowerCase().includes(term)
      );
    }

    console.log('Filtered suppliers count:', filtered.length);

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error in mock API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create supplier (MOCK)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating supplier:', body);
    
    const newSupplier = {
      id: Math.random().toString(36).substring(2, 9),
      ...body,
      created_at: new Date().toISOString(),
    };

    mockSuppliers.push(newSupplier);
    saveSuppliers(mockSuppliers);
    console.log('Total suppliers after creation:', mockSuppliers.length);

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update supplier (MOCK)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const index = (global as any).mockSuppliers?.findIndex((s: any) => s.id === id) ?? -1;
    if (index === -1) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    mockSuppliers[index] = { ...mockSuppliers[index], ...updates };
    saveSuppliers(mockSuppliers);

    return NextResponse.json(mockSuppliers[index]);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete supplier (MOCK)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const index = (global as any).mockSuppliers?.findIndex((s: any) => s.id === id) ?? -1;
    if (index === -1) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    mockSuppliers.splice(index, 1);
    saveSuppliers(mockSuppliers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');

interface Purchase {
  id: string;
  [key: string]: any;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  total?: number;
  amount_paid?: number;
  balance_due?: number;
  status?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_rtn?: string;
  is_credit?: boolean;
  company_id?: string;
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    const purchases = loadPurchases();
    
    // Filter credit purchases with balance due
    let payables = purchases.filter(p => 
      p.is_credit === true && 
      ['pending', 'partial'].includes(p.status?.toLowerCase() || '')
    );
    
    // Filter by company
    if (companyId) {
      payables = payables.filter(p => p.companyId === companyId);
    }
    
    // Sort by due date
    payables.sort((a, b) => {
      const dateA = new Date(a.due_date || '9999-12-31');
      const dateB = new Date(b.due_date || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });
    
    // Transform data to match the expected format
    const transformedPayables = payables.map((purchase: Purchase) => {
      const total = purchase.total || 0;
      const amountPaid = purchase.amount_paid || 0;
      const balanceDue = purchase.balance_due || (total - amountPaid);
      
      return {
        purchase_id: purchase.id,
        invoice_number: purchase.invoice_number || '',
        invoice_date: purchase.invoice_date || '',
        due_date: purchase.due_date || purchase.invoice_date || '',
        total: total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        status: purchase.status || 'pending',
        supplier_id: purchase.supplier_id || '',
        supplier_name: purchase.supplier_name || 'Desconocido',
        supplier_rtn: purchase.supplier_rtn || '',
      };
    });
    
    return NextResponse.json(transformedPayables);
  } catch (error) {
    console.error('Error fetching accounts payable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

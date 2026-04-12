import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PAYMENTS_FILE = join(process.cwd(), 'supplier-payments.json');
const PURCHASES_FILE = join(process.cwd(), 'purchases-data.json');

interface Payment {
  id: string;
  supplier_id: string;
  purchase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  companyId?: string;
  created_at: string;
}

interface Purchase {
  id: string;
  [key: string]: any;
  amount_paid?: number;
  balance_due?: number;
  total?: number;
  status?: string;
  supplier_name?: string;
}

const loadPayments = (): Payment[] => {
  try {
    if (require('fs').existsSync(PAYMENTS_FILE)) {
      const data = readFileSync(PAYMENTS_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading payments data:', error);
    return [];
  }
};

const savePayments = (data: Payment[]) => {
  try {
    writeFileSync(PAYMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving payments data:', error);
  }
};

const loadPurchases = (): Purchase[] => {
  try {
    if (require('fs').existsSync(PURCHASES_FILE)) {
      const data = readFileSync(PURCHASES_FILE, 'utf8');
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
    writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving purchases data:', error);
  }
};

// GET - List supplier payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const supplierId = searchParams.get('supplierId');
    
    let payments = loadPayments();
    
    // Filter by company
    if (companyId) {
      payments = payments.filter(p => p.companyId === companyId);
    }
    
    // Filter by supplier
    if (supplierId) {
      payments = payments.filter(p => p.supplier_id === supplierId);
    }
    
    // Sort by payment date
    payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new payment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplier_id,
      purchase_id,
      payment_date,
      amount,
      payment_method,
      reference_number,
      companyId,
    } = body;

    if (!supplier_id || !purchase_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Datos de pago incompletos' },
        { status: 400 }
      );
    }

    // Create the payment record
    const payments = loadPayments();
    const newPayment: Payment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      supplier_id,
      purchase_id,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount,
      payment_method: payment_method || 'transfer',
      reference_number: reference_number || null,
      companyId,
      created_at: new Date().toISOString(),
    };

    payments.push(newPayment);
    savePayments(payments);

    // Update the purchase with new amounts
    const purchases = loadPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchase_id);
    
    if (purchaseIndex !== -1) {
      const purchase = purchases[purchaseIndex];
      const newAmountPaid = (purchase.amount_paid || 0) + amount;
      const newBalanceDue = Math.max(0, (purchase.balance_due || purchase.total || 0) - amount);
      
      // Determine new status
      let newStatus = purchase.status || 'pending';
      if (newBalanceDue <= 0) {
        newStatus = 'completed';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      purchases[purchaseIndex] = {
        ...purchase,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      savePurchases(purchases);
    }

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

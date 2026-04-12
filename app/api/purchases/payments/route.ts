import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');
const PAYMENTS_FILE = join(process.cwd(), 'purchase-payments.json');

interface Purchase {
  id: string;
  [key: string]: any;
  amount_paid?: number;
  balance_due?: number;
  is_credit?: boolean;
  due_date?: string;
  status?: string;
}

interface Payment {
  id: string;
  purchase_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
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

const savePurchases = (data: Purchase[]) => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving purchases data:', error);
  }
};

const savePayments = (data: Payment[]) => {
  try {
    writeFileSync(PAYMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving payments data:', error);
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchaseId');
    const companyId = searchParams.get('companyId');
    
    const payments = loadPayments();
    
    if (purchaseId) {
      const purchasePayments = payments.filter(p => p.purchase_id === purchaseId);
      return NextResponse.json(purchasePayments);
    }
    
    if (companyId) {
      const purchases = loadPurchases();
      const companyPurchases = purchases.filter(p => p.companyId === companyId);
      const companyPurchaseIds = companyPurchases.map(p => p.id);
      const companyPayments = payments.filter(p => companyPurchaseIds.includes(p.purchase_id));
      return NextResponse.json(companyPayments);
    }
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchase_id, amount, payment_method, reference, notes } = body;
    
    if (!purchase_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const purchases = loadPurchases();
    const purchase = purchases.find(p => p.id === purchase_id);
    
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    
    const payments = loadPayments();
    const newPayment: Payment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      purchase_id,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method,
      reference: reference || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    
    payments.push(newPayment);
    savePayments(payments);
    
    // Update purchase payment status
    const currentPaid = purchase.amount_paid || 0;
    const newTotalPaid = currentPaid + amount;
    const balance = (purchase.total || 0) - newTotalPaid;
    
    purchase.amount_paid = newTotalPaid;
    purchase.balance_due = balance;
    purchase.status = balance <= 0 ? 'completed' : 'partial';
    
    savePurchases(purchases);
    
    return NextResponse.json({
      payment: newPayment,
      updatedPurchase: purchase
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const body = await request.json();
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    const payments = loadPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Update payment
    payments[paymentIndex] = {
      ...payments[paymentIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    savePayments(payments);
    
    return NextResponse.json(payments[paymentIndex]);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    const payments = loadPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    const deletedPayment = payments[paymentIndex];
    payments.splice(paymentIndex, 1);
    savePayments(payments);
    
    // Recalculate purchase payment status
    const purchases = loadPurchases();
    const purchase = purchases.find(p => p.id === deletedPayment.purchase_id);
    
    if (purchase) {
      const remainingPayments = payments.filter(p => p.purchase_id === deletedPayment.purchase_id);
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = (purchase.total || 0) - totalPaid;
      
      purchase.amount_paid = totalPaid;
      purchase.balance_due = balance;
      purchase.status = balance <= 0 ? 'completed' : balance < (purchase.total || 0) ? 'partial' : 'pending';
      
      savePurchases(purchases);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

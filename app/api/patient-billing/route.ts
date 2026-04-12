import { NextResponse } from 'next/server';
import { createPatientBill, previewPatientBillTax } from '@/lib/actions/patient-billing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'preview') {
      // Preview tax calculation without creating transaction
      const result = await previewPatientBillTax(data.subtotal, data.description);
      
      if (result.success) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    } else {
      // Create the actual patient bill transaction
      const result = await createPatientBill(data);
      
      if (result.success) {
        return NextResponse.json(result, { status: 201 });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Error in patient billing API:', error);
    return NextResponse.json(
      { error: 'Failed to process patient billing request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { AutomatedTaxService } = await import('@/lib/services/automated-tax');
    
    // Get available accounts for patient billing
    const [revenueAccounts, receivableAccounts] = await Promise.all([
      AutomatedTaxService.getRevenueAccounts(),
      AutomatedTaxService.getReceivableAccounts()
    ]);

    return NextResponse.json({
      revenueAccounts,
      receivableAccounts
    });
  } catch (error) {
    console.error('Error fetching patient billing accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

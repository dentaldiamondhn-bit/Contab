import { NextResponse } from 'next/server';
import { ISVService } from '@/lib/services/isv-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      transactionData,
      isvDetails,
      mainAccountId,
      salesAccountId
    } = body;

    // Validate required fields
    if (!transactionData?.date || !transactionData?.description || !transactionData?.voucherType) {
      return NextResponse.json({ 
        error: 'Missing required transaction fields: date, description, voucherType' 
      }, { status: 400 });
    }

    if (!isvDetails?.amount || !mainAccountId) {
      return NextResponse.json({ 
        error: 'Missing required fields: isvDetails.amount, mainAccountId' 
      }, { status: 400 });
    }

    const result = await ISVService.createISVTransaction(
      {
        date: new Date(transactionData.date),
        description: transactionData.description,
        voucherType: transactionData.voucherType,
        customerInfo: transactionData.customerInfo
      },
      isvDetails,
      mainAccountId,
      salesAccountId
    );

    return NextResponse.json({
      success: true,
      message: 'ISV transaction created successfully',
      transaction: result.transaction,
      calculation: result.calculation,
      journalEntries: result.journalEntries
    });

  } catch (error) {
    console.error('Error creating ISV transaction:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ISV liability account not found')) {
        return NextResponse.json({ 
          error: 'ISV liability accounts not configured. Please contact administrator.' 
        }, { status: 400 });
      }
      
      if (error.message.includes('Failed to create ISV accounts')) {
        return NextResponse.json({ 
          error: 'Failed to create ISV liability accounts. Please check account permissions.' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to create ISV transaction' 
    }, { status: 500 });
  }
}

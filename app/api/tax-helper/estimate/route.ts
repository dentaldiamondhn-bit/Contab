import { NextResponse } from 'next/server';
import { TaxHelper } from '@/lib/services/tax-helper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Estimate tax for preview
    const result = await TaxHelper.estimateTax(amount, description);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error estimating tax:', error);
    return NextResponse.json(
      { error: 'Failed to estimate tax' },
      { status: 500 }
    );
  }
}

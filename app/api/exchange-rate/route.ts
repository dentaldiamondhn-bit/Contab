import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from') || 'HNL';
    const toCurrency = searchParams.get('to') || 'USD';
    const date = searchParams.get('date');

    // If same currency, rate is 1
    if (fromCurrency === toCurrency) {
      return NextResponse.json({ rate: 1.0 });
    }

    // Default rates (HNL to USD is approximately 24.5:1 as of 2024)
    const defaultRates: { [key: string]: number } = {
      'HNL-USD': 0.0408, // 1 HNL = 0.0408 USD
      'USD-HNL': 24.5,   // 1 USD = 24.5 HNL
    };

    const key = `${fromCurrency}-${toCurrency}`;
    const inverseKey = `${toCurrency}-${fromCurrency}`;
    
    let rate = 1.0;
    
    if (defaultRates[key]) {
      rate = defaultRates[key];
    } else if (defaultRates[inverseKey]) {
      rate = 1 / defaultRates[inverseKey];
    }

    return NextResponse.json({ rate });
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to get exchange rate' },
      { status: 500 }
    );
  }
}

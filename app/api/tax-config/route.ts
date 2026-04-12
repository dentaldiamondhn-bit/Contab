import { NextResponse } from 'next/server';
import { TaxConfigService } from '@/lib/services/tax-config';

export async function GET() {
  try {
    const taxConfigs = await TaxConfigService.getAllTaxConfigs();
    return NextResponse.json(taxConfigs);
  } catch (error) {
    console.error('Error fetching tax configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, rate, accountId, isActive = true } = body;

    if (!name || rate === undefined || !accountId) {
      return NextResponse.json(
        { error: 'Name, rate, and accountId are required' },
        { status: 400 }
      );
    }

    if (rate < 0 || rate > 1) {
      return NextResponse.json(
        { error: 'Rate must be between 0 and 1' },
        { status: 400 }
      );
    }

    const taxConfig = await TaxConfigService.createTaxConfig({
      name,
      rate,
      accountId,
      isActive
    });

    return NextResponse.json(taxConfig, { status: 201 });
  } catch (error) {
    console.error('Error creating tax configuration:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create tax configuration' },
      { status: 500 }
    );
  }
}

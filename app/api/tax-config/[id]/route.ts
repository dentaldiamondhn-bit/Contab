import { NextResponse } from 'next/server';
import { TaxConfigService } from '@/lib/services/tax-config';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taxConfig = await TaxConfigService.getTaxConfigById(id);
    
    if (!taxConfig) {
      return NextResponse.json(
        { error: 'Tax configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(taxConfig);
  } catch (error) {
    console.error('Error fetching tax configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, rate, accountId, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) {
      if (rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: 'Rate must be between 0 and 1' },
          { status: 400 }
        );
      }
      updateData.rate = rate;
    }
    if (accountId !== undefined) updateData.accountId = accountId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const { id } = await params;
    const taxConfig = await TaxConfigService.updateTaxConfig(id, updateData);
    return NextResponse.json(taxConfig);
  } catch (error) {
    console.error('Error updating tax configuration:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update tax configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await TaxConfigService.deleteTaxConfig(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax configuration' },
      { status: 500 }
    );
  }
}

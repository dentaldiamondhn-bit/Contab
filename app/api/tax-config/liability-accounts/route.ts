import { NextResponse } from 'next/server';
import { TaxConfigService } from '@/lib/services/tax-config';

export async function GET() {
  try {
    const liabilityAccounts = await TaxConfigService.getLiabilityAccounts();
    return NextResponse.json(liabilityAccounts);
  } catch (error) {
    console.error('Error fetching liability accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liability accounts' },
      { status: 500 }
    );
  }
}

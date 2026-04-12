import { NextResponse } from 'next/server';
import { seedBanksAndAccounts, createBankAccount, getBankAccounts } from '@/lib/seeds/bank-accounts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, bankName, currency } = body;

    switch (action) {
      case 'seed':
        const seedResult = await seedBanksAndAccounts();
        return NextResponse.json(seedResult);
      
      case 'create':
        if (!bankName) {
          return NextResponse.json(
            { error: 'Bank name is required' },
            { status: 400 }
          );
        }
        const createResult = await createBankAccount(bankName, currency);
        return NextResponse.json(createResult);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in bank accounts API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await getBankAccounts();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

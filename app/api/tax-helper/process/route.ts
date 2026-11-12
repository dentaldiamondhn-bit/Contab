import { NextResponse } from 'next/server';
import { TaxHelper } from '@/lib/services/tax-helper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries, description } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Entries array is required' },
        { status: 400 }
      );
    }

    // Process taxable entries and add tax entries automatically
    const result = await TaxHelper.processTaxableEntries(entries, description);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing taxable entries:', error);
    return NextResponse.json(
      { error: 'Failed to process taxable entries' },
      { status: 500 }
    );
  }
}

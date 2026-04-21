import { NextResponse } from 'next/server';
import { performYearEndClosing } from '@/app/services/closing';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, equityAccountId, closedBy } = body;

    if (!year || !equityAccountId || !closedBy) {
      return NextResponse.json({ 
        error: 'Missing required fields: year, equityAccountId, closedBy' 
      }, { status: 400 });
    }

    // Validate year is reasonable
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1) {
      return NextResponse.json({ 
        error: 'Invalid year provided' 
      }, { status: 400 });
    }

    // Perform the year-end closing
    const closingTransaction = await performYearEndClosing(year, equityAccountId, closedBy);

    return NextResponse.json({
      success: true,
      message: `Year-end closing for ${year} completed successfully`,
      closingTransaction
    });

  } catch (error) {
    console.error('Error performing year-end closing:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Period was closed')) {
        return NextResponse.json({ 
          error: 'Cannot close books: period is already locked' 
        }, { status: 403 });
      }
      
      if (error.message.includes('already been performed')) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 409 }); // Conflict
      }
      
      if (error.message.includes('P&L validation failed')) {
        return NextResponse.json({ 
          error: error.message,
          type: 'VALIDATION_ERROR'
        }, { status: 400 });
      }
      
      if (error.message.includes('Internal validation error')) {
        return NextResponse.json({ 
          error: 'Internal validation error. Please contact support.',
          type: 'INTERNAL_ERROR'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to perform year-end closing' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    // Check if the year is already closed
    const closingRecord = await (db as any).bookClosing?.findFirst({
      where: {
        period: year,
        periodType: 'YEARLY'
      }
    });

    const globalSettings = await (db as any).globalSettings?.findFirst();
    const lastClosedDate = globalSettings?.lastClosedDate;

    return NextResponse.json({
      year,
      isClosed: !!closingRecord,
      closedAt: closingRecord?.closedAt,
      closedBy: closingRecord?.closedBy,
      lastClosedDate
    });

  } catch (error) {
    console.error('Error checking closing status:', error);
    return NextResponse.json({ error: 'Failed to check closing status' }, { status: 500 });
  }
}

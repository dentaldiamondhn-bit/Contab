import { NextResponse } from 'next/server';
import { ISVService } from '@/lib/services/isv-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'startDate and endDate parameters are required' 
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format. Use YYYY-MM-DD format.' 
      }, { status: 400 });
    }

    const summary = await ISVService.getISVSummary(start, end);

    return NextResponse.json({
      success: true,
      period: {
        startDate,
        endDate
      },
      summary: {
        ...summary,
        formattedAmounts: {
          standardISV: `L. ${summary.standardISV.toFixed(2)}`,
          specialISV: `L. ${summary.specialISV.toFixed(2)}`,
          totalISV: `L. ${summary.totalISV.toFixed(2)}`
        }
      }
    });

  } catch (error) {
    console.error('Error getting ISV summary:', error);
    return NextResponse.json({ 
      error: 'Failed to get ISV summary' 
    }, { status: 500 });
  }
}

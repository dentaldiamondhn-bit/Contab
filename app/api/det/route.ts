import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePeriods, getDETExportStatistics } from '@/lib/services/det-live-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    
    const availablePeriods = await getAvailablePeriods();
    let statistics = null;
    
    if (period) {
      statistics = await getDETExportStatistics(period);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        availablePeriods,
        statistics
      }
    });
  } catch (error) {
    console.error('Error in DET API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch DET data',
      data: {
        availablePeriods: [],
        statistics: null
      }
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getUnreadAlerts, getCAIStatistics } from '@/lib/services/cai-service';

export async function GET(request: NextRequest) {
  try {
    const [alerts, statistics] = await Promise.all([
      getUnreadAlerts(),
      getCAIStatistics(),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        alerts,
        statistics
      }
    });
  } catch (error) {
    console.error('Error in CAI alerts API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch CAI alerts data',
      data: {
        alerts: [],
        statistics: null
      }
    }, { status: 500 });
  }
}

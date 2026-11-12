import { NextRequest, NextResponse } from 'next/server';
import { getWithholdingStatistics } from '@/lib/services/withholding-service';

export async function GET(request: NextRequest) {
  try {
    const statistics = await getWithholdingStatistics();
    
    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error in withholding statistics API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch withholding statistics',
      data: null
    }, { status: 500 });
  }
}

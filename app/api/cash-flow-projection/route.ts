import { NextRequest, NextResponse } from 'next/server';
import { CashFlowProjectionService } from '@/lib/services/cash-flow-projection-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') ? 
      parseInt(searchParams.get('days')!) : 30;
    const includeProbability = searchParams.get('includeProbability') === 'true';

    const result = await CashFlowProjectionService.generateProjection(days, includeProbability);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in cash flow projection API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch cash flow projection',
      data: null
    }, { status: 500 });
  }
}

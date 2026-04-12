import { NextRequest, NextResponse } from 'next/server';
import { BreakEvenService } from '@/lib/services/break-even-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetProfit = searchParams.get('targetProfit') ? 
      parseInt(searchParams.get('targetProfit')!) : 50000;

    const result = await BreakEvenService.getCompleteAnalysis(undefined, targetProfit);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in break-even API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch break-even analysis',
      data: null
    }, { status: 500 });
  }
}

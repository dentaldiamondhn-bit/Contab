import { NextRequest, NextResponse } from 'next/server';
import { getWithholdings } from '@/lib/services/withholding-service';

export async function GET(request: NextRequest) {
  try {
    const withholdings = await getWithholdings();
    
    return NextResponse.json({
      success: true,
      data: withholdings
    });
  } catch (error) {
    console.error('Error in withholding API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch withholding data',
      data: []
    }, { status: 500 });
  }
}

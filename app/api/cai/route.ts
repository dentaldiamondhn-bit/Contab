import { NextRequest, NextResponse } from 'next/server';
import { getCAIs } from '@/lib/services/cai-service';

export async function GET(request: NextRequest) {
  try {
    const cais = await getCAIs({});
    
    return NextResponse.json({
      success: true,
      data: cais
    });
  } catch (error) {
    console.error('Error in CAI API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch CAI data',
      data: []
    }, { status: 500 });
  }
}

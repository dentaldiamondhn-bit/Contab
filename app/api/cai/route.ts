import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');
    
    let query = supabase
      .from('cai')
      .select('*');
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    const { data: cais, error } = await query;
    
    if (error) {
      console.error('Error fetching CAIs:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch CAI data',
        data: []
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: cais || []
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

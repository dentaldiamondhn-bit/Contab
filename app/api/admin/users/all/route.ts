import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function GET() {
  try {
    console.log('Simple API: Fetching all users without filters...');
    
    // Get ALL users without any filters
    const { data: users, count, error } = await supabase
      .from('User')
      .select('*');
    
    console.log('Simple API result:', { count: users?.length || 0, error: error?.message });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    return NextResponse.json({
      success: true,
      users: users || [],
      total: users?.length || 0
    });
    
  } catch (error: any) {
    console.error('Simple API error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}

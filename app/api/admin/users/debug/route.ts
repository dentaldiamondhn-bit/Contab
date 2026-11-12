import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function GET() {
  try {
    // Test basic connection
    console.log('Debug: Testing Supabase connection...');
    
    // Check if User table exists and has data
    const { data: allUsers, count: totalCount, error: usersError } = await supabase
      .from('User')
      .select('*', { count: 'exact' });
    
    if (usersError) {
      console.error('Debug: Error fetching users:', usersError);
      return NextResponse.json({ 
        error: 'Error fetching users', 
        details: usersError 
      });
    }
    
    console.log('Debug: Users found:', { count: totalCount, users: allUsers?.length });
    
    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('User')
      .select('id, email, role, tenantid, isactive')
      .limit(5);
    
    return NextResponse.json({
      success: true,
      debug: {
        totalUsers: totalCount,
        sampleUsers: tableInfo || [],
        tableError: tableError?.message
      }
    });
    
  } catch (error: any) {
    console.error('Debug: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message 
    });
  }
}

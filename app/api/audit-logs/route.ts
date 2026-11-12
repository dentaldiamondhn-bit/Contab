import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getUserRoleFromAuth } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let userRole = await getUserRoleFromAuth();

    let email = '';
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress || '';
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isAuthorized = ['SUPER_ADMIN', 'SUPPORT'].includes(userRole) || isSuperAdminEmail;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const tableName = searchParams.get('table') || undefined;

    const supabase = createServiceRoleClient();

    // Build query for audit logs
    let query = supabase
      .from('auditlog')
      .select(`*`, { count: 'exact' });

    // Date range filter (last 7 days)
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('timestamp', fromDate);

    if (tableName) {
      query = query.eq('tablename', tableName);
    }

    const { data: logs, error, count } = await query
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    // Ensure logs is an array
    const logsArray = logs || [];

    // Filter logs
    let filteredLogs = logsArray;
    
    if (filter !== 'all') {
      filteredLogs = logsArray.filter((log: any) => log.action === filter);
    }
    
    if (search) {
      filteredLogs = filteredLogs.filter((log: any) => 
        (log.recordid || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.tablename || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    // Transform logs to include parsed data
    const transformedLogs = filteredLogs.map((log: any) => ({
      id: log.id,
      tableName: log.tablename,
      recordId: log.recordid,
      action: log.action,
      oldValues: log.oldvalues,
      newValues: log.newvalues,
      changedFields: log.changedfields ? JSON.parse(log.changedfields) : null,
      userId: log.userid,
      userAgent: log.useragent,
      ipAddress: log.ipaddress,
      timestamp: log.timestamp
    }));

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      total: filteredLogs.length,
      page,
      limit,
      totalPages: Math.ceil(filteredLogs.length / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPeriodAuditTrail } from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    // Verificar autorización
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener email y rol del usuario desde Clerk
    let email = '';
    let userRole: string | undefined;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress || '';
      
      userRole = 
        user.publicMetadata?.role || 
        user.unsafeMetadata?.role ||
        (user.privateMetadata as any)?.role ||
        (sessionClaims?.metadata as any)?.role;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isAuthorized = ['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) || isSuperAdminEmail;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const tableName = searchParams.get('table') || undefined;

    // Get audit logs from the service
    const logs = await getPeriodAuditTrail(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      new Date(),
      tableName
    );

    // Ensure logs is an array
    const logsArray = Array.isArray(logs) ? logs : [];

    // Filter logs
    let filteredLogs = logsArray;
    
    if (filter !== 'all') {
      filteredLogs = logsArray.filter((log: any) => log.action === filter);
    }
    
    if (search) {
      filteredLogs = filteredLogs.filter((log: any) => 
        log.recordId.toLowerCase().includes(search.toLowerCase()) ||
        log.tableName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    // Transform logs to include parsed data
    const transformedLogs = paginatedLogs.map((log: any) => ({
      id: log.id,
      tableName: log.tableName,
      recordId: log.recordId,
      action: log.action,
      oldValues: log.oldValues,
      newValues: log.newValues,
      changedFields: log.changedFields ? JSON.parse(log.changedFields) : null,
      userId: log.userId,
      userAgent: log.userAgent,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp
    }));

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      total: filteredLogs.length,
      page,
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredLogs.length / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

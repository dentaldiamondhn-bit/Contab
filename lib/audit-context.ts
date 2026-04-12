import { NextRequest } from 'next/server';
import { setAuditContext } from './audit-middleware';

/**
 * Sets up audit context from the incoming request
 * This should be called at the beginning of API routes that modify data
 */
export function setupAuditContext(request: NextRequest, userId?: string) {
  const userAgent = request.headers.get('user-agent') || undefined;
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   undefined;

  setAuditContext({
    userId: userId || 'anonymous',
    userAgent,
    ipAddress,
  });
}

/**
 * Example usage in an API route:
 * 
 * import { NextRequest, NextResponse } from 'next/server';
 * import { db } from '@/lib/db';
 * import { setupAuditContext } from '@/lib/audit-context';
 * 
 * export async function POST(request: NextRequest) {
 *   try {
 *     // Set up audit context
 *     const userId = request.headers.get('x-user-id') || 'system';
 *     setupAuditContext(request, userId);
 * 
 *     // Now any database operations will be audited
 *     const transaction = await db.transaction.create({
 *       data: {
 *         description: 'New transaction',
 *         date: new Date(),
 *         entries: {
 *           create: [
 *             { accountId: 'account1', amount: 10000n },
 *             { accountId: 'account2', amount: -10000n }
 *           ]
 *         }
 *       }
 *     });
 * 
 *     return NextResponse.json(transaction);
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Failed to create transaction' },
 *       { status: 500 }
 *     );
 *   } finally {
 *     // Clear audit context
 *     // Note: In a real app, you might want to use proper context management
 *     // instead of manually clearing
 *     import { clearAuditContext } from './audit-middleware';
 *     clearAuditContext();
 *   }
 * }
 */

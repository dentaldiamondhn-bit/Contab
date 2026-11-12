import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/services/test-db';

export async function GET() {
  try {
    const result = await testDatabaseConnection();
    
    if (result.success) {
      return NextResponse.json({
        status: 'healthy',
        database: 'connected',
        accounts: result.accountCount,
        transactions: result.transactionCount,
        message: result.message
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'disconnected',
        error: result.error,
        message: result.message
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test failed'
    }, { status: 500 });
  }
}

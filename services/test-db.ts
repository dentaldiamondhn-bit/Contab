import { db } from "@/lib/db";

export async function testDatabaseConnection() {
  try {
    // Test basic connection
    await db.$queryRaw`SELECT 1`;
    
    // Test account query
    const accountCount = await db.account.count();
    
    // Test transaction query
    const transactionCount = await db.transaction.count();
    
    return {
      success: true,
      accountCount,
      transactionCount,
      message: "Database connection successful"
    };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: "Database connection failed"
    };
  }
}

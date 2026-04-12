import { db } from "@/lib/db";

// Simple database health check
async function checkDatabaseHealth() {
  try {
    // Simple query to test connection
    const result = await db.$queryRaw`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function getFinancialSummary() {
  try {
    // First check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.error('Database not healthy in getFinancialSummary');
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        cashOnHand: 0,
        netProfit: 0,
        error: 'Database connection failed'
      };
    }

    // Use simpler queries to avoid potential issues
    const accountCount = await db.account.count();
    console.log('Account count:', accountCount);

    // If no accounts, return zeros
    if (accountCount === 0) {
      console.log('No accounts found, returning zeros');
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        cashOnHand: 0,
        netProfit: 0
      };
    }

    // Try a simple find first
    const firstAccount = await db.account.findFirst();
    console.log('First account:', firstAccount);

    // Now try the full query with better error handling
    const accounts = await db.account.findMany({
      include: {
        entries: {
          select: {
            amount: true
          }
        },
      },
      take: 100, // Limit to avoid performance issues
    });

    console.log('Accounts query result type:', typeof accounts);
    console.log('Accounts length:', accounts?.length);
    console.log('First account entries:', accounts[0]?.entries);

    // Double-check it's an array
    if (!Array.isArray(accounts)) {
      console.error('Accounts is not an array:', accounts);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        cashOnHand: 0,
        netProfit: 0,
        error: 'Invalid query result'
      };
    }

    const summary = accounts.reduce(
      (acc: { totalRevenue: number; totalExpenses: number; cashOnHand: number }, account: any) => {
        try {
          const entries = account.entries || [];
          const balance = entries.reduce((sum: number, entry: any) => {
            const amount = entry?.amount ? Number(entry.amount) : 0;
            return sum + amount;
          }, 0);

          if (account.type === "REVENUE") {
            acc.totalRevenue += Math.abs(balance);
          } else if (account.type === "EXPENSE") {
            acc.totalExpenses += balance;
          } else if (account.type === "ASSET" && account.code === "1010") {
            acc.cashOnHand += balance;
          }
        } catch (accountError) {
          console.error('Error processing account:', accountError);
        }

        return acc;
      },
      { totalRevenue: 0, totalExpenses: 0, cashOnHand: 0 }
    );

    return {
      ...summary,
      netProfit: summary.totalRevenue - summary.totalExpenses,
    };
  } catch (error) {
    console.error('Error in getFinancialSummary:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      cashOnHand: 0,
      netProfit: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getMonthlyRevenueExpenses() {
  try {
    // First check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.error('Database not healthy in getMonthlyRevenueExpenses');
      return generateEmptyMonthlyData();
    }

    const transactionCount = await db.transaction.count();
    console.log('Transaction count:', transactionCount);

    // If no transactions, return empty data
    if (transactionCount === 0) {
      console.log('No transactions found, returning empty data');
      return generateEmptyMonthlyData();
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const transactions = await db.transaction.findMany({
      where: {
        date: {
          gte: twelveMonthsAgo,
        },
      },
      include: {
        entries: {
          include: {
            account: {
              select: {
                type: true
              }
            },
          },
        },
      },
      take: 1000, // Limit to avoid performance issues
      orderBy: {
        date: 'desc'
      }
    });

    console.log('Transactions query result type:', typeof transactions);
    console.log('Transactions length:', transactions?.length);

    // Double-check it's an array
    if (!Array.isArray(transactions)) {
      console.error('Transactions is not an array:', transactions);
      return generateEmptyMonthlyData();
    }

    // Group by month and calculate revenue/expenses
    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};

    transactions.forEach((transaction: any) => {
      try {
        const entries = transaction.entries || [];
        const monthKey = transaction.date?.toISOString().slice(0, 7); // YYYY-MM format
        
        if (!monthKey) return; // Skip if no valid date
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, expenses: 0 };
        }

        entries.forEach((entry: any) => {
          const amount = entry?.amount ? Number(entry.amount) : 0;
          
          if (entry.account?.type === "REVENUE") {
            monthlyData[monthKey].revenue += Math.abs(amount);
          } else if (entry.account?.type === "EXPENSE") {
            monthlyData[monthKey].expenses += amount;
          }
        });
      } catch (transactionError) {
        console.error('Error processing transaction:', transactionError);
      }
    });

    return generateMonthlyData(monthlyData);
  } catch (error) {
    console.error('Error in getMonthlyRevenueExpenses:', error);
    return generateEmptyMonthlyData();
  }
}

// Helper function to generate empty monthly data structure
function generateEmptyMonthlyData(existingData: { [key: string]: { revenue: number; expenses: number } } = {}) {
  // Generate all months for the last 12 months and fill missing months with zeros
  const result = [];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    
    result.push({
      month: monthName,
      monthKey,
      revenue: existingData[monthKey]?.revenue || 0,
      expenses: existingData[monthKey]?.expenses || 0,
    });
  }

  return result;
}

// Helper function to generate monthly data structure
function generateMonthlyData(monthlyData: { [key: string]: { revenue: number; expenses: number } }) {
  // Generate all months for the last 12 months and fill missing months with zeros
  const result = [];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    
    result.push({
      month: monthName,
      monthKey,
      revenue: monthlyData[monthKey]?.revenue || 0,
      expenses: monthlyData[monthKey]?.expenses || 0,
    });
  }

  return result;
}

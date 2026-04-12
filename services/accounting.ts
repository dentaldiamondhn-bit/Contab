import { db } from "@/lib/db";

// Database connection test
async function testDatabaseConnection() {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function getFinancialSummary() {
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('Database connection failed in getFinancialSummary');
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        cashOnHand: 0,
        netProfit: 0,
      };
    }

    const accounts = await db.account.findMany({
      include: {
        entries: true,
      },
    });

    // Validate accounts is an array
    if (!Array.isArray(accounts)) {
      console.error('Expected accounts to be an array, got:', typeof accounts, accounts);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        cashOnHand: 0,
        netProfit: 0,
      };
    }

    const summary = accounts.reduce(
      (acc: { totalRevenue: number; totalExpenses: number; cashOnHand: number }, account: any) => {
        // Validate account.entries is an array
        const entries = Array.isArray(account.entries) ? account.entries : [];
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
    };
  }
}

export async function getMonthlyRevenueExpenses() {
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('Database connection failed in getMonthlyRevenueExpenses');
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
            account: true,
          },
        },
      },
    });

    // Validate transactions is an array
    if (!Array.isArray(transactions)) {
      console.error('Expected transactions to be an array, got:', typeof transactions, transactions);
      return generateEmptyMonthlyData();
    }

    // Group by month and calculate revenue/expenses
    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};

    transactions.forEach((transaction: any) => {
      // Validate transaction.entries is an array
      const entries = Array.isArray(transaction.entries) ? transaction.entries : [];
      const monthKey = transaction.date?.toISOString().slice(0, 7); // YYYY-MM format
      
      if (!monthKey) return; // Skip if no valid date
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0 };
      }

      entries.forEach((entry: any) => {
        const amount = entry?.amount ? Number(entry.amount) : 0;
        
        if (entry.account?.type === "REVENUE") {
          // Revenue accounts typically have credit balances (negative)
          monthlyData[monthKey].revenue += Math.abs(amount);
        } else if (entry.account?.type === "EXPENSE") {
          // Expense accounts typically have debit balances (positive)
          monthlyData[monthKey].expenses += amount;
        }
      });
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
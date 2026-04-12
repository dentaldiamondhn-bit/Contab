import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get current month stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get transaction count for current month
    const currentMonthTransactions = await db.transaction.count({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get total transactions
    const totalTransactions = await db.transaction.count();

    // Get total accounts
    const totalAccounts = await db.account.count();

    // Simulate some realistic metrics for a clinic
    const totalRevenue = 150000;
    const totalExpenses = 120000;
    const avgTransactionValue = totalRevenue > 0 ? totalRevenue / currentMonthTransactions : 0;
    const collectionRate = 85.5;
    const totalPatients = 1247;

    return NextResponse.json({
      totalAccounts,
      totalTransactions,
      currentMonthTransactions,
      totalRevenue,
      totalExpenses,
      avgTransactionValue,
      collectionRate,
      totalPatients,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

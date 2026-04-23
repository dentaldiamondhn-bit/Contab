import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current-month';

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current-quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'last-quarter':
        const lastQuarterStart = Math.floor((now.getMonth() - 3) / 3) * 3;
        startDate = new Date(now.getFullYear(), lastQuarterStart, 1);
        endDate = new Date(now.getFullYear(), lastQuarterStart + 3, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get transactions for the period
    const transactions = await (db as any).transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Process transactions to calculate daily burn rate
    const dailyData = new Map();
    
    // Initialize all days in the period
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      dailyData.set(dayKey, {
        date: new Date(d),
        dailyRevenue: 0,
        dailyExpenses: 0,
      });
    }

    // Process transactions
    if (Array.isArray(transactions)) {
      for (const transaction of transactions) {
        const dayKey = transaction.date.toISOString().split('T')[0];
        const dayData = dailyData.get(dayKey);
        
        if (dayData && transaction.entries) {
          for (const entry of transaction.entries) {
            const amount = Number(entry.amount);
            
            if (entry.account && entry.account.type === 'REVENUE') {
              dayData.dailyRevenue += Math.abs(amount);
            } else if (entry.account && entry.account.type === 'EXPENSE') {
              dayData.dailyExpenses += amount;
            }
          }
        }
      }
    }

    // Convert to array and calculate cumulative values
    const result = Array.from(dailyData.entries()).map(([day, data], index, array) => {
      const previousData = index > 0 ? array[index - 1][1] : null;
      const cumulativeRevenue = previousData 
        ? previousData.cumulativeRevenue + data.dailyRevenue 
        : data.dailyRevenue;
      const cumulativeExpenses = previousData 
        ? previousData.cumulativeExpenses + data.dailyExpenses 
        : data.dailyExpenses;
      
      return {
        day: new Date(data.date).toLocaleDateString('en', { weekday: 'short' }),
        date: day,
        cumulativeRevenue,
        cumulativeExpenses,
        dailyRevenue: data.dailyRevenue,
        dailyExpenses: data.dailyExpenses,
        netCashFlow: cumulativeRevenue - cumulativeExpenses,
      };
    });

    // Calculate metrics
    const totalRevenue = result.reduce((sum, day) => sum + day.dailyRevenue, 0);
    const totalExpenses = result.reduce((sum, day) => sum + day.dailyExpenses, 0);
    const averageDailyBurn = totalExpenses / Math.max(result.length, 1);
    const currentRunway = totalRevenue > 0 ? totalRevenue / averageDailyBurn : 0;

    const metrics = {
      currentBurnRate: averageDailyBurn,
      runwayDays: Math.floor(currentRunway),
      monthlyAverage: averageDailyBurn * 30,
    };

    return NextResponse.json({
      success: true,
      data: result,
      metrics,
      period,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Error fetching burn rate data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch burn rate data' },
      { status: 500 }
    );
  }
}

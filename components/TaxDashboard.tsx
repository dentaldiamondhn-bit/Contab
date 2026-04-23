'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface TaxSummary {
  period: string;
  totalSales: number;
  totalPurchases: number;
  totalTaxToPay: number;
  salesTax: number;
  purchasesTax: number;
}

interface TaxDashboardProps {
  onGenerateReport?: (period: string) => void;
}

export default function TaxDashboard({ onGenerateReport }: TaxDashboardProps) {
  const [currentMonthSummary, setCurrentMonthSummary] = useState<TaxSummary | null>(null);
  const [previousMonthSummary, setPreviousMonthSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxSummaries();
  }, []);

  const fetchTaxSummaries = async () => {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const previousDate = new Date();
      previousDate.setMonth(previousDate.getMonth() - 1);
      const previousPeriod = previousDate.toISOString().slice(0, 7);

      const [currentResponse, previousResponse] = await Promise.all([
        fetch(`/api/tax-reporting?period=${currentPeriod}`),
        fetch(`/api/tax-reporting?period=${previousPeriod}`)
      ]);

      const currentData = await currentResponse.json();
      const previousData = await previousResponse.json();

      if (currentData.success) {
        setCurrentMonthSummary({
          period: currentData.data.period,
          totalSales: currentData.data.sales.totalBase,
          totalPurchases: currentData.data.purchases.totalBase,
          totalTaxToPay: currentData.data.summary.totalTaxToPay,
          salesTax: currentData.data.sales.totalTax,
          purchasesTax: currentData.data.purchases.totalTax
        });
      }

      if (previousData.success) {
        setPreviousMonthSummary({
          period: previousData.data.period,
          totalSales: previousData.data.sales.totalBase,
          totalPurchases: previousData.data.purchases.totalBase,
          totalTaxToPay: previousData.data.summary.totalTaxToPay,
          salesTax: previousData.data.sales.totalTax,
          purchasesTax: previousData.data.purchases.totalTax
        });
      }
    } catch (error) {
      console.error('Error fetching tax summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short' });
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    return trend >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTrendColor = (trend: number) => {
    return trend >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tax Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monthly tax overview and SAR reporting summary
        </p>
      </div>

      {/* Current Month Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Base</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthSummary ? formatCurrency(currentMonthSummary.totalSales) : 'L. 0.00'}
            </div>
            {currentMonthSummary && previousMonthSummary && (
              <div className="flex items-center space-x-1 text-xs">
                {getTrendIcon(calculateTrend(currentMonthSummary.totalSales, previousMonthSummary.totalSales))}
                <span className={getTrendColor(calculateTrend(currentMonthSummary.totalSales, previousMonthSummary.totalSales))}>
                  {Math.abs(calculateTrend(currentMonthSummary.totalSales, previousMonthSummary.totalSales)).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases Base</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthSummary ? formatCurrency(currentMonthSummary.totalPurchases) : 'L. 0.00'}
            </div>
            {currentMonthSummary && previousMonthSummary && (
              <div className="flex items-center space-x-1 text-xs">
                {getTrendIcon(calculateTrend(currentMonthSummary.totalPurchases, previousMonthSummary.totalPurchases))}
                <span className={getTrendColor(calculateTrend(currentMonthSummary.totalPurchases, previousMonthSummary.totalPurchases))}>
                  {Math.abs(calculateTrend(currentMonthSummary.totalPurchases, previousMonthSummary.totalPurchases)).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax to Pay SAR</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {currentMonthSummary ? formatCurrency(currentMonthSummary.totalTaxToPay) : 'L. 0.00'}
            </div>
            {currentMonthSummary && previousMonthSummary && (
              <div className="flex items-center space-x-1 text-xs">
                {getTrendIcon(calculateTrend(currentMonthSummary.totalTaxToPay, previousMonthSummary.totalTaxToPay))}
                <span className={getTrendColor(calculateTrend(currentMonthSummary.totalTaxToPay, previousMonthSummary.totalTaxToPay))}>
                  {Math.abs(calculateTrend(currentMonthSummary.totalTaxToPay, previousMonthSummary.totalTaxToPay)).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown */}
      {currentMonthSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Sales Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sales Base Amount:</span>
                  <span className="font-semibold">{formatCurrency(currentMonthSummary.totalSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ISV on Sales:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(currentMonthSummary.salesTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Effective Rate:</span>
                  <span className="font-semibold">
                    {currentMonthSummary.totalSales > 0 
                      ? ((currentMonthSummary.salesTax / currentMonthSummary.totalSales) * 100).toFixed(2) + '%'
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Purchases Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Purchases Base Amount:</span>
                  <span className="font-semibold">{formatCurrency(currentMonthSummary.totalPurchases)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ISV on Purchases:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(currentMonthSummary.purchasesTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Effective Rate:</span>
                  <span className="font-semibold">
                    {currentMonthSummary.totalPurchases > 0 
                      ? ((currentMonthSummary.purchasesTax / currentMonthSummary.totalPurchases) * 100).toFixed(2) + '%'
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => onGenerateReport?.(new Date().toISOString().slice(0, 7))}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Generate Current Month Report</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/tax-reporting'}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>View Full Tax Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Periods Summary */}
      {previousMonthSummary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Periods Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Period</th>
                    <th className="text-right p-2">Sales Base</th>
                    <th className="text-right p-2">Sales Tax</th>
                    <th className="text-right p-2">Purchases Base</th>
                    <th className="text-right p-2">Purchases Tax</th>
                    <th className="text-right p-2">Tax to Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthSummary && (
                    <tr className="border-b">
                      <td className="p-2 font-medium">{formatPeriod(currentMonthSummary.period)}</td>
                      <td className="p-2 text-right">{formatCurrency(currentMonthSummary.totalSales)}</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(currentMonthSummary.salesTax)}</td>
                      <td className="p-2 text-right">{formatCurrency(currentMonthSummary.totalPurchases)}</td>
                      <td className="p-2 text-right text-blue-600">{formatCurrency(currentMonthSummary.purchasesTax)}</td>
                      <td className="p-2 text-right font-semibold text-purple-600">{formatCurrency(currentMonthSummary.totalTaxToPay)}</td>
                    </tr>
                  )}
                  {previousMonthSummary && (
                    <tr className="border-b opacity-75">
                      <td className="p-2">{formatPeriod(previousMonthSummary.period)}</td>
                      <td className="p-2 text-right">{formatCurrency(previousMonthSummary.totalSales)}</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(previousMonthSummary.salesTax)}</td>
                      <td className="p-2 text-right">{formatCurrency(previousMonthSummary.totalPurchases)}</td>
                      <td className="p-2 text-right text-blue-600">{formatCurrency(previousMonthSummary.purchasesTax)}</td>
                      <td className="p-2 text-right font-semibold text-purple-600">{formatCurrency(previousMonthSummary.totalTaxToPay)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

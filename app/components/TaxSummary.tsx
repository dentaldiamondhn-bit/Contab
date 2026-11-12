'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateTaxSummary, formatTaxCurrency, TaxSummaryReport } from '@/lib/reports/tax-summary';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
export default function TaxSummary() {
  const [report, setReport] = useState<TaxSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<'LPS' | 'USD'>('LPS');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  );

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const result = await generateTaxSummary(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        currency
      );
      setReport(result);
    } catch (error) {
      console.error('Error generating tax summary:', error);
      alert('Error generating tax summary');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  const exportToCSV = () => {
    if (!report) return;

    const csvContent = [
      `Tax Summary Report - ${report.currency}`,
      `Period: ${formatDate(report.period.startDate)} - ${formatDate(report.period.endDate)}`,
      `Generated: ${formatDateTime(report.generatedAt)}`,
      '',
      'SALES (REVENUE)',
      `Total Sales,${formatTaxCurrency(report.sales.totalSales, report.currency)}`,
      `Taxable Sales,${formatTaxCurrency(report.sales.taxableSales, report.currency)}`,
      `Exempt Sales,${formatTaxCurrency(report.sales.exemptSales, report.currency)}`,
      `IVA Collected (15%),${formatTaxCurrency(report.sales.ivaCollected, report.currency)}`,
      '',
      'PURCHASES (EXPENSES)',
      `Total Purchases,${formatTaxCurrency(report.purchases.totalPurchases, report.currency)}`,
      `Taxable Purchases,${formatTaxCurrency(report.purchases.taxablePurchases, report.currency)}`,
      `Exempt Purchases,${formatTaxCurrency(report.purchases.exemptPurchases, report.currency)}`,
      `IVA Paid (15%),${formatTaxCurrency(report.purchases.ivaPaid, report.currency)}`,
      '',
      'NET IVA',
      `Net IVA to Pay/Refund,${formatTaxCurrency(report.netIva, report.currency)}`,
      '',
      'INCOME TAX (ISR)',
      `Gross Income,${formatTaxCurrency(report.income.grossIncome, report.currency)}`,
      `Deductible Expenses,${formatTaxCurrency(report.income.deductibleExpenses, report.currency)}`,
      `Taxable Income,${formatTaxCurrency(report.income.taxableIncome, report.currency)}`,
      `Income Tax (ISR),${formatTaxCurrency(report.income.isrTax, report.currency)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-summary-${report.currency}-${formatDate(new Date()).replace(/\//g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-gray-600">Generating Tax Summary...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-red-600">Error loading tax summary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tax Summary (Resumen Fiscal)</h1>
        <p className="text-gray-600">
          Honduran tax calculation for IVA (15%) and ISR (Income Tax)
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'LPS' | 'USD')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="LPS">Honduran Lempira (LPS)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              Generate
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Period Info */}
      <Card className="mb-6 p-4 bg-cyan-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-cyan-800">Tax Period</h3>
            <p className="text-cyan-600">
              {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-cyan-600">Generated</p>
            <p className="text-cyan-800 font-medium">{formatDateTime(report.generatedAt)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Sales (Revenue)</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sales:</span>
              <span className="font-bold">{formatTaxCurrency(report.sales.totalSales, report.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable Sales:</span>
              <span className="font-bold">{formatTaxCurrency(report.sales.taxableSales, report.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exempt Sales:</span>
              <span className="font-bold">{formatTaxCurrency(report.sales.exemptSales, report.currency)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-green-700">IVA Collected (15%):</span>
                <span className="font-bold text-green-700">{formatTaxCurrency(report.sales.ivaCollected, report.currency)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Purchases Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-700">Purchases (Expenses)</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Purchases:</span>
              <span className="font-bold">{formatTaxCurrency(report.purchases.totalPurchases, report.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable Purchases:</span>
              <span className="font-bold">{formatTaxCurrency(report.purchases.taxablePurchases, report.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exempt Purchases:</span>
              <span className="font-bold">{formatTaxCurrency(report.purchases.exemptPurchases, report.currency)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">IVA Paid (15%):</span>
                <span className="font-bold text-red-700">{formatTaxCurrency(report.purchases.ivaPaid, report.currency)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Net IVA */}
      <Card className={`mb-6 p-6 ${
        report.netIva >= 0 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Net IVA (Sales Tax)</h2>
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              report.netIva >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatTaxCurrency(report.netIva, report.currency)}
            </p>
            <p className="text-sm text-gray-600">
              {report.netIva >= 0 ? 'To Pay' : 'To Refund'}
            </p>
          </div>
        </div>
      </Card>

      {/* Income Tax Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">Income Tax (ISR)</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Gross Income:</span>
            <span className="font-bold">{formatTaxCurrency(report.income.grossIncome, report.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Deductible Expenses:</span>
            <span className="font-bold">{formatTaxCurrency(report.income.deductibleExpenses, report.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Taxable Income:</span>
            <span className="font-bold">{formatTaxCurrency(report.income.taxableIncome, report.currency)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-purple-700">Income Tax (ISR):</span>
              <span className="font-bold text-purple-700">{formatTaxCurrency(report.income.isrTax, report.currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tax Summary */}
      <Card className="mt-6 p-6 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Total Tax Obligation</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Net IVA:</span>
            <span className="font-bold">{formatTaxCurrency(report.netIva, report.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Income Tax (ISR):</span>
            <span className="font-bold">{formatTaxCurrency(report.income.isrTax, report.currency)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Tax Due:</span>
              <span className="font-bold text-red-600">
                {formatTaxCurrency(report.netIva + report.income.isrTax, report.currency)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

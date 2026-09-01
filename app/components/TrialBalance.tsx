'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateTrialBalance, TrialBalanceReport, TrialBalanceAccount } from '@/lib/reports/trial-balance';
import { getAccountTypeLabel, ACCOUNT_TYPE_COLORS } from '@/lib/accounting-utils';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
export default function TrialBalance() {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const result = await generateTrialBalance(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      setReport(result);
    } catch (error) {
      console.error('Error generating trial balance:', error);
      alert('Error generating trial balance');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };


  const exportToCSV = () => {
    if (!report) return;

    const headers = [
      'Account Code', 
      'Account Name', 
      'Type', 
      'Opening Balance', 
      'Total Debits (Movements)', 
      'Total Credits (Movements)', 
      'Ending Balance',
      'Debit Balance',
      'Credit Balance'
    ];
    const rows = report.accounts.map(account => [
      account.code,
      account.name,
      account.type,
      formatCurrency(account.openingBalance),
      formatCurrency(account.totalDebits),
      formatCurrency(account.totalCredits),
      formatCurrency(account.endingBalance),
      formatCurrency(account.debitBalance),
      formatCurrency(account.creditBalance)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `Totals,,,,,${formatCurrency(report.totalDebits)},${formatCurrency(report.totalCredits)},${formatCurrency(report.totalEndingBalance)},${formatCurrency(report.totalTrialDebits)},${formatCurrency(report.totalTrialCredits)}`,
      `Balanced: ${report.isBalanced ? 'YES' : 'NO'}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${formatDate(new Date()).replace(/\//g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <p className="text-gray-600">Generating Trial Balance...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <p className="text-red-600">Error loading trial balance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trial Balance (Balanza de Comprobación)</h1>
        <p className="text-gray-600">
          Period: {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
        </p>
        <p className="text-sm text-gray-500">
          Generated: {formatDate(report.generatedAt)}
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
          <Button onClick={generateReport} disabled={loading}>
            Generate Report
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            Export to CSV
          </Button>
        </div>
      </Card>

      {/* Balance Status */}
      <Card className={`mb-6 p-4 ${
        report.isBalanced ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Balance Verification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Total Trial Debits: </span>
                <span className="font-bold text-lg">{formatCurrency(report.totalTrialDebits)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Trial Credits: </span>
                <span className="font-bold text-lg">{formatCurrency(report.totalTrialCredits)}</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${
              report.isBalanced ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.isBalanced ? '✓ BALANCED' : '✗ NOT BALANCED'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {report.isBalanced 
                ? 'Trial Balance is correct' 
                : `Difference: ${formatCurrency(Math.abs(report.totalTrialDebits - report.totalTrialCredits))}`
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Trial Balance Table */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Professional Trial Balance</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-2">Account Code</th>
                <th className="text-left p-2">Account Name</th>
                <th className="text-left p-2">Type</th>
                <th className="text-right p-2">Opening Balance</th>
                <th className="text-right p-2">Total Debits<br/>(Movements)</th>
                <th className="text-right p-2">Total Credits<br/>(Movements)</th>
                <th className="text-right p-2">Ending Balance</th>
                <th className="text-right p-2">Debit Balance</th>
                <th className="text-right p-2">Credit Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.accounts.map((account) => (
                <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 font-mono text-sm">{account.code}</td>
                  <td className="p-2">{account.name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ACCOUNT_TYPE_COLORS[account.type] || 'bg-gray-100 text-gray-800'}`}>
                      {getAccountTypeLabel(account.type)}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCurrency(account.openingBalance)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {account.totalDebits > 0 ? formatCurrency(account.totalDebits) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {account.totalCredits > 0 ? formatCurrency(account.totalCredits) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCurrency(account.endingBalance)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-bold">
                <td colSpan={3} className="p-2 text-right">TOTALS:</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalOpeningBalance)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalDebits)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalCredits)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalEndingBalance)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalTrialDebits)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(report.totalTrialCredits)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

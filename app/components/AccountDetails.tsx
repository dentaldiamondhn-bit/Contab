'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { generateAccountDetails, getAllAccounts, formatCurrency, AccountDetailsReport } from '@/lib/reports/account-details';
import { getAccountTypeLabel, getAccountTypeColor } from '@/lib/accounting-utils';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function AccountDetails() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [report, setReport] = useState<AccountDetailsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accountList = await getAllAccounts();
      setAccounts(accountList as Account[]);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedAccountId) {
      alert('Please select an account');
      return;
    }

    setLoading(true);
    try {
      const result = await generateAccountDetails(
        selectedAccountId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      if (result) {
        setReport(result);
      } else {
        alert('Account not found');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating account details report');
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

    const headers = [
      'Date',
      'Description',
      'Reference',
      'Debit',
      'Credit',
      'Running Balance',
      'Cleared'
    ];

    const rows = report.entries.map(entry => [
      formatDate(entry.date),
      entry.description,
      entry.reference || '',
      entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '',
      entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '',
      formatCurrency(entry.runningBalance),
      entry.cleared ? 'Yes' : 'No'
    ]);

    const csvContent = [
      `Account Details Report - ${report.account.code} ${report.account.name}`,
      `Period: ${formatDate(report.period.startDate)} - ${formatDate(report.period.endDate)}`,
      `Generated: ${formatDateTime(report.generatedAt)}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `Opening Balance,${formatCurrency(report.openingBalance)}`,
      `Total Debits,${formatCurrency(report.totalDebits)}`,
      `Total Credits,${formatCurrency(report.totalCredits)}`,
      `Closing Balance,${formatCurrency(report.closingBalance)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-details-${report.account.code}-${formatDate(new Date()).replace(/\//g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Auxiliar de Cuentas (Account Details)</h1>
          <p className="text-gray-600">
            Detailed transaction history for a specific account with running balances
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/companies/1/accounting')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a Contabilidad</span>
        </Button>
      </div>

      {/* Controls */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <Button onClick={generateReport} disabled={loading || !selectedAccountId}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {report && (
        <>
          {/* Account Summary */}
          <Card className="mb-6 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{report.account.code} - {report.account.name}</h2>
                <p className="text-gray-600">{report.account.description}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getAccountTypeColor(report.account.type)}`}>
                  {getAccountTypeLabel(report.account.type)}
                </span>
              </div>
              <div className="text-right">
                <Button onClick={exportToCSV} variant="outline">
                  Export to CSV
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600">Opening Balance</h3>
                <p className={`text-lg font-bold ${report.openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.openingBalance)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600">Total Debits</h3>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(report.totalDebits)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600">Total Credits</h3>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(report.totalCredits)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600">Net Change</h3>
                <p className={`text-lg font-bold ${report.totalDebits - report.totalCredits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.totalDebits - report.totalCredits)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600">Closing Balance</h3>
                <p className={`text-lg font-bold ${report.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.closingBalance)}
                </p>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Period: {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)} | 
              Generated: {formatDateTime(report.generatedAt)}
            </div>
          </Card>

          {/* Transactions Table */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Reference</th>
                    <th className="text-right p-2">Debit</th>
                    <th className="text-right p-2">Credit</th>
                    <th className="text-right p-2">Running Balance</th>
                    <th className="text-center p-2">Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry, index) => (
                    <tr key={entry.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-2 text-sm">{formatDate(entry.date)}</td>
                      <td className="p-2">{entry.description}</td>
                      <td className="p-2 text-sm text-gray-600">{entry.reference || '-'}</td>
                      <td className="p-2 text-right font-mono">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                      </td>
                      <td className={`p-2 text-right font-mono font-semibold ${
                        entry.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(entry.runningBalance)}
                      </td>
                      <td className="p-2 text-center">
                        {entry.cleared ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

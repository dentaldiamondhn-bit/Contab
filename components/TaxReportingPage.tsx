'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Calendar } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface TaxReportDetail {
  accountCode: string;
  accountName: string;
  totalBase: number;
  totalTax: number;
  transactionCount: number;
  effectiveRate: number;
}

interface MonthlyTaxReport {
  period: string;
  sales: {
    totalBase: number;
    totalTax: number;
    details: TaxReportDetail[];
  };
  purchases: {
    totalBase: number;
    totalTax: number;
    details: TaxReportDetail[];
  };
  summary: {
    totalTaxToPay: number;
    totalBaseSales: number;
    totalBasePurchases: number;
  };
  taxConfig: {
    name: string;
    rate: number;
    account: {
      name: string;
      code: string;
    };
  };
}

export default function TaxReportingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [report, setReport] = useState<MonthlyTaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAvailablePeriods();
    
    // Set default to current month
    const currentPeriod = new Date().toISOString().slice(0, 7);
    setSelectedPeriod(currentPeriod);
  }, []);

  const fetchAvailablePeriods = async () => {
    try {
      const response = await fetch('/api/tax-reporting');
      const data = await response.json();
      setAvailablePeriods(data.periods || []);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedPeriod) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/tax-reporting?period=${selectedPeriod}`);
      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate tax report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    if (!report) return;

    setExporting(true);
    try {
      const response = await fetch('/api/tax-reporting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: selectedPeriod,
          format: 'csv'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-report-${selectedPeriod}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export tax report');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tax Reporting - Declaración Mensual SAR</h1>
        <p className="mt-2 text-gray-600">
          Monthly tax report for SAR (Servicio de Administración de Rentas) declarations.
        </p>
      </div>

      {/* Period Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Select Reporting Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availablePeriods.map((period) => (
                  <option key={period} value={period}>
                    {formatPeriod(period)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={generateReport}
              disabled={loading || !selectedPeriod}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {report && (
              <Button
                onClick={exportToCSV}
                disabled={exporting}
                variant="outline"
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Monthly Tax Report - {formatPeriod(report.period)}</span>
                <span className="text-sm font-normal text-gray-600">
                  Tax Rate: {(report.taxConfig.rate * 100).toFixed(1)}%
                </span>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Sales Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Sales (Ventas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Base Amount</th>
                      <th className="text-right p-2">ISV Tax</th>
                      <th className="text-right p-2">Effective Rate</th>
                      <th className="text-right p-2">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales.details.map((detail, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono">{detail.accountCode}</td>
                        <td className="p-2">{detail.accountName}</td>
                        <td className="p-2 text-right">{formatCurrency(detail.totalBase)}</td>
                        <td className="p-2 text-right">{formatCurrency(detail.totalTax)}</td>
                        <td className="p-2 text-right">{(detail.effectiveRate * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right">{detail.transactionCount}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-green-50">
                      <td className="p-2" colSpan={2}>TOTAL SALES</td>
                      <td className="p-2 text-right">{formatCurrency(report.sales.totalBase)}</td>
                      <td className="p-2 text-right">{formatCurrency(report.sales.totalTax)}</td>
                      <td className="p-2 text-right">
                        {report.sales.totalBase > 0 
                          ? ((report.sales.totalTax / report.sales.totalBase) * 100).toFixed(2) + '%'
                          : '0%'
                        }
                      </td>
                      <td className="p-2 text-right">
                        {report.sales.details.reduce((sum, d) => sum + d.transactionCount, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Purchases Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Purchases (Compras)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Base Amount</th>
                      <th className="text-right p-2">ISV Tax</th>
                      <th className="text-right p-2">Effective Rate</th>
                      <th className="text-right p-2">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.purchases.details.map((detail, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono">{detail.accountCode}</td>
                        <td className="p-2">{detail.accountName}</td>
                        <td className="p-2 text-right">{formatCurrency(detail.totalBase)}</td>
                        <td className="p-2 text-right">{formatCurrency(detail.totalTax)}</td>
                        <td className="p-2 text-right">{(detail.effectiveRate * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right">{detail.transactionCount}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-blue-50">
                      <td className="p-2" colSpan={2}>TOTAL PURCHASES</td>
                      <td className="p-2 text-right">{formatCurrency(report.purchases.totalBase)}</td>
                      <td className="p-2 text-right">{formatCurrency(report.purchases.totalTax)}</td>
                      <td className="p-2 text-right">
                        {report.purchases.totalBase > 0 
                          ? ((report.purchases.totalTax / report.purchases.totalBase) * 100).toFixed(2) + '%'
                          : '0%'
                        }
                      </td>
                      <td className="p-2 text-right">
                        {report.purchases.details.reduce((sum, d) => sum + d.transactionCount, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Total Sales Base</div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(report.summary.totalBaseSales)}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Total Purchases Base</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(report.summary.totalBasePurchases)}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">TOTAL TO PAY SAR</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {formatCurrency(report.summary.totalTaxToPay)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    (Sales Tax - Purchases Tax)
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Tax Calculation Details:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total ISV on Sales:</span>
                    <span className="font-semibold">{formatCurrency(report.sales.totalTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total ISV on Purchases:</span>
                    <span className="font-semibold">{formatCurrency(report.purchases.totalTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Net ISV to Pay:</span>
                    <span className="text-purple-700">{formatCurrency(report.summary.totalTaxToPay)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Export Options</h3>
                  <p className="text-sm text-gray-600">
                    Download this report for SAR submission or record keeping
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={exportToCSV}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export CSV for SAR
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

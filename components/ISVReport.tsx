'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp, Calendar } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
interface ISVSummary {
  standardISV: number;
  specialISV: number;
  totalISV: number;
  formattedAmounts: {
    standardISV: string;
    specialISV: string;
    totalISV: string;
  };
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    totalAmount: number;
    entries: Array<{
      accountName: string;
      amount: number;
      isDebit: boolean;
    }>;
  }>;
}

interface ISVReportProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function ISVReport({ 
  initialStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  initialEndDate = new Date().toISOString().split('T')[0]
}: ISVReportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ISVSummary | null>(null);
  
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  useEffect(() => {
    fetchISVSummary();
  }, [startDate, endDate]);

  const fetchISVSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/isv/summary?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ISV summary');
      }

      setSummary(data.summary);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch ISV summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    if (!summary) return;

    const headers = ['Fecha', 'Descripción', 'Monto Total', 'ISV 15%', 'ISV 18%', 'Cuenta ISV'];
    const rows = summary.transactions.map(transaction => {
      const isv15Entry = transaction.entries.find(e => e.accountName.includes('15%'));
      const isv18Entry = transaction.entries.find(e => e.accountName.includes('18%'));
      const isvEntry = isv15Entry || isv18Entry;

      return [
        formatDate(transaction.date),
        transaction.description,
        formatCurrency(transaction.totalAmount),
        isv15Entry ? formatCurrency(isv15Entry.amount) : '',
        isv18Entry ? formatCurrency(isv18Entry.amount) : '',
        isvEntry?.accountName || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `isv_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Reporte de ISV</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchISVSummary} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                <Calendar className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {summary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">ISV Estándar (15%)</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {summary.formattedAmounts.standardISV}
                        </p>
                      </div>
                      <Badge variant="outline">15%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">ISV Especial (18%)</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {summary.formattedAmounts.specialISV}
                        </p>
                      </div>
                      <Badge variant="outline">18%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total ISV</p>
                        <p className="text-2xl font-bold text-green-600">
                          {summary.formattedAmounts.totalISV}
                        </p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transacciones con ISV</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToCSV}
                  >
                    Exportar CSV
                  </Button>
                </div>

                {summary.transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron transacciones con ISV en el período seleccionado.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 border-b">Fecha</th>
                            <th className="text-left p-3 border-b">Descripción</th>
                            <th className="text-right p-3 border-b">Total</th>
                            <th className="text-right p-3 border-b">ISV</th>
                            <th className="text-left p-3 border-b">Cuenta ISV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.transactions.map((transaction) => {
                            const isvEntry = transaction.entries.find(e => 
                              e.accountName.includes('ISV')
                            );
                            const isvRate = isvEntry?.accountName.includes('18%') ? '18%' : '15%';

                            return (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="p-3 border-b">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="p-3 border-b">
                                  <div>
                                    {transaction.description}
                                  </div>
                                </td>
                                <td className="text-right p-3 border-b font-medium">
                                  {formatCurrency(transaction.totalAmount)}
                                </td>
                                <td className="text-right p-3 border-b">
                                  <div className="flex flex-col items-end">
                                    <span className="text-blue-600">
                                      {formatCurrency(isvEntry?.amount || 0)}
                                    </span>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {isvRate}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="p-3 border-b">
                                  <div className="text-sm">
                                    {isvEntry?.accountName || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

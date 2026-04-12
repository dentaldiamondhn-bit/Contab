'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';

interface TrialBalanceData {
  year: string;
  trialBalance: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    balance: number;
    debit: number;
    credit: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

interface AdjustingEntry {
  id: string;
  date: string;
  description: string;
  voucherNumber: number;
  entries: Array<{
    id: string;
    amount: number;
    account: {
      name: string;
      code: string;
      type: string;
    };
  }>;
}

interface ClosingStatus {
  year: string;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  lastClosedDate?: string;
}

export default function YearEndClosing() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<'review' | 'adjust' | 'close' | 'complete'>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [adjustingEntries, setAdjustingEntries] = useState<AdjustingEntry[]>([]);
  const [closingStatus, setClosingStatus] = useState<ClosingStatus | null>(null);
  const [equityAccounts, setEquityAccounts] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    fetchClosingStatus();
    fetchEquityAccounts();
  }, [year]);

  const fetchClosingStatus = async () => {
    try {
      const response = await fetch(`/api/closing/perform?year=${year}`);
      const data = await response.json();
      setClosingStatus(data);
      
      if (data.isClosed) {
        setStep('complete');
      }
    } catch (error) {
      setError('Failed to check closing status');
    }
  };

  const fetchEquityAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const accounts = await response.json();
      setEquityAccounts(accounts.filter((acc: any) => acc.type === 'EQUITY'));
    } catch (error) {
      setError('Failed to fetch equity accounts');
    }
  };

  const fetchTrialBalance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/closing/trial-balance?year=${year}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trial balance');
      }
      
      setTrialBalance(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch trial balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustingEntries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/closing/adjusting-entries?year=${year}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch adjusting entries');
      }
      
      setAdjustingEntries(data.adjustingEntries);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch adjusting entries');
    } finally {
      setLoading(false);
    }
  };

  const performClosing = async () => {
    if (!equityAccounts.length) {
      setError('No equity accounts available for closing');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/closing/perform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          equityAccountId: equityAccounts[0].id, // Use first equity account (Retained Earnings)
          closedBy: 'System' // Should come from auth context
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          // Duplicate closure error
          throw new Error(data.error);
        } else if (response.status === 400 && data.type === 'VALIDATION_ERROR') {
          // P&L validation error
          throw new Error(data.error);
        } else {
          throw new Error(data.error || 'Failed to perform closing');
        }
      }
      
      setStep('complete');
      await fetchClosingStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to perform closing');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount / 100); // Convert from cents
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Year-End Closing - {year}</h1>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-1 border rounded"
            min="2000"
            max={new Date().getFullYear() + 1}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {closingStatus?.isClosed && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Books for {year} are already closed by {closingStatus.closedBy} on {new Date(closingStatus.closedAt!).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Trial Balance Review */}
      <Card className={step !== 'review' ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>1. Trial Balance Review</span>
            {trialBalance?.isBalanced && <CheckCircle className="h-5 w-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Verify all figures are correct before proceeding with the closing process.
          </p>
          
          <Button 
            onClick={fetchTrialBalance} 
            disabled={loading || step !== 'review'}
            className="mb-4"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load Trial Balance
          </Button>

          {trialBalance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-right">
                  <span className="font-semibold">Total Debits:</span>
                  <div className="text-lg">{formatCurrency(trialBalance.totalDebits)}</div>
                </div>
                <div className="text-right">
                  <span className="font-semibold">Total Credits:</span>
                  <div className="text-lg">{formatCurrency(trialBalance.totalCredits)}</div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account</th>
                      <th className="text-right p-2">Debit</th>
                      <th className="text-right p-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.trialBalance.map((account) => (
                      <tr key={account.id} className="border-b">
                        <td className="p-2">
                          <div>{account.name}</div>
                          <div className="text-xs text-gray-500">{account.code}</div>
                        </td>
                        <td className="text-right p-2">
                          {account.debit > 0 ? formatCurrency(account.debit) : ''}
                        </td>
                        <td className="text-right p-2">
                          {account.credit > 0 ? formatCurrency(account.credit) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {trialBalance.isBalanced ? (
                <Button onClick={() => setStep('adjust')} className="w-full">
                  Proceed to Adjusting Entries
                </Button>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Trial balance is not balanced. Please review and correct before proceeding.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Adjusting Entries */}
      <Card className={step !== 'adjust' ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle>2. Adjusting Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Make manual adjusting entries for depreciation, accruals, or other year-end adjustments.
          </p>
          
          <Button 
            onClick={fetchAdjustingEntries} 
            disabled={loading || step !== 'adjust'}
            className="mb-4"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load Adjusting Entries
          </Button>

          {adjustingEntries.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Existing Adjusting Entries ({adjustingEntries.length})</h3>
              <div className="max-h-64 overflow-y-auto">
                {adjustingEntries.map((entry) => (
                  <div key={entry.id} className="border rounded p-3 mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{entry.description}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(entry.date).toLocaleDateString()} - Voucher #{entry.voucherNumber}
                        </div>
                      </div>
                      <Badge variant="outline">AJUSTE</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {entry.entries.map((journalEntry) => (
                        <div key={journalEntry.id} className="flex justify-between">
                          <span>{journalEntry.account.name}</span>
                          <span className={journalEntry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(Math.abs(journalEntry.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={() => setStep('close')} 
            disabled={step !== 'adjust'}
            className="w-full mt-4"
          >
            Proceed to Closing
          </Button>
        </CardContent>
      </Card>

      {/* Step 3: Perform Closing */}
      <Card className={step !== 'close' ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>3. Year-End Closing</span>
            <Lock className="h-5 w-5 text-orange-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This will create the closing entry and lock the fiscal year. This action cannot be undone.
          </p>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> After closing, no transactions can be created or modified for {year}.
              All revenue and expense accounts will be closed to retained earnings.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={performClosing} 
            disabled={loading || step !== 'close'}
            variant="destructive"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Close Books for {year}
          </Button>
        </CardContent>
      </Card>

      {/* Complete State */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span>Closing Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Year-end closing for {year} has been completed successfully. The books are now locked and no further transactions can be created for this period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

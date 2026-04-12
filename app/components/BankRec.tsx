'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { suggestMatches } from '@/app/lib/services/reconciliation';
import { parseBankStatement, BankStatementRow } from '@/app/lib/services/bank-statement-parser';

interface BankRow {
  id: string;
  date: Date;
  description: string;
  amount: number;
}

interface LedgerEntry {
  id: string;
  date: Date;
  description: string;
  amount: number;
  cleared: boolean;
}

interface Match {
  bankRow: BankRow;
  suggestedId: string | null;
  confidence: 'HIGH' | 'LOW';
}

export default function BankRec() {
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedBankRow, setSelectedBankRow] = useState<string | null>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockBankRows: BankRow[] = [
      { id: 'b1', date: new Date('2024-01-15'), description: 'Deposit from Client A', amount: 5000 },
      { id: 'b2', date: new Date('2024-01-16'), description: 'Office Supplies Store', amount: -150 },
      { id: 'b3', date: new Date('2024-01-17'), description: 'Software Subscription', amount: -99 },
      { id: 'b4', date: new Date('2024-01-18'), description: 'Client Payment', amount: 2500 },
    ];

    const mockLedgerEntries: LedgerEntry[] = [
      { id: 'l1', date: new Date('2024-01-15'), description: 'Client A Payment', amount: 5000, cleared: false },
      { id: 'l2', date: new Date('2024-01-16'), description: 'Office Supplies', amount: -150, cleared: false },
      { id: 'l3', date: new Date('2024-01-17'), description: 'Software License', amount: -99, cleared: false },
      { id: 'l4', date: new Date('2024-01-18'), description: 'Client B Payment', amount: 2500, cleared: false },
      { id: 'l5', date: new Date('2024-01-14'), description: 'Old Transaction', amount: 100, cleared: false },
    ];

    setBankRows(mockBankRows);
    setLedgerEntries(mockLedgerEntries);

    // Generate suggested matches
    const suggestedMatches = suggestMatches(mockBankRows, mockLedgerEntries);
    setMatches(suggestedMatches);
  }, []);

  const handleMatch = () => {
    if (!selectedBankRow || !selectedLedgerEntry) {
      alert('Please select both a bank row and a ledger entry to match');
      return;
    }

    // Mark the ledger entry as cleared
    setLedgerEntries(prev => 
      prev.map(entry => 
        entry.id === selectedLedgerEntry 
          ? { ...entry, cleared: true }
          : entry
      )
    );

    // Update the match
    setMatches(prev =>
      prev.map(match =>
        match.bankRow.id === selectedBankRow
          ? { ...match, suggestedId: selectedLedgerEntry, confidence: 'HIGH' as const }
          : match
      )
    );

    // Clear selections
    setSelectedBankRow(null);
    setSelectedLedgerEntry(null);
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await parseBankStatement(file);
      if (result.success && result.data) {
        setBankRows(result.data);
        // Generate new matches with the imported data
        const newMatches = suggestMatches(result.data, ledgerEntries);
        setMatches(newMatches);
      } else {
        alert(result.error || 'Error parsing bank statement');
      }
    } catch (error) {
      alert('Error importing bank statement');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHighConfidence = () => {
    const highConfidenceMatches = matches.filter(m => m.confidence === 'HIGH' && m.suggestedId);
    
    if (highConfidenceMatches.length === 0) {
      alert('No high confidence matches found');
      return;
    }

    // Mark all high confidence matches as cleared
    const clearedIds = new Set(highConfidenceMatches.map(m => m.suggestedId).filter(Boolean));
    
    setLedgerEntries(prev => 
      prev.map(entry => 
        clearedIds.has(entry.id) 
          ? { ...entry, cleared: true }
          : entry
      )
    );

    // Update matches to reflect they've been processed
    setMatches(prev =>
      prev.map(match =>
        match.confidence === 'HIGH' && match.suggestedId
          ? { ...match, confidence: 'HIGH' as const }
          : match
      )
    );

    alert(`Cleared ${highConfidenceMatches.length} high confidence matches`);
  };

  // Calculate difference
  const statementBalance = bankRows.reduce((sum, row) => sum + row.amount, 0);
  const clearedLedgerBalance = ledgerEntries
    .filter(entry => entry.cleared)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const difference = statementBalance - clearedLedgerBalance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getUnmatchedLedgerEntries = () => {
    const matchedIds = new Set(matches.map(m => m.suggestedId).filter(Boolean));
    return ledgerEntries.filter(entry => !entry.cleared && !matchedIds.has(entry.id));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bank Reconciliation</h1>
        <p className="text-gray-600">Match bank statement rows with uncleared ledger entries</p>
      </div>

      {/* Difference Calculator */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Statement Balance</h3>
            <p className={`text-xl font-bold ${statementBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(statementBalance)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Cleared Ledger Balance</h3>
            <p className={`text-xl font-bold ${clearedLedgerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(clearedLedgerBalance)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Difference</h3>
            <p className={`text-2xl font-bold ${
              difference === 0 
                ? 'text-green-600' 
                : difference > 0 
                  ? 'text-orange-600' 
                  : 'text-red-600'
            }`}>
              {formatCurrency(difference)}
            </p>
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold mb-2 ${
              difference === 0 
                ? 'text-green-600' 
                : 'text-orange-600'
            }`}>
              {difference === 0 ? '✓ Reconciled' : '⚠ Not Reconciled'}
            </p>
            <Button
              onClick={handleClearHighConfidence}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Clear All High Confidence
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelImport}
          disabled={loading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {loading && <p className="text-sm text-gray-500 mt-2">Loading...</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Bank Statement Rows */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Bank Statement</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bankRows.map((bankRow) => {
              const match = matches.find(m => m.bankRow.id === bankRow.id);
              const isSelected = selectedBankRow === bankRow.id;
              
              return (
                <div
                  key={bankRow.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : match?.suggestedId 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBankRow(isSelected ? null : bankRow.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{bankRow.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(bankRow.date)}</p>
                      {match?.suggestedId && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Matched (Confidence: {match.confidence})
                        </p>
                      )}
                    </div>
                    <p className={`font-semibold ${
                      bankRow.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(bankRow.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Side - Uncleared Ledger Entries */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Uncleared Ledger Entries</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getUnmatchedLedgerEntries().map((entry) => {
              const isSelected = selectedLedgerEntry === entry.id;
              
              return (
                <div
                  key={entry.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLedgerEntry(isSelected ? null : entry.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(entry.date)}</p>
                    </div>
                    <p className={`font-semibold ${
                      entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(entry.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Match Action */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleMatch}
          disabled={!selectedBankRow || !selectedLedgerEntry}
          className="px-8 py-2"
        >
          Match Selected Items
        </Button>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-600">Bank Rows</h3>
          <p className="text-2xl font-bold">{bankRows.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-gray-600">Matched</h3>
          <p className="text-2xl font-bold text-green-600">
            {matches.filter(m => m.suggestedId).length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-gray-600">Unmatched</h3>
          <p className="text-2xl font-bold text-orange-600">
            {getUnmatchedLedgerEntries().length}
          </p>
        </Card>
      </div>
    </div>
  );
}
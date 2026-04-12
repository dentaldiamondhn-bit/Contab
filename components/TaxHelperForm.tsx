'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JournalEntry {
  id?: string;
  accountId: string;
  amount: number;
  description?: string;
  taxable?: boolean;
  taxEntryId?: string;
}

interface TaxableEntry {
  entry: JournalEntry;
  taxAmount?: number;
  taxConfig?: {
    id: string;
    name: string;
    rate: number;
    account: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface TaxHelperResult {
  entries: JournalEntry[];
  taxableEntries: TaxableEntry[];
  totalTaxAmount: number;
  summary: {
    subtotal: number;
    totalTax: number;
    total: number;
  };
}

interface TaxHelperFormProps {
  onTransactionCreate?: (result: TaxHelperResult) => void;
}

export default function TaxHelperForm({ onTransactionCreate }: TaxHelperFormProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([
    { accountId: '', amount: 0, description: '', taxable: false }
  ]);
  const [description, setDescription] = useState('');
  const [taxResult, setTaxResult] = useState<TaxHelperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const addEntry = () => {
    setEntries([...entries, { accountId: '', amount: 0, description: '', taxable: false }]);
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
    processTaxEntries(newEntries);
  };

  const updateEntry = (index: number, field: keyof JournalEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
    
    // If toggling taxable status, reprocess tax
    if (field === 'taxable') {
      processTaxEntries(newEntries);
    }
  };

  const processTaxEntries = async (entriesToProcess?: JournalEntry[]) => {
    const entriesToUse = entriesToProcess || entries;
    
    // Only process if we have at least one entry with an amount
    const hasValidEntries = entriesToUse.some(entry => entry.accountId && entry.amount !== 0);
    if (!hasValidEntries) {
      setTaxResult(null);
      return;
    }

    try {
      const response = await fetch('/api/tax-helper/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: entriesToUse,
          description: description || undefined
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTaxResult(result.data);
      }
    } catch (error) {
      console.error('Error processing tax:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taxResult) {
      alert('Please add at least one valid entry');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/tax-helper/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: taxResult.entries,
          description: description || 'Transaction with tax',
          date: new Date().toISOString().split('T')[0]
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Transaction created successfully!');
        onTransactionCreate?.(taxResult);
        // Reset form
        setEntries([{ accountId: '', amount: 0, description: '', taxable: false }]);
        setDescription('');
        setTaxResult(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Helper - Automatic Tax Calculation</CardTitle>
          <p className="text-gray-600">
            Toggle the "Taxable" switch on any line to automatically calculate and add ISV tax entries.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter transaction description (helps auto-categorize tax)"
              />
            </div>

            {/* Journal Entries */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Journal Entries</h3>
                <Button type="button" onClick={addEntry} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Add Entry
                </Button>
              </div>

              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Account Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account*
                        </label>
                        <select
                          value={entry.accountId}
                          onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount (L.)*
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.amount / 100}
                          onChange={(e) => updateEntry(index, 'amount', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) => updateEntry(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Entry description"
                        />
                      </div>

                      {/* Taxable Switch & Actions */}
                      <div className="flex items-end space-x-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`taxable-${index}`}
                            checked={entry.taxable || false}
                            onChange={(e) => updateEntry(index, 'taxable', e.target.checked)}
                            className="rounded"
                          />
                          <label htmlFor={`taxable-${index}`} className="text-sm font-medium text-gray-700">
                            Taxable
                          </label>
                        </div>
                        
                        {entries.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeEntry(index)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax Calculation Result */}
            {taxResult && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Tax Calculation Result</h3>
                
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-sm text-gray-600">Subtotal</div>
                    <div className="text-lg font-semibold">{formatCurrency(taxResult.summary.subtotal)}</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-sm text-gray-600">Total Tax</div>
                    <div className="text-lg font-semibold text-blue-600">{formatCurrency(taxResult.summary.totalTax)}</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-lg font-semibold">{formatCurrency(taxResult.summary.total)}</div>
                  </div>
                </div>

                {/* Processed Entries */}
                <div>
                  <h4 className="font-semibold mb-2">Generated Journal Entries:</h4>
                  <div className="space-y-1 text-sm">
                    {taxResult.entries.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{entry.description || 'Entry'}</span>
                          {entry.taxEntryId && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Tax Entry</span>
                          )}
                        </div>
                        <span className={entry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.amount > 0 ? 'Debit' : 'Credit'}: {formatCurrency(Math.abs(entry.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Taxable Items Detail */}
                {taxResult.taxableEntries.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Taxable Items:</h4>
                    <div className="space-y-1 text-sm">
                      {taxResult.taxableEntries.map((taxable, index) => (
                        <div key={index} className="flex justify-between p-2 bg-yellow-50 rounded border">
                          <span>{taxable.entry.description || 'Taxable entry'}</span>
                          <span className="text-blue-600">
                            Tax: {formatCurrency(taxable.taxAmount || 0)} ({(taxable.taxConfig?.rate || 0) * 100}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !taxResult}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Transaction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

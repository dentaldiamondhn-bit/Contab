'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, getCurrencySymbol, convertCurrency, getExchangeRate } from '@/lib/services/multi-currency';

interface TransactionEntry {
  accountId: string;
  amount: string;
  description: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function MultiCurrencyTransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState<'HNL' | 'USD'>('HNL');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<TransactionEntry[]>([
    { accountId: '', amount: '', description: '' },
    { accountId: '', amount: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    updateExchangeRate();
  }, [currency]);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const accountList = await response.json();
        setAccounts(accountList);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const updateExchangeRate = async () => {
    if (currency === 'HNL') {
      setExchangeRate(1);
      return;
    }
    
    try {
      const rate = await getExchangeRate(currency, 'HNL');
      setExchangeRate(rate);
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      setExchangeRate(1);
    }
  };

  const addEntry = () => {
    setEntries([...entries, { accountId: '', amount: '', description: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof TransactionEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const calculateTotals = () => {
    const totalOriginal = entries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return sum + amount;
    }, 0);

    const totalFunctional = totalOriginal * exchangeRate;

    return {
      original: totalOriginal,
      functional: totalFunctional
    };
  };

  const validateTransaction = () => {
    // Check if all required fields are filled
    for (const entry of entries) {
      if (!entry.accountId || !entry.amount) {
        return 'Please fill in all account and amount fields';
      }
    }

    // Check if transaction balances (sum should be 0)
    const total = entries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return sum + amount;
    }, 0);

    if (Math.abs(total) > 0.01) {
      return `Transaction must balance (current total: ${formatCurrency(Math.round(total * 100), currency)})`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateTransaction();
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        description,
        reference: reference || undefined,
        currency,
        date: new Date(date),
        entries: entries.map(entry => ({
          accountId: entry.accountId,
          amount: Math.round(parseFloat(entry.amount) * 100), // Convert to cents
          description: entry.description
        }))
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        alert('Transaction created successfully');
        // Reset form
        setDescription('');
        setReference('');
        setEntries([
          { accountId: '', amount: '', description: '' },
          { accountId: '', amount: '', description: '' }
        ]);
      } else {
        const error = await response.json();
        alert(error.message || 'Error creating transaction');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Multi-Currency Transaction</h1>
        <p className="text-gray-600">
          Create transactions in both HNL and USD with automatic conversion
        </p>
      </div>

      <Card className="p-6">
        {/* Transaction Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'HNL' | 'USD')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="HNL">Honduran Lempira (HNL)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exchange Rate (to HNL)
            </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={currency === 'HNL'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice #, Receipt #"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Transaction description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Transaction Entries */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Journal Entries</h3>
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    value={entry.accountId}
                    onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ({getCurrencySymbol(currency)})
                  </label>
                  <input
                    type="number"
                    value={entry.amount}
                    onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateEntry(index, 'description', e.target.value)}
                    placeholder="Entry description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length <= 2}
                  className="px-3 py-2"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addEntry}
            className="mt-3"
          >
            Add Entry
          </Button>
        </div>

        {/* Totals Display */}
        <Card className="mb-6 p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Transaction Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600">Total ({currency})</h4>
              <p className="text-xl font-bold">
                {formatCurrency(Math.round(totals.original * 100), currency)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600">Total (HNL)</h4>
              <p className="text-xl font-bold">
                {formatCurrency(Math.round(totals.functional * 100), 'HNL')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600">Balance</h4>
              <p className={`text-xl font-bold ${
                Math.abs(totals.original) < 0.01 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.round(totals.original * 100), currency)}
              </p>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8"
          >
            {loading ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

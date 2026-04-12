'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Account {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  taxConfig: {
    id: string;
    name: string;
    rate: number;
    account: {
      id: string;
      name: string;
      code: string;
    };
  };
  journalEntries: Array<{
    accountId: string;
    amount: number;
    description: string;
  }>;
}

export default function PatientBillingForm() {
  const [subtotal, setSubtotal] = useState('');
  const [patientName, setPatientName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenueAccounts, setRevenueAccounts] = useState<Account[]>([]);
  const [receivableAccounts, setReceivableAccounts] = useState<Account[]>([]);
  const [selectedRevenueAccount, setSelectedRevenueAccount] = useState('');
  const [selectedReceivableAccount, setSelectedReceivableAccount] = useState('');
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/patient-billing');
      const data = await response.json();
      setRevenueAccounts(data.revenueAccounts);
      setReceivableAccounts(data.receivableAccounts);
      
      // Set default selections
      if (data.revenueAccounts.length > 0) {
        setSelectedRevenueAccount(data.revenueAccounts[0].id);
      }
      if (data.receivableAccounts.length > 0) {
        setSelectedReceivableAccount(data.receivableAccounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubtotalChange = async (value: string) => {
    setSubtotal(value);
    
    if (value && parseFloat(value) > 0) {
      setPreviewLoading(true);
      try {
        const subtotalCents = Math.round(parseFloat(value) * 100);
        const response = await fetch('/api/patient-billing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'preview',
            subtotal: subtotalCents,
            description: description || undefined
          }),
        });

        const result = await response.json();
        if (result.success) {
          setTaxCalculation(result.calculation);
        }
      } catch (error) {
        console.error('Error previewing tax:', error);
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setTaxCalculation(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subtotal || parseFloat(subtotal) <= 0) {
      alert('Please enter a valid subtotal');
      return;
    }

    if (!selectedRevenueAccount || !selectedReceivableAccount) {
      alert('Please select both revenue and receivable accounts');
      return;
    }

    setLoading(true);
    
    try {
      const subtotalCents = Math.round(parseFloat(subtotal) * 100);
      const response = await fetch('/api/patient-billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subtotal: subtotalCents,
          revenueAccountId: selectedRevenueAccount,
          receivableAccountId: selectedReceivableAccount,
          patientName: patientName || undefined,
          description: description || undefined,
          date: date
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Patient bill created successfully!');
        // Reset form
        setSubtotal('');
        setPatientName('');
        setDescription('');
        setTaxCalculation(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating patient bill:', error);
      alert('Failed to create patient bill');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Billing - Automated Tax Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name (Optional)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter patient name"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Service Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Description (Optional - helps auto-categorize tax)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Consulta médica, Procedimiento, etc."
              />
            </div>

            {/* Subtotal Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal (L.)*
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => handleSubtotalChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Account Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revenue Account*
                </label>
                <select
                  value={selectedRevenueAccount}
                  onChange={(e) => setSelectedRevenueAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {revenueAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receivable Account*
                </label>
                <select
                  value={selectedReceivableAccount}
                  onChange={(e) => setSelectedReceivableAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {receivableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tax Calculation Preview */}
            {taxCalculation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Tax Calculation Preview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(taxCalculation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ISV ({(taxCalculation.taxRate * 100).toFixed(1)}%):</span>
                    <span>{formatCurrency(taxCalculation.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(taxCalculation.total)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Generated Journal Entries:</h4>
                  <div className="space-y-1 text-sm">
                    {taxCalculation.journalEntries.map((entry, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{entry.description}</span>
                        <span className={entry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.amount > 0 ? 'Debit' : 'Credit'}: {formatCurrency(Math.abs(entry.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || previewLoading || !subtotal || parseFloat(subtotal) <= 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Patient Bill'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface TaxableSwitchProps {
  checked: boolean;
  onToggle: (taxable: boolean) => void;
  amount: number; // in cents
  description?: string;
  disabled?: boolean;
  showTaxPreview?: boolean;
}

interface TaxPreview {
  taxAmount: number;
  taxRate: number;
  taxConfig: {
    name: string;
    rate: number;
    account: {
      name: string;
      code: string;
    };
  };
}

export default function TaxableSwitch({
  checked,
  onToggle,
  amount,
  description,
  disabled = false,
  showTaxPreview = true
}: TaxableSwitchProps) {
  const [taxPreview, setTaxPreview] = useState<TaxPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checked && amount > 0 && showTaxPreview) {
      fetchTaxPreview();
    } else {
      setTaxPreview(null);
    }
  }, [checked, amount, description]);

  const fetchTaxPreview = async () => {
    if (amount <= 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/tax-helper/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTaxPreview(result.data);
      }
    } catch (error) {
      console.error('Error fetching tax preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={disabled}
          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
        />
        <label className="text-sm font-medium text-gray-700">
          Taxable
        </label>
      </div>

      {showTaxPreview && checked && (
        <div className="flex items-center space-x-2">
          {loading ? (
            <span className="text-sm text-gray-500">Calculating...</span>
          ) : taxPreview ? (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">
                Tax: {formatCurrency(taxPreview.taxAmount)} ({(taxPreview.taxRate * 100).toFixed(1)}%)
              </span>
              <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">
                {taxPreview.taxConfig.account.code} - {taxPreview.taxConfig.account.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">No tax config available</span>
          )}
        </div>
      )}
    </div>
  );
}

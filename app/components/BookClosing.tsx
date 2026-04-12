'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { closeBooks, getClosedPeriods, isPeriodClosed } from '@/lib/reports/trial-balance';

interface ClosedPeriod {
  id: string;
  period: string;
  periodType: string;
  closedAt: Date;
  closedBy: string;
  description?: string;
}

export default function BookClosing() {
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState('');
  const [closingType, setClosingType] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [description, setDescription] = useState('');
  const [currentUser] = useState('Current User'); // In real app, get from auth

  useEffect(() => {
    loadClosedPeriods();
  }, []);

  const loadClosedPeriods = async () => {
    try {
      const periods = await getClosedPeriods();
      setClosedPeriods(periods);
    } catch (error) {
      console.error('Error loading closed periods:', error);
    }
  };

  const handleCloseBooks = async () => {
    if (!closingPeriod) {
      alert('Please select a period to close');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to close the books for ${closingPeriod} (${closingType})?\n\n` +
      'This action cannot be undone. No further changes will be allowed for this period.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await closeBooks(closingPeriod, closingType, currentUser, description);
      
      if (result.success) {
        alert(`Books for ${closingPeriod} (${closingType}) have been successfully closed.`);
        setClosingPeriod('');
        setDescription('');
        await loadClosedPeriods();
      } else {
        alert(result.error || 'Error closing books');
      }
    } catch (error) {
      console.error('Error closing books:', error);
      alert('Error closing books');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getCurrentPeriods = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    return {
      currentMonth: `${currentYear}-${currentMonth}`,
      currentYear: currentYear.toString(),
      lastMonth: now.getMonth() === 0 
        ? `${currentYear - 1}-12` 
        : `${currentYear}-${String(now.getMonth()).padStart(2, '0')}`,
      lastYear: (currentYear - 1).toString()
    };
  };

  const { currentMonth, currentYear, lastMonth, lastYear } = getCurrentPeriods();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Closing the Books (Cierre Fiscal)</h1>
        <p className="text-gray-600">
          Lock fiscal periods to prevent changes after tax filing
        </p>
      </div>

      {/* Close Books Form */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Close Period</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Type
            </label>
            <select
              value={closingType}
              onChange={(e) => setClosingType(e.target.value as 'MONTHLY' | 'YEARLY')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <input
              type={closingType === 'MONTHLY' ? 'month' : 'number'}
              value={closingPeriod}
              onChange={(e) => setClosingPeriod(e.target.value)}
              placeholder={closingType === 'MONTHLY' ? 'YYYY-MM' : 'YYYY'}
              min={closingType === 'YEARLY' ? '2020' : undefined}
              max={closingType === 'YEARLY' ? new Date().getFullYear() : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes about this closing period..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Quick Select:</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClosingType('MONTHLY');
                  setClosingPeriod(currentMonth);
                }}
              >
                Current Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClosingType('MONTHLY');
                  setClosingPeriod(lastMonth);
                }}
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClosingType('YEARLY');
                  setClosingPeriod(currentYear);
                }}
              >
                Current Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClosingType('YEARLY');
                  setClosingPeriod(lastYear);
                }}
              >
                Last Year
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleCloseBooks}
            disabled={loading || !closingPeriod}
            className="px-6"
          >
            {loading ? 'Closing...' : 'Close Books'}
          </Button>
        </div>
      </Card>

      {/* Warning Card */}
      <Card className="mb-6 p-4 border-yellow-500 bg-yellow-50">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-yellow-600 text-xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important Warning</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Closing the books is irreversible</li>
                <li>No transactions can be modified for closed periods</li>
                <li>Ensure all reconciliations are complete before closing</li>
                <li>Verify trial balance is balanced before closing</li>
                <li>Backup your data before closing any period</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Closed Periods List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Closed Periods</h2>
        
        {closedPeriods.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No periods have been closed yet
          </p>
        ) : (
          <div className="space-y-3">
            {closedPeriods.map((period) => (
              <div
                key={period.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {period.period} ({period.periodType})
                    </h3>
                    <p className="text-sm text-gray-600">
                      Closed by {period.closedBy} on {formatDate(period.closedAt)}
                    </p>
                    {period.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {period.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      LOCKED
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

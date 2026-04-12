'use client';

import { useState, useEffect } from 'react';
import { TaxConfigWithAccount } from '@/lib/services/tax-config';

interface TaxConfigManagerProps {
  onTaxConfigSelect?: (config: TaxConfigWithAccount) => void;
}

export default function TaxConfigManager({ onTaxConfigSelect }: TaxConfigManagerProps) {
  const [taxConfigs, setTaxConfigs] = useState<TaxConfigWithAccount[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    accountId: '',
    isActive: true
  });

  useEffect(() => {
    fetchTaxConfigs();
    fetchLiabilityAccounts();
  }, []);

  const fetchTaxConfigs = async () => {
    try {
      const response = await fetch('/api/tax-config');
      const data = await response.json();
      setTaxConfigs(data);
    } catch (error) {
      console.error('Error fetching tax configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiabilityAccounts = async () => {
    try {
      const response = await fetch('/api/tax-config/liability-accounts');
      const data = await response.json();
      setLiabilityAccounts(data);
    } catch (error) {
      console.error('Error fetching liability accounts:', error);
    }
  };

  const handleCreateTaxConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/tax-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rate: parseFloat(formData.rate)
        }),
      });

      if (response.ok) {
        const newConfig = await response.json();
        setTaxConfigs([...taxConfigs, newConfig]);
        setFormData({ name: '', rate: '', accountId: '', isActive: true });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating tax config:', error);
    }
  };

  const handleDeleteTaxConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-config/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTaxConfigs(taxConfigs.filter(config => config.id !== id));
      }
    } catch (error) {
      console.error('Error deleting tax config:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading tax configurations...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tax Configurations</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Tax Config
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded-md">
          <h3 className="text-lg font-semibold mb-4">Create New Tax Configuration</h3>
          <form onSubmit={handleCreateTaxConfig} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ISV 15%"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.15"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liability Account
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an account</option>
                {liabilityAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Rate</th>
              <th className="text-left p-2">Account</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxConfigs.map((config) => (
              <tr key={config.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{config.name}</td>
                <td className="p-2">{(config.rate * 100).toFixed(1)}%</td>
                <td className="p-2">
                  {config.account.code} - {config.account.name}
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      config.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => onTaxConfigSelect?.(config)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-sm mr-2 hover:bg-blue-600"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleDeleteTaxConfig(config.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

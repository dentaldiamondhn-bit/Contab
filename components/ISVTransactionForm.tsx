'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator, Receipt, AlertCircle } from 'lucide-react';

interface ISVCalculation {
  subtotal: number;
  isvAmount: number;
  isvRate: number;
  total: number;
  category: {
    id: string;
    name: string;
    rate: string;
    description: string;
  };
  formattedAmounts?: {
    subtotal: string;
    isvAmount: string;
    total: string;
  };
}

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface ISVTransactionFormProps {
  onSuccess?: (transaction: any) => void;
  onError?: (error: string) => void;
}

export default function ISVTransactionForm({ onSuccess, onError }: ISVTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerInfo, setCustomerInfo] = useState('');
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('standard');
  
  // ISV calculation result
  const [calculation, setCalculation] = useState<ISVCalculation | null>(null);
  
  // Account selection
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mainAccount, setMainAccount] = useState('');
  const [salesAccount, setSalesAccount] = useState('');
  
  // ISV categories
  const [categories, setCategories] = useState([
    { id: 'standard', name: 'ISV Estándar (15%)', rate: 0.15, description: 'Aplicable a la mayoría de bienes y servicios' },
    { id: 'special', name: 'ISV Especial (18%)', rate: 0.18, description: 'Aplicable a alcohol y tabaco' }
  ]);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (amount && description && autoCategorize) {
      calculateISV();
    }
  }, [amount, description, autoCategorize]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      setAccounts(data);
      
      // Set default accounts
      const cashAccount = data.find((acc: Account) => acc.type === 'ASSET' && acc.name.toLowerCase().includes('caja'));
      const salesAccount = data.find((acc: Account) => acc.type === 'REVENUE' && acc.name.toLowerCase().includes('venta'));
      
      if (cashAccount) setMainAccount(cashAccount.id);
      if (salesAccount) setSalesAccount(salesAccount.id);
    } catch (error) {
      setError('Failed to fetch accounts');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/isv/calculate');
      const data = await response.json();
      setCategories(data.categories);
      if (data.suggestedCategory) {
        setSelectedCategory(data.suggestedCategory);
      }
    } catch (error) {
      console.error('Failed to fetch ISV categories:', error);
    }
  };

  const calculateISV = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/isv/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryId: autoCategorize ? undefined : selectedCategory,
          description,
          autoCategorize
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate ISV');
      }

      setCalculation(data.calculation);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to calculate ISV');
      setCalculation(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!calculation || !mainAccount) {
      setError('Please complete all required fields and calculate ISV');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/isv/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionData: {
            date,
            description,
            voucherType: 'INGRESO',
            customerInfo
          },
          isvDetails: {
            amount: parseFloat(amount),
            categoryId: calculation.category.id,
            description,
            autoCategorize
          },
          mainAccountId: mainAccount,
          salesAccountId: salesAccount || undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ISV transaction');
      }

      // Reset form
      setAmount('');
      setDescription('');
      setCustomerInfo('');
      setCalculation(null);
      
      onSuccess?.(data.transaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ISV transaction';
      setError(errorMessage);
      onError?.(errorMessage);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Transacción con ISV</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Cliente (Opcional)</label>
                <Input
                  type="text"
                  value={customerInfo}
                  onChange={(e) => setCustomerInfo(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Venta de mercancía, Servicios profesionales, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monto (Lps)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* ISV Configuration */}
            <div className="border rounded p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Configuración de ISV</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoCategorize"
                    checked={autoCategorize}
                    onChange={(e) => setAutoCategorize(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoCategorize" className="text-sm">
                    Auto-categorizar
                  </label>
                </div>
              </div>

              {!autoCategorize && (
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría de ISV</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {autoCategorize && description && (
                <div className="text-sm text-gray-600">
                  Categoría sugerida: <Badge variant="outline">
                    {categories.find(cat => cat.id === selectedCategory)?.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* ISV Calculation Result */}
            {calculation && (
              <div className="border rounded p-4 bg-blue-50">
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <Calculator className="h-4 w-4" />
                  <span>Cálculo de ISV</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ISV ({calculation.isvRate * 100}%):</span>
                    <span className="font-medium text-blue-600">{formatCurrency(calculation.isvAmount)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculation.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cuenta Principal (Caja/Banco)</label>
                <select
                  value={mainAccount}
                  onChange={(e) => setMainAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts
                    .filter(acc => acc.type === 'ASSET')
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cuenta de Ventas (Opcional)</label>
                <select
                  value={salesAccount}
                  onChange={(e) => setSalesAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts
                    .filter(acc => acc.type === 'REVENUE')
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !calculation || !mainAccount}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Crear Transacción con ISV
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

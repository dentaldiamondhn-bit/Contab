'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
  level: number;
  is_selectable: boolean;
  is_active: boolean;
  opening_balance: number;
  opening_balance_date: string | null;
  balance: number;
}

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  REVENUE: 'Ingresos',
  EXPENSE: 'Gastos',
};

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  REVENUE: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
};

function formatCurrency(amountInCents: number): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(amount);
}

function parseCurrencyInput(value: string): number {
  // Remove formatting and parse as number, then convert to cents
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned) || 0;
  return Math.round(num * 100);
}

export default function OpeningBalancesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterHasBalance, setFilterHasBalance] = useState(false);
  const [editingBalances, setEditingBalances] = useState<Record<string, number>>({});
  const [editingDates, setEditingDates] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [companyId]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/opening-balances?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
    setLoading(false);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (!acc.code.toLowerCase().includes(q) && !acc.name.toLowerCase().includes(q)) {
          return false;
        }
      }
      // Type filter
      if (filterType !== 'all' && acc.type !== filterType) {
        return false;
      }
      // Has balance filter
      if (filterHasBalance && (editingBalances[acc.id] ?? acc.opening_balance) === 0) {
        return false;
      }
      return true;
    });
  }, [accounts, search, filterType, filterHasBalance, editingBalances]);

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const acc of filteredAccounts) {
      if (!groups[acc.type]) groups[acc.type] = [];
      groups[acc.type].push(acc);
    }
    return groups;
  }, [filteredAccounts]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const acc of filteredAccounts) {
      const bal = editingBalances[acc.id] ?? acc.opening_balance;
      if (bal > 0) totalDebit += bal;
      else if (bal < 0) totalCredit += Math.abs(bal);
    }
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  }, [filteredAccounts, editingBalances]);

  const handleBalanceChange = (accountId: string, value: string) => {
    const cents = parseCurrencyInput(value);
    setEditingBalances(prev => ({ ...prev, [accountId]: cents }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleDateChange = (accountId: string, value: string) => {
    setEditingDates(prev => ({ ...prev, [accountId]: value }));
    setHasChanges(true);
  };

  const calculateFromTrialBalance = async () => {
    setCalculating(true);
    setSaveMessage(null);
    try {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      const endOfYesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
      
      const res = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startOfYear}T00:00:00Z&endDate=${endOfYesterday}T23:59:59Z`
      );
      
      if (!res.ok) {
        setSaveMessage({ type: 'error', text: 'Error al obtener datos del balance' });
        return;
      }
      
      const data = await res.json();
      const newBalances: Record<string, number> = {};
      const newDates: Record<string, string> = {};
      let matched = 0;
      const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
      
      for (const item of data) {
        const account = item.account || {};
        const code = account.code || item.code || '';
        const balance = item.balance || 0;
        
        if (balance === 0) continue;
        
        const matchedAccount = accounts.find(a => 
          a.code === code || 
          a.code === code.replace('.', '-') ||
          a.code.replace('-', '.') === code ||
          a.code.startsWith(code + '.') ||
          a.code.startsWith(code + '-') ||
          code.startsWith(a.code + '.') ||
          code.startsWith(a.code + '-')
        );
        if (matchedAccount) {
          newBalances[matchedAccount.id] = balance;
          newDates[matchedAccount.id] = yesterday;
          matched++;
        }
      }
      
      if (matched === 0) {
        setSaveMessage({ type: 'error', text: 'No se encontraron cuentas con movimientos. Verificá que las cuentas del catálogo coincidan con las del libro diario.' });
      } else {
        setEditingBalances(prev => ({ ...prev, ...newBalances }));
        setEditingDates(prev => ({ ...prev, ...newDates }));
        setHasChanges(true);
        setSaveMessage({ type: 'success', text: `${matched} cuenta(s) calculada(s) desde movimientos. Revisá los montos y hacé clic en Guardar.` });
      }
    } catch (error) {
      console.error('Error calculating from trial balance:', error);
      setSaveMessage({ type: 'error', text: 'Error de conexión al calcular' });
    }
    setCalculating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const balances = Object.entries(editingBalances).map(([account_id, opening_balance]) => ({
      account_id,
      opening_balance,
      opening_balance_date: editingDates[account_id] || new Date().toISOString().split('T')[0],
    }));

    // Also save accounts with 0 balance that were explicitly edited
    for (const acc of accounts) {
      if (editingBalances[acc.id] !== undefined && !balances.find(b => b.account_id === acc.id)) {
        balances.push({
          account_id: acc.id,
          opening_balance: editingBalances[acc.id],
          opening_balance_date: editingDates[acc.id] || new Date().toISOString().split('T')[0],
        });
      }
    }

    try {
      const res = await fetch(`/api/accounting/opening-balances?tenantId=${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': companyId,
        },
        body: JSON.stringify({ balances }),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: `${balances.length} cuentas actualizadas exitosamente` });
        setHasChanges(false);
        // Reload to get updated data
        await loadAccounts();
        setEditingBalances({});
        setEditingDates({});
      } else {
        setSaveMessage({ type: 'error', text: 'Error al guardar' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error de conexión' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}/accounting`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Balances de Apertura</h1>
            <p className="text-gray-600">
              Registra los saldos iniciales de cada cuenta al inicio del período contable
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={calculateFromTrialBalance}
            disabled={calculating}
          >
            {calculating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Calcular desde Movimientos
          </Button>
          <Button
            variant="outline"
            onClick={loadAccounts}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {saveMessage.text}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-cyan-200 bg-cyan-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-cyan-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-cyan-800">¿Qué son los Balances de Apertura?</h4>
              <p className="text-sm text-cyan-700 mt-1">
                Los balances de apertura representan los saldos iniciales de tus cuentas al comenzar a usar el sistema.
                Si tu empresa tiene operaciones anteriores, ingresa aquí los saldos de cada cuenta al cierre del período anterior.
                Los montos se ingresan en lempiras (HNL). Los saldos a <strong>Debe</strong> son positivos, los saldos a <strong>Haber</strong> son negativos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debe</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totalDebit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Haber</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalCredit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diferencia</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.difference === 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {formatCurrency(Math.abs(totals.difference))}
            </div>
            {totals.difference !== 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {totals.difference > 0 ? 'Falta Debe' : 'Falta Haber'}
              </p>
            )}
            {totals.difference === 0 && totals.totalDebit > 0 && (
              <p className="text-xs text-green-600 mt-1">Cuadrado ✓</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas con Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAccounts.filter(a => (editingBalances[a.id] ?? a.opening_balance) !== 0).length}
              <span className="text-sm font-normal text-gray-500"> / {filteredAccounts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Todos los tipos</option>
              <option value="ASSET">Activo</option>
              <option value="LIABILITY">Pasivo</option>
              <option value="EQUITY">Patrimonio</option>
              <option value="REVENUE">Ingresos</option>
              <option value="EXPENSE">Gastos</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filterHasBalance}
                onChange={(e) => setFilterHasBalance(e.target.checked)}
                className="rounded"
              />
              Solo con saldo
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table by Type */}
      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Badge>
                <span className="text-gray-500 text-sm">({typeAccounts.length} cuentas)</span>
              </CardTitle>
              <div className="text-sm text-gray-500">
                Subtotal: {formatCurrency(
                  typeAccounts.reduce((sum, acc) => {
                    const bal = editingBalances[acc.id] ?? acc.opening_balance;
                    return sum + (bal > 0 ? bal : 0);
                  }, 0)
                )} / {formatCurrency(
                  typeAccounts.reduce((sum, acc) => {
                    const bal = editingBalances[acc.id] ?? acc.opening_balance;
                    return sum + (bal < 0 ? Math.abs(bal) : 0);
                  }, 0)
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 w-24">Código</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 w-40">Saldo Apertura</th>
                    <th className="w-36 py-2 px-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 w-36">Saldo Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {typeAccounts.map((acc) => {
                    const currentBalance = editingBalances[acc.id] ?? acc.opening_balance;
                    const isEditing = acc.id in editingBalances;
                    return (
                      <tr
                        key={acc.id}
                        className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-yellow-50' : ''}`}
                        style={{ paddingLeft: `${acc.level * 16}px` }}
                      >
                        <td className="py-2 px-3 font-mono text-gray-700">{acc.code}</td>
                        <td className="py-2 px-3">
                          <span style={{ paddingLeft: `${(acc.level - 1) * 12}px` }}>
                            {acc.name}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Input
                            type="text"
                            value={currentBalance === 0 ? '' : (currentBalance / 100).toString()}
                            onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                            placeholder="0.00"
                            className="w-36 text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="date"
                            value={editingDates[acc.id] || acc.opening_balance_date || ''}
                            onChange={(e) => handleDateChange(acc.id, e.target.value)}
                            className="w-36"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-gray-500">
                          {formatCurrency(acc.balance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No se encontraron cuentas con los filtros seleccionados
          </CardContent>
        </Card>
      )}
    </div>
  );
}

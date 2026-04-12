'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  identifier: string;
  accountCode: string;
  accountName: string;
  currency: 'HNL' | 'USD';
  parentAccount: string;
  isActive: boolean;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    description: string;
  };
}

export default function BankAccountManager() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCurrency, setNewBankCurrency] = useState<'HNL' | 'USD'>('HNL');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bank-accounts');
      const result = await response.json();
      
      if (result.success) {
        setBanks(result.accounts);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'seed' }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchBankAccounts();
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error seeding banks:', error);
      alert('❌ Error al crear bancos por defecto');
    } finally {
      setLoading(false);
    }
  };

  const createNewBank = async () => {
    if (!newBankName.trim()) {
      alert('⚠️ Por favor ingrese el nombre del banco');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          bankName: newBankName.trim(),
          currency: newBankCurrency
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchBankAccounts();
        setNewBankName('');
        alert(`✅ Cuenta bancaria creada: ${result.account.name}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating bank:', error);
      alert('❌ Error al crear la cuenta bancaria');
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (currency: string) => {
    return currency === 'HNL' ? 'Lempiras' : 'Dólares';
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'HNL' ? 'L.' : '$';
  };

  const filteredBanks = banks.filter(bank => 
    showInactive ? true : bank.isActive
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-900">Administración de Cuentas Bancarias</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center space-x-2"
          >
            {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showInactive ? 'Ocultar Inactivas' : 'Mostrar Inactivas'}</span>
          </Button>
          <Button
            onClick={fetchBankAccounts}
            disabled={loading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seed Default Banks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bancos de Honduras por Defecto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Crear automáticamente las cuentas bancarias para los principales bancos de Honduras:
            </p>
            <div className="text-xs text-slate-500 mb-4 space-y-1">
              <div>• Banco Atlántida (BANTLAN)</div>
              <div>• Banco de Occidente (OCCIDENTE)</div>
              <div>• BAC Credomatic (BAC)</div>
              <div>• Banco Ficohsa (FICOHSA)</div>
              <div>• Banpaís (BANPAIS)</div>
              <div>• Banco Davivienda (DAVIVIENDA)</div>
              <div>• Banco Promerica (PROMERICA)</div>
              <div>• Banrural (BANRURAL)</div>
              <div>• Banco Lafise (LAFISE)</div>
            </div>
            <Button 
              onClick={seedDefaultBanks}
              disabled={loading}
              className="w-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Crear Cuentas por Defecto
            </Button>
          </CardContent>
        </Card>

        {/* Create New Bank */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crear Nueva Cuenta Bancaria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankName">Nombre del Banco</Label>
                <Input
                  id="bankName"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Ej: Banco Nacional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select value={newBankCurrency} onValueChange={(value: 'HNL' | 'USD') => setNewBankCurrency(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HNL">Lempiras (HNL)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={createNewBank}
                disabled={isCreating || !newBankName.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? 'Creando...' : 'Crear Cuenta'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cuentas Bancarias Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando cuentas...</span>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No hay cuentas bancarias configuradas</p>
              <p className="text-sm text-slate-400 mt-2">
                Use las opciones anteriores para crear cuentas bancarias
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBanks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${bank.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-900">{bank.name}</h3>
                        <Badge variant={bank.currency === 'HNL' ? 'default' : 'secondary'}>
                          {getCurrencyIcon(bank.currency)} {formatCurrency(bank.currency)}
                        </Badge>
                        {!bank.isActive && (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Cuenta: <span className="font-mono font-medium">{bank.accountCode}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {bank.account.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {bank.accountName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {bank.parentAccount}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      ID: {bank.identifier}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

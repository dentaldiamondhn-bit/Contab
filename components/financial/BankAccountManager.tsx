"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Calendar
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface BankAccountManagerProps {
  tenantId: string;
}

interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  currency: string;
  currentBalance: number;
  availableBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE';
  amount: number;
  description: string;
  reference: string;
  transactionDate: string;
  createdAt: string;
  bankAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

interface Reconciliation {
  id: string;
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: 'PENDING' | 'MATCHED' | 'DIFFERENCE';
  notes: string;
  createdAt: string;
  bankAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

export default function BankAccountManager({ tenantId }: BankAccountManagerProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showReconciliationForm, setShowReconciliationForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    accountNumber: "",
    accountName: "",
    bankName: "",
    accountType: 'CHECKING' as 'CHECKING' | 'SAVINGS' | 'CREDIT',
    currency: "HNL"
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadBankAccounts();
    loadTransactions();
    loadReconciliations();
  }, [tenantId]);

  const loadBankAccounts = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Cargar cuentas bancarias
      const { data, error } = await supabase
        .from('BankAccount')
        .select('*')
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading bank accounts:", error);
      alert("Error al cargar las cuentas bancarias");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // Cargar transacciones bancarias
      const { data, error } = await supabase
        .from('BankTransaction')
        .select(`
          *,
          BankAccount:bankAccount(id, accountName, accountNumber, bankName)
        `)
        .order('transactionDate', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error loading bank transactions:", error);
      alert("Error al cargar las transacciones bancarias");
    }
  };

  const loadReconciliations = async () => {
    try {
      // Cargar conciliaciones bancarias
      const { data, error } = await supabase
        .from('Reconciliation')
        .select(`
          *,
          BankAccount:bankAccount(id, accountName, accountNumber, bankName)
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setReconciliations(data || []);
    } catch (error: any) {
      console.error("Error loading reconciliations:", error);
      alert("Error al cargar las conciliaciones bancarias");
    }
  };

  const saveBankAccount = async () => {
    try {
      if (!accountForm.accountNumber || !accountForm.accountName || !accountForm.bankName) {
        alert("Por favor complete los campos requeridos");
        return;
      }

      const accountData = {
        tenantId,
        accountNumber: accountForm.accountNumber,
        accountName: accountForm.accountName,
        bankName: accountForm.bankName,
        accountType: accountForm.accountType,
        currency: accountForm.currency
      };

      if (editingAccount) {
        // Actualizar cuenta existente
        const { error } = await supabase
          .from('BankAccount')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        alert("Cuenta bancaria actualizada exitosamente");
      } else {
        // Crear nueva cuenta
        const { error } = await supabase
          .from('BankAccount')
          .insert(accountData);

        if (error) throw error;
        alert("Cuenta bancaria creada exitosamente");
      }

      // Resetear formulario
      setAccountForm({
        accountNumber: "",
        accountName: "",
        bankName: "",
        accountType: 'CHECKING',
        currency: "HNL"
      });
      setEditingAccount(null);
      setShowAccountForm(false);
      loadBankAccounts();
    } catch (error: any) {
      console.error("Error saving bank account:", error);
      alert("Error al guardar la cuenta bancaria");
    }
  };

  const processTransaction = async () => {
    try {
      const { bankAccountId, amount, description, transactionType, reference } = transactionForm;
      
      if (!bankAccountId || !amount || amount <= 0) {
        alert("Por favor complete los campos requeridos");
        return;
      }

      // Crear transacción
      const { error } = await supabase
        .from('BankTransaction')
        .insert({
          tenantId,
          bankAccountId,
          amount: Math.round(amount * 100), // Convertir a centavos
          description,
          transactionType,
          reference,
          transactionDate: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Actualizar saldo de la cuenta bancaria
      const account = accounts.find(acc => acc.id === bankAccountId);
      if (account) {
        const newBalance = transactionType === 'DEPOSIT' || transactionType === 'TRANSFER'
          ? account.currentBalance + Math.round(amount * 100)
          : account.currentBalance - Math.round(amount * 100);

        const newAvailableBalance = transactionType === 'DEPOSIT' || transactionType === 'TRANSFER'
          ? account.availableBalance + Math.round(amount * 100)
          : account.availableBalance - Math.round(amount * 100);

        await supabase
          .from('BankAccount')
          .update({
            currentBalance: newBalance,
            availableBalance: newAvailableBalance,
            updatedAt: new Date().toISOString()
          })
          .eq('id', bankAccountId);
      }

      alert("Transacción procesada exitosamente");
      setShowTransactionForm(false);
      loadTransactions();
      loadBankAccounts();
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      alert("Error al procesar la transacción");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Cuenta', 'Banco', 'Tipo', 'Moneda', 'Saldo Actual', 'Saldo Disponible'
    ];
    const rows = accounts.map(account => [
      account.accountNumber,
      account.bankName,
      account.accountType,
      account.currency,
      (account.currentBalance / 100).toFixed(2),
      (account.availableBalance / 100).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cuentas_bancarias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAccounts = accounts.filter(account =>
    account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber.includes(searchTerm) ||
    account.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(account =>
    accountTypeFilter === "all" || account.accountType === accountTypeFilter
  );

  const totalBalance = filteredAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const totalAvailable = filteredAccounts.reduce((sum, account) => sum + account.availableBalance, 0);

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'CHECKING':
        return <Badge variant="outline">Cuenta Corriente</Badge>;
      case 'SAVINGS':
        return <Badge variant="default">Cuenta de Ahorro</Badge>;
      case 'CREDIT':
        return <Badge variant="destructive">Tarjeta de Crédito</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <Badge className="bg-green-100 text-green-800">Depósito</Badge>;
      case 'WITHDRAWAL':
        return <Badge className="bg-red-100 text-red-800">Retiro</Badge>;
      case 'TRANSFER':
        return <Badge className="bg-blue-100 text-blue-800">Transferencia</Badge>;
      case 'FEE':
        return <Badge className="bg-orange-100 text-orange-800">Comisión</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando cuentas bancarias...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            Control Bancario
          </h2>
          <p className="text-gray-600">Gestión de cuentas bancarias y transacciones</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cuenta, banco..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Cuenta</label>
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="CHECKING">Cuenta Corriente</option>
                <option value="SAVINGS">Cuenta de Ahorro</option>
                <option value="CREDIT">Tarjeta de Crédito</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredAccounts.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
      </div>
      <div className="flex space-x-2">
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Lista de Cuentas Bancarias */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas Bancarias</CardTitle>
          <CardDescription>
            Gestión de cuentas bancarias y saldos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número de Cuenta
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre de Cuenta
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banco
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Actual
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Disponible
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron cuentas bancarias
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {account.accountNumber}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">{account.accountName}</div>
                          <div className="text-gray-500 text-xs">
                            {account.currency}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {account.bankName}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        {getAccountTypeBadge(account.accountType)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(account.currentBalance / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(account.availableBalance / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        <div className="flex space-x-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingAccount(account);
                              setAccountForm({
                                accountNumber: account.accountNumber,
                                accountName: account.accountName,
                                bankName: account.bankName,
                                accountType: account.accountType,
                                currency: account.currency
                              });
                              setShowAccountForm(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setShowTransactionForm(account.id)}
                          >
                            Transacción
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Cuenta Bancaria */}
      {showAccountForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingAccount ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</CardTitle>
            <CardDescription>
              {editingAccount ? 'Modifique los datos de la cuenta' : 'Ingrese los datos de la nueva cuenta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número de Cuenta *</Label>
                <Input
                  id="accountNumber"
                  value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                  placeholder="1234-5678-9012"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Nombre de Cuenta *</Label>
                <Input
                  id="accountName"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  placeholder="Cuenta de Ahorro Personal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Banco *</Label>
                <Input
                  id="bankName"
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  placeholder="Banco Atlántida"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Tipo de Cuenta *</Label>
                <Select value={accountForm.accountType} onValueChange={(value: 'CHECKING' | 'SAVINGS' | 'CREDIT') => setAccountForm({ ...accountForm, accountType: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Cuenta Corriente</SelectItem>
                    <SelectItem value="SAVINGS">Cuenta de Ahorro</SelectItem>
                    <SelectItem value="CREDIT">Tarjeta de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select value={accountForm.currency} onValueChange={(value) => setAccountForm({ ...accountForm, currency: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HNL">Lempiras (HNL)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="EUR">Euros (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccountForm(false);
                  setEditingAccount(null);
                  setAccountForm({
                    accountNumber: "",
                    accountName: "",
                    bankName: "",
                    accountType: 'CHECKING',
                    currency: "HNL"
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveBankAccount}>
                {editingAccount ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

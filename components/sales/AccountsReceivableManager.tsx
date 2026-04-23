"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  DollarSign,
  Calendar,
  Search,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface AccountsReceivableProps {
  tenantId: string;
}

interface ReceivableItem {
  id: string;
  customerId: string;
  invoiceId: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: string;
  customer?: {
    name: string;
    rtn: string;
    email?: string;
    phone?: string;
  };
  invoice?: {
    invoiceNumber: string;
    date: string;
    description: string;
  };
}

export default function AccountsReceivableManager({ tenantId }: AccountsReceivableProps) {
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadAccountsReceivable();
  }, [tenantId]);

  const loadAccountsReceivable = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos de cuentas por cobrar con relaciones
      const { data, error } = await supabase
        .from('AccountReceivable')
        .select(`
          *,
          Customer:customer(id, name, rtn, email, phone),
          Invoice:invoice(id, invoiceNumber, date, description)
        `)
        .order('dueDate', { ascending: false });

      if (error) throw error;

      setReceivables(data || []);
    } catch (error: any) {
      console.error("Error loading accounts receivable:", error);
      alert("Error al cargar las cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (receivableId: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    try {
      const receivable = receivables.find(r => r.id === receivableId);
      if (!receivable) return;

      const paymentCents = Math.round(parseFloat(paymentAmount) * 100);
      const newPaidAmount = receivable.paidAmount + paymentCents;
      const newBalance = receivable.amount - newPaidAmount;

      // Actualizar cuenta por cobrar
      const { error } = await (supabase as any)
        .from('AccountReceivable')
        .update({
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          updatedAt: new Date().toISOString()
        })
        .eq('id', receivableId);

      if (error) throw error;

      // Crear transacción de pago
      const { data: transactionData, error: transactionError } = await (supabase as any).rpc('create_accounting_transaction', {
        p_tenant_id: tenantId,
        p_date: new Date().toISOString().split('T')[0],
        p_description: `Pago de factura ${receivable.invoice?.invoiceNumber || ''}`,
        p_voucher_type: 'INGRESO',
        p_voucher_number: Math.floor(Math.random() * 10000),
        p_total_amount: paymentCents,
        p_entries: [
          {
            account_id: '1102', // Cuenta de bancos
            amount: paymentCents,
            description: `Pago de ${receivable.customer?.name || ''}`
          },
          {
            account_id: receivable.customerId, // Cuenta del cliente
            amount: -paymentCents,
            description: `Cancelación de cuenta por cobrar`
          }
        ]
      });

      if (transactionError) throw transactionError;

      alert("Pago procesado exitosamente");
      setShowPaymentForm(null);
      setPaymentAmount("");
      loadAccountsReceivable();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      alert("Error al procesar el pago");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Cliente', 'RTN', 'Factura', 'Fecha Vencimiento', 
      'Monto Original', 'Monto Pagado', 'Saldo Pendiente', 'Estado', 'Días Vencido'
    ];
    const rows = receivables.map(item => {
      const dueDate = new Date(item.dueDate);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return [
        item.customer?.name || '',
        item.customer?.rtn || '',
        item.invoice?.invoiceNumber || '',
        item.dueDate,
        (item.amount / 100).toFixed(2),
        (item.paidAmount / 100).toFixed(2),
        (item.balanceAmount / 100).toFixed(2),
        item.status,
        daysOverdue > 0 ? daysOverdue.toString() : '0'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReceivables = receivables.filter(receivable => {
    const matchesSearch = 
      receivable.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.customer?.rtn?.includes(searchTerm) ||
      receivable.invoice?.invoiceNumber?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || receivable.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalReceivables = filteredReceivables.reduce((sum, item) => sum + item.balanceAmount, 0);
  const overdueReceivables = filteredReceivables.filter(item => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    return dueDate < today && item.status !== 'PAID';
  });

  const totalOverdue = overdueReceivables.reduce((sum, item) => sum + item.balanceAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'PARTIAL':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Parcial</Badge>;
      case 'PAID':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOverdueDays = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const days = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando cuentas por cobrar...</p>
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
            <DollarSign className="h-6 w-6 mr-2 text-blue-600" />
            Cuentas por Cobrar
          </h2>
          <p className="text-gray-600">Gestión de cobros y seguimiento de facturas</p>
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
                  placeholder="Cliente, RTN o factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pagado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredReceivables.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              L. {(totalReceivables / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              {filteredReceivables.length} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {(totalOverdue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              {overdueReceivables.length} facturas vencidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              L. {((totalReceivables - totalOverdue) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Próximos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalReceivables > 0 ? ((totalReceivables - totalOverdue) / totalReceivables * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-gray-600">
              % no vencido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Cuentas por Cobrar */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Cuentas por Cobrar</CardTitle>
          <CardDescription>
            Gestión de facturas pendientes de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RTN
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Original
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron cuentas por cobrar
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((receivable) => {
                    const overdueDays = getOverdueDays(receivable.dueDate);
                    const isOverdue = overdueDays > 0 && receivable.status !== 'PAID';
                    
                    return (
                      <tr key={receivable.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{receivable.customer?.name || 'N/A'}</div>
                            <div className="text-gray-500 text-xs">
                              {receivable.customer?.email || ''}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          {receivable.customer?.rtn || 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                          {receivable.invoice?.invoiceNumber || 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(receivable.dueDate).toLocaleDateString('es-HN')}
                            {isOverdue && (
                              <div className="text-xs">
                                {overdueDays} días vencido
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                          L. {(receivable.amount / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                          L. {(receivable.paidAmount / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium">
                          <span className={receivable.balanceAmount > 0 ? 'text-blue-600' : 'text-green-600'}>
                            L. {(receivable.balanceAmount / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {getStatusBadge(receivable.status)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {receivable.status !== 'PAID' && (
                            <div className="flex space-x-1 justify-center">
                              <Button
                                size="sm"
                                onClick={() => setShowPaymentForm(receivable.id)}
                                variant="outline"
                              >
                                Pagar
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Pago */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>Procesar Pago</CardTitle>
            <CardDescription>
              Ingrese el monto a pagar para la factura seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto a Pagar (L.)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => processPayment(showPaymentForm)}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Procesar Pago
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(null);
                    setPaymentAmount("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

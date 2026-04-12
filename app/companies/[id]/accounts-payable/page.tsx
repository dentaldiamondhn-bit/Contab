'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, CreditCard, Calendar, AlertCircle, ChevronLeft, CheckCircle, Clock, AlertTriangle, DollarSign, Building2, Menu, FileText, ShoppingCart, BarChart3, Plus } from 'lucide-react';

interface AccountPayable {
  purchase_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  supplier_id: string;
  supplier_name: string;
  supplier_rtn: string;
  urgency: 'OVERDUE' | 'DUE_SOON' | 'NORMAL';
  days_overdue: number;
}

interface Supplier {
  id: string;
  name: string;
  rtn: string;
}

export default function AccountsPayablePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredPayables, setFilteredPayables] = useState<AccountPayable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPayables();
    loadSuppliers();
  }, [companyId]);

  useEffect(() => {
    let filtered = payables;

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(p =>
        p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier_rtn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter(p => p.urgency === 'OVERDUE');
      } else if (filterStatus === 'due_soon') {
        filtered = filtered.filter(p => p.urgency === 'DUE_SOON');
      } else if (filterStatus === 'normal') {
        filtered = filtered.filter(p => p.urgency === 'NORMAL');
      }
    }

    setFilteredPayables(filtered);
  }, [searchTerm, filterStatus, payables]);

  const loadPayables = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts-payable?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        // Calculate urgency and days overdue
        const enhanced = data.map((p: AccountPayable) => {
          const today = new Date();
          const due = new Date(p.due_date);
          const diffTime = today.getTime() - due.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let urgency: 'OVERDUE' | 'DUE_SOON' | 'NORMAL' = 'NORMAL';
          if (diffDays > 0) urgency = 'OVERDUE';
          else if (diffDays >= -7) urgency = 'DUE_SOON';
          
          return {
            ...p,
            urgency,
            days_overdue: diffDays > 0 ? diffDays : 0,
          };
        });
        setPayables(enhanced);
        setFilteredPayables(enhanced);
      }
    } catch (error) {
      console.error('Error loading payables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handlePayment = async () => {
    if (!selectedPayable || !paymentAmount) return;

    const amount = parseFloat(paymentAmount) * 100; // Convert to cents
    if (amount <= 0 || amount > selectedPayable.balance_due) {
      alert('Monto inválido');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedPayable.supplier_id,
          purchase_id: selectedPayable.purchase_id,
          payment_date: paymentDate,
          amount,
          payment_method: paymentMethod,
          reference_number: paymentReference,
          companyId,
        }),
      });

      if (res.ok) {
        alert('Pago registrado exitosamente');
        setShowPaymentModal(false);
        setSelectedPayable(null);
        setPaymentAmount('');
        setPaymentReference('');
        loadPayables();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo registrar el pago'));
      }
    } catch (error) {
      alert('Error al registrar pago');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (payable: AccountPayable) => {
    setSelectedPayable(payable);
    setPaymentAmount((payable.balance_due / 100).toFixed(2));
    setPaymentMethod('transfer');
    setPaymentReference('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentModal(true);
  };

  const getUrgencyBadge = (urgency: string, daysOverdue: number) => {
    if (urgency === 'OVERDUE') {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vencido ({daysOverdue} días)
        </Badge>
      );
    }
    if (urgency === 'DUE_SOON') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Por vencer
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Normal
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalPending = payables.reduce((sum, p) => sum + p.balance_due, 0);
  const totalOverdue = payables.filter(p => p.urgency === 'OVERDUE').reduce((sum, p) => sum + p.balance_due, 0);
  const totalDueSoon = payables.filter(p => p.urgency === 'DUE_SOON').reduce((sum, p) => sum + p.balance_due, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cuentas por Pagar</h1>
          <p className="text-gray-500">Gestión de pagos pendientes a proveedores</p>
        </div>
        
        {/* Single Dropdown Menu - Same level as title */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Menu className="w-4 h-4 mr-2" />
              Menú
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Menú Principal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
              <Building2 className="w-4 h-4 mr-2" />
              Proveedores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Ctas. por Pagar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard de Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Compra
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPending)}</div>
            <div className="text-sm text-gray-500">{payables.length} facturas</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
            <div className="text-sm text-gray-500">
              {payables.filter(p => p.urgency === 'OVERDUE').length} facturas
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Por Vencer (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalDueSoon)}</div>
            <div className="text-sm text-gray-500">
              {payables.filter(p => p.urgency === 'DUE_SOON').length} facturas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por factura, proveedor o RTN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="due_soon">Por vencer</SelectItem>
            <SelectItem value="normal">Normales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Alert */}
      {payables.filter(p => p.urgency === 'OVERDUE').length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tiene {payables.filter(p => p.urgency === 'OVERDUE').length} factura(s) vencida(s) 
            por un total de {formatCurrency(totalOverdue)}
          </AlertDescription>
        </Alert>
      )}

      {/* Payables List */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredPayables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {payables.length === 0 
                ? 'No hay facturas pendientes. Todas las compras están pagadas.'
                : 'No se encontraron facturas con los filtros aplicados.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Estado</th>
                    <th className="text-left py-3 px-4">Factura</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">Fecha Factura</th>
                    <th className="text-left py-3 px-4">Vencimiento</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-right py-3 px-4">Saldo</th>
                    <th className="text-center py-3 px-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayables.map((payable) => (
                    <tr key={payable.purchase_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {getUrgencyBadge(payable.urgency, payable.days_overdue)}
                      </td>
                      <td className="py-3 px-4 font-medium">{payable.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{payable.supplier_name}</div>
                        <div className="text-sm text-gray-500">{payable.supplier_rtn}</div>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(payable.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(payable.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(payable.total)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {formatCurrency(payable.balance_due)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => openPaymentModal(payable)}
                          disabled={payable.balance_due <= 0}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar un pago a esta cuenta por pagar.
            </DialogDescription>
          </DialogHeader>

          {selectedPayable && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Factura: {selectedPayable.invoice_number}</div>
                <div className="text-sm text-gray-600">Proveedor: {selectedPayable.supplier_name}</div>
                <div className="text-lg font-bold mt-2">
                  Saldo: {formatCurrency(selectedPayable.balance_due)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto a Pagar *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(selectedPayable.balance_due / 100).toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia / N° Cheque</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="N° de referencia bancaria o cheque"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={submitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {submitting ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

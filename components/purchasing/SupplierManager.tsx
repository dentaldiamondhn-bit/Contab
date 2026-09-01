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
  Building,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface SupplierManagerProps {
  tenantId: string;
}

interface Supplier {
  id: string;
  rtn: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountPayable {
  id: string;
  supplierId: string;
  invoiceId: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: string;
  supplier?: {
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

export default function SupplierManager({ tenantId }: SupplierManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [supplierForm, setSupplierForm] = useState({
    rtn: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    creditLimit: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadSuppliers();
    loadAccountsPayable();
  }, [tenantId]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar proveedores
      const { data, error } = await supabase
        .from('Supplier')
        .select('*')
        .eq('isActive', true)
        .order('name');

      if (error) throw error;

      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error loading suppliers:", error);
      alert("Error al cargar los proveedores");
    } finally {
      setLoading(false);
    }
  };

  const loadAccountsPayable = async () => {
    try {
      // Cargar cuentas por pagar
      const { data, error } = await supabase
        .from('AccountPayable')
        .select(`
          *,
          Supplier:supplier(id, name, rtn, email, phone),
          Invoice:invoice(id, invoiceNumber, date, description)
        `)
        .order('dueDate', { ascending: false });

      if (error) throw error;

      setPayables(data || []);
    } catch (error: any) {
      console.error("Error loading accounts payable:", error);
      alert("Error al cargar las cuentas por pagar");
    }
  };

  const saveSupplier = async () => {
    try {
      if (!supplierForm.name || !supplierForm.rtn) {
        alert("Por favor complete el nombre y RTN del proveedor");
        return;
      }

      const supplierData = {
        tenantId,
        rtn: supplierForm.rtn,
        name: supplierForm.name,
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        address: supplierForm.address || null,
        creditLimit: supplierForm.creditLimit * 100 // Convertir a centavos
      };

      if (editingSupplier) {
        // Actualizar proveedor existente
        const { error } = await (supabase as any)
          .from('Supplier')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;
        alert("Proveedor actualizado exitosamente");
      } else {
        // Crear nuevo proveedor
        const { error } = await (supabase as any)
          .from('Supplier')
          .insert(supplierData);

        if (error) throw error;
        alert("Proveedor creado exitosamente");
      }

      // Resetear formulario
      setSupplierForm({
        rtn: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        creditLimit: 0
      });
      setEditingSupplier(null);
      setShowSupplierForm(false);
      loadSuppliers();
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      alert("Error al guardar el proveedor");
    }
  };

  const processPayment = async (payableId: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    try {
      const payable = payables.find(p => p.id === payableId);
      if (!payable) return;

      const paymentCents = Math.round(parseFloat(paymentAmount) * 100);
      const newPaidAmount = payable.paidAmount + paymentCents;
      const newBalance = payable.amount - newPaidAmount;

      // Actualizar cuenta por pagar
      const { error } = await (supabase as any)
        .from('AccountPayable')
        .update({
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          updatedAt: new Date().toISOString()
        })
        .eq('id', payableId);

      if (error) throw error;

      // Crear transacción de pago
      const { data: transactionData, error: transactionError } = await (supabase as any).rpc('create_accounting_transaction', {
        p_tenant_id: tenantId,
        p_date: new Date().toISOString().split('T')[0],
        p_description: `Pago de factura ${payable.invoice?.invoiceNumber || ''}`,
        p_voucher_type: 'EGRESO',
        p_voucher_number: Math.floor(Math.random() * 10000),
        p_total_amount: paymentCents,
        p_entries: [
          {
            account_id: '2101', // Cuenta de proveedores
            amount: -paymentCents,
            description: `Pago a ${payable.supplier?.name || ''}`
          },
          {
            account_id: payable.supplierId, // Cuenta del proveedor
            amount: paymentCents,
            description: `Cancelación de cuenta por pagar`
          }
        ]
      });

      if (transactionError) throw transactionError;

      alert("Pago procesado exitosamente");
      setShowPaymentForm(null);
      setPaymentAmount("");
      loadAccountsPayable();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      alert("Error al procesar el pago");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Proveedor', 'RTN', 'Factura', 'Fecha Vencimiento', 
      'Monto Original', 'Monto Pagado', 'Saldo Pendiente', 'Estado', 'Días Vencido'
    ];
    const rows = payables.map(item => {
      const dueDate = new Date(item.dueDate);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return [
        item.supplier?.name || '',
        item.supplier?.rtn || '',
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
    link.setAttribute('download', `cuentas_por_pagar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.rtn?.includes(searchTerm) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayables = payables.filter(payable => {
    const matchesSearch = 
      payable.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.supplier?.rtn?.includes(searchTerm) ||
      payable.invoice?.invoiceNumber?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || payable.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPayables = filteredPayables.reduce((sum, item) => sum + item.balanceAmount, 0);
  const overduePayables = filteredPayables.filter(item => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    return dueDate < today && item.status !== 'PAID';
  });

  const totalOverdue = overduePayables.reduce((sum, item) => sum + item.balanceAmount, 0);

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

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p>Cargando proveedores...</p>
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
            <Building className="h-6 w-6 mr-2 text-orange-600" />
            Proveedores y Cuentas por Pagar
          </h2>
          <p className="text-gray-600">Gestión de proveedores y seguimiento de obligaciones</p>
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
                  placeholder="Proveedor, RTN o factura..."
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
                <span className="font-medium">{filteredPayables.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredSuppliers.length}
            </div>
            <p className="text-xs text-gray-600">
              Proveedores activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Pagar</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              L. {(totalPayables / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              {filteredPayables.length} cuentas pendientes
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
              {overduePayables.length} cuentas vencidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              L. {((totalPayables - totalOverdue) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Próximos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Nuevo Proveedor */}
      <div className="flex justify-center">
        <Button onClick={() => setShowSupplierForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Lista de Proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores</CardTitle>
          <CardDescription>
            Gestión de proveedores y límites de crédito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RTN
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Límite de Crédito
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Actual
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron proveedores
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {supplier.rtn || 'N/A'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-gray-500 text-xs">
                            {supplier.email || ''}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">
                            {supplier.phone || 'N/A'}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {supplier.address || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(supplier.creditLimit / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(supplier.currentBalance / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <div className="flex space-x-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setSupplierForm({
                                rtn: supplier.rtn,
                                name: supplier.name,
                                email: supplier.email || '',
                                phone: supplier.phone || '',
                                address: supplier.address || '',
                                creditLimit: supplier.creditLimit / 100
                              });
                              setShowSupplierForm(true);
                            }}
                          >
                            Editar
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

      {/* Lista de Cuentas por Pagar */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Pagar</CardTitle>
          <CardDescription>
            Control de obligaciones con proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Vencimiento
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
                {filteredPayables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron cuentas por pagar
                    </td>
                  </tr>
                ) : (
                  filteredPayables.map((payable) => {
                    const dueDate = new Date(payable.dueDate);
                    const today = new Date();
                    const isOverdue = dueDate < today && payable.status !== 'PAID';
                    
                    return (
                      <tr key={payable.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{payable.supplier?.name || 'N/A'}</div>
                            <div className="text-gray-500 text-xs">
                              RTN: {payable.supplier?.rtn || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                          {payable.invoice?.invoiceNumber || 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(payable.dueDate).toLocaleDateString('es-HN')}
                            {isOverdue && (
                              <div className="text-xs">
                                {Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} días vencido
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right">
                          L. {(payable.amount / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right">
                          L. {(payable.paidAmount / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right font-medium">
                          <span className={payable.balanceAmount > 0 ? 'text-cyan-600' : 'text-green-600'}>
                            L. {(payable.balanceAmount / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {getStatusBadge(payable.status)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          <div className="flex space-x-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowPaymentForm(payable.id)}
                              disabled={payable.status === 'PAID'}
                            >
                              Pagar
                            </Button>
                          </div>
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

      {/* Formulario de Proveedor */}
      {showSupplierForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</CardTitle>
            <CardDescription>
              {editingSupplier ? 'Modifique los datos del proveedor' : 'Ingrese los datos del nuevo proveedor'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rtn">RTN *</Label>
                <Input
                  id="rtn"
                  value={supplierForm.rtn}
                  onChange={(e) => setSupplierForm({ ...supplierForm, rtn: e.target.value })}
                  placeholder="0801-XXXX-XXXXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proveedor *</Label>
                <Input
                  id="name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Nombre completo del proveedor"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="correo@proveedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+504 XXXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="creditLimit">Límite de Crédito (L.)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplierForm.creditLimit}
                  onChange={(e) => setSupplierForm({ ...supplierForm, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSupplierForm(false);
                  setEditingSupplier(null);
                  setSupplierForm({
                    rtn: "",
                    name: "",
                    email: "",
                    phone: "",
                    address: "",
                    creditLimit: 0
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveSupplier}>
                {editingSupplier ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de Pago */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>Procesar Pago</CardTitle>
            <CardDescription>
              Ingrese el monto a pagar para la cuenta seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto a Pagar (L.)</label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex space-x-3">
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

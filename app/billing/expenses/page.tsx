'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  DollarSign, 
  Download,
  Eye,
  Plus,
  ArrowLeft,
  RefreshCw,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  CreditCard,
  ShoppingCart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerRTN: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function ExpensesPage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentTenant) {
      fetchInvoices();
    }
  }, [currentTenant]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Llamar a la API con tipo EXPENSE (facturas recibidas por el tenant)
      const response = await fetch(`/api/admin/billing/invoices?tenantId=${currentTenant?.id || ''}&type=EXPENSE`);
      
      if (!response.ok) {
        throw new Error('Error al cargar las facturas');
      }
      
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      setError('Error al cargar las facturas');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'OVERDUE':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Calcular totales
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full text-center">
              <CardContent className="p-8">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  No hay empresa seleccionada
                </h2>
                <p className="text-gray-600 mb-6">
                  Debes seleccionar una empresa para ver las facturas.
                </p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  Ir al Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facturas Recibidas</h1>
              <p className="text-gray-600 mt-1">
                Gastos y servicios recibidos por {currentTenant.businessName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchInvoices}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
              <Button
                onClick={() => router.push('/billing/expenses/new')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Registrar Factura
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/billing')}
              className="flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Mis Facturas Emitidas
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/billing/subscriptions')}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Suscripción ContabHN
            </Button>
            <Button
              variant="default"
              className="flex items-center gap-2 bg-blue-600"
            >
              <ShoppingCart className="w-4 h-4" />
              Facturas Recibidas
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagadas</p>
                  <p className="text-2xl font-bold text-green-600">{paidInvoices}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingInvoices}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facturas Recibidas
              <span className="text-sm font-normal text-gray-500">
                ({invoices.length} facturas)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando facturas...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No hay facturas registradas</p>
                <p className="text-sm text-gray-500 mt-1">
                  Registra tus facturas de proveedores y gastos
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Factura</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Proveedor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Vencimiento</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invoice.status)}
                            <span className="font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{invoice.customerName}</p>
                            <p className="text-sm text-gray-500">RTN: {invoice.customerRTN}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                          <p className="text-xs text-gray-500">
                            ISV: {formatCurrency(invoice.tax)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => router.push(`/billing/${invoice.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-800"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

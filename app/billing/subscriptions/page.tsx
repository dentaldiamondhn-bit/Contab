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
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'ACTIVE';
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function SubscriptionsPage() {
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
      
      // Llamar a la API con tipo SUBSCRIPTION (facturas de ContabHN al tenant)
      const response = await fetch(`/api/admin/billing/invoices?tenantId=${currentTenant?.id || ''}&type=SUBSCRIPTION`);
      
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
      case 'ACTIVE':
        return <Badge className="bg-blue-100 text-blue-800">Activa</Badge>;
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
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Calcular totales
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID').length;
  const pendingAmount = invoices
    .filter(inv => inv.status === 'ACTIVE' || inv.status === 'PENDING')
    .reduce((sum, inv) => sum + inv.total, 0);
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
              <h1 className="text-3xl font-bold text-gray-900">Suscripción ContabHN</h1>
              <p className="text-gray-600 mt-1">
                Facturas de servicios brindados a {currentTenant.businessName}
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
              variant="default"
              className="flex items-center gap-2 bg-blue-600"
            >
              <CreditCard className="w-4 h-4" />
              Suscripción ContabHN
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/billing/expenses')}
              className="flex items-center gap-2"
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
                  <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(pendingAmount)}
                  </p>
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
              Facturas de Suscripción
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
                <p className="text-gray-600">No hay facturas de suscripción</p>
                <p className="text-sm text-gray-500 mt-1">
                  Las facturas mensuales aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Factura</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Período</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Subtotal</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">ISV (15%)</th>
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
                            <div>
                              <span className="font-medium text-gray-900">
                                {invoice.invoiceNumber}
                              </span>
                              <p className="text-xs text-gray-500">
                                {formatDate(invoice.issueDate)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            {invoice.items.map((item, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                {item.description}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(invoice.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(invoice.tax)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
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

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Share2,
  Mail
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import InvoiceLegalPreview from '@/components/billing/InvoiceLegalPreview';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  customerName: string;
  customerRTN: string;
  customerEmail: string;
  customerAddress?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'ACTIVE';
  items: InvoiceItem[];
  notes?: string;
  issuerName?: string;
  issuerRTN?: string;
  issuerAddress?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { currentTenant } = useTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'items' | 'payments'>('preview');

  const invoiceId = params.id as string;

  useEffect(() => {
    if (currentTenant && invoiceId) {
      fetchInvoice();
    }
  }, [currentTenant, invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Por ahora, obtener todas las facturas y filtrar por ID
      // En producción, debería haber un endpoint específico
      const response = await fetch(`/api/admin/billing/invoices?tenantId=${currentTenant?.id || ''}&type=CUSTOMER`);
      
      if (!response.ok) {
        throw new Error('Error al cargar la factura');
      }
      
      const data = await response.json();
      const foundInvoice = data.invoices?.find((inv: Invoice) => inv.id === invoiceId);
      
      if (foundInvoice) {
        setInvoice(foundInvoice);
      } else {
        // Si no se encuentra en CUSTOMER, buscar en otros tipos
        const subResponse = await fetch(`/api/admin/billing/invoices?tenantId=${currentTenant?.id || ''}&type=SUBSCRIPTION`);
        const subData = await subResponse.json();
        const subInvoice = subData.invoices?.find((inv: Invoice) => inv.id === invoiceId);
        
        if (subInvoice) {
          setInvoice(subInvoice);
        } else {
          const expResponse = await fetch(`/api/admin/billing/invoices?tenantId=${currentTenant?.id || ''}&type=EXPENSE`);
          const expData = await expResponse.json();
          const expInvoice = expData.invoices?.find((inv: Invoice) => inv.id === invoiceId);
          
          if (expInvoice) {
            setInvoice(expInvoice);
          } else {
            setError('Factura no encontrada');
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      setError('Error al cargar la factura');
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
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'CUSTOMER':
        return 'Factura Emitida';
      case 'SUBSCRIPTION':
        return 'Factura de Suscripción';
      case 'EXPENSE':
        return 'Factura Recibida';
      default:
        return 'Factura';
    }
  };

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No hay empresa seleccionada
              </h2>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {error || 'Factura no encontrada'}
              </h2>
              <Button onClick={() => router.push('/billing')} className="mt-4">
                Volver a Facturas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header estilo Tenant Admin */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/billing')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver</span>
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{getInvoiceTypeLabel(invoice.invoiceType)}</span>
                  <span className="text-gray-300">•</span>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/billing')}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                ← Volver a Facturas
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Vista Previa de Factura
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Items ({invoice.items?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'payments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pagos
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <div className="flex justify-end gap-3 mb-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </Button>
                </div>
                <InvoiceLegalPreview 
                  invoice={invoice} 
                  tenant={currentTenant || undefined}
                />
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Invoice Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issuer Card */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">De:</h3>
                    <p className="font-semibold text-gray-900 text-lg">
                      {invoice.issuerName || currentTenant.businessName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      RTN: {invoice.issuerRTN || currentTenant.businessRTN || 'N/A'}
                    </p>
                    {invoice.issuerAddress || currentTenant.businessAddress ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {invoice.issuerAddress || currentTenant.businessAddress}
                      </p>
                    ) : null}
                  </div>

                  {/* Customer Card */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Para:</h3>
                    <p className="font-semibold text-gray-900 text-lg">{invoice.customerName}</p>
                    <p className="text-sm text-gray-600 mt-1">RTN: {invoice.customerRTN}</p>
                    <p className="text-sm text-gray-600 mt-1">{invoice.customerEmail}</p>
                    {invoice.customerAddress && (
                      <p className="text-sm text-gray-600 mt-1">{invoice.customerAddress}</p>
                    )}
                  </div>
                </div>

                {/* Dates and Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Fecha de Emisión</p>
                    <p className="font-medium text-gray-900 mt-1">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Fecha de Vencimiento</p>
                    <p className="font-medium text-gray-900 mt-1">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Número</p>
                    <p className="font-medium text-gray-900 mt-1">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Estado</p>
                    <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Notas:</p>
                    <p className="text-sm text-yellow-700">{invoice.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-6">
                {/* Items Table - Estilo Tenant Admin */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.items?.map((item, index) => (
                        <tr key={item.id || `item-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals - Estilo Tenant Admin */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3">
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">ISV (15%):</span>
                        <span className="font-medium">{formatCurrency(invoice.tax)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200">
                        <span>Total:</span>
                        <span>{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                {invoice.status === 'PAID' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-800">Factura Pagada</h3>
                    <p className="text-green-700 mt-1">Esta factura ha sido marcada como pagada.</p>
                  </div>
                ) : (
                  <>
                    {/* Payment Info */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-yellow-800">Factura Pendiente</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            Fecha de vencimiento: {formatDate(invoice.dueDate)}
                          </p>
                          <p className="text-sm text-yellow-700">
                            Monto a pagar: <strong>{formatCurrency(invoice.total)}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Marcar como Pagada
                      </Button>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Extender Vencimiento
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

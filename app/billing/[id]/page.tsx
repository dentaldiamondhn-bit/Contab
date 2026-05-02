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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/billing')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver a Facturas
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{getInvoiceTypeLabel(invoice.invoiceType)}</p>
              <h1 className="text-3xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Enviar por Email
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Compartir
          </Button>
        </div>

        {/* Invoice Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles de la Factura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Issuer */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">De:</h3>
                <p className="font-semibold text-gray-900">
                  {invoice.issuerName || currentTenant.businessName}
                </p>
                <p className="text-sm text-gray-600">
                  RTN: {invoice.issuerRTN || currentTenant.businessRTN || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {invoice.issuerAddress || currentTenant.businessAddress || ''}
                </p>
              </div>

              {/* Customer */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Para:</h3>
                <p className="font-semibold text-gray-900">{invoice.customerName}</p>
                <p className="text-sm text-gray-600">RTN: {invoice.customerRTN}</p>
                <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                {invoice.customerAddress && (
                  <p className="text-sm text-gray-600">{invoice.customerAddress}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Fecha de Emisión</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Número de Factura</p>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <div className="mt-1">{getStatusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Descripción</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Cantidad</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Precio Unit.</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-end">
                <div className="w-full md:w-1/2">
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

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Actions */}
        {invoice.status !== 'PAID' && (
          <Card>
            <CardHeader>
              <CardTitle>Acciones de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como Pagada
                </Button>
                <Button variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  Extender Fecha de Vencimiento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

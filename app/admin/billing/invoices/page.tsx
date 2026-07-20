'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  RefreshCw,
  Building2,
  Filter,
  Search,
  ArrowLeft,
  Plus
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'CUSTOMER' | 'SUBSCRIPTION' | 'EXPENSE';
  customerName: string;
  customerRTN: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'ACTIVE';
  issueDate: string;
  dueDate: string;
  tenantId?: string;
  tenantName?: string;
  createdAt: string;
}

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState<'ALL' | 'CUSTOMER' | 'SUBSCRIPTION' | 'EXPENSE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [activeType]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all types of invoices
      const types = ['CUSTOMER', 'SUBSCRIPTION', 'EXPENSE'];
      let allInvoices: Invoice[] = [];
      
      for (const type of types) {
        if (activeType !== 'ALL' && activeType !== type) continue;
        
        const response = await fetch(`/api/admin/billing/invoices?type=${type}&limit=1000`);
        if (response.ok) {
          const data = await response.json();
          if (data.invoices) {
            allInvoices = [...allInvoices, ...data.invoices.map((inv: Invoice) => ({
              ...inv,
              invoiceType: type
            }))];
          }
        }
      }
      
      // Sort by creation date (newest first)
      allInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setInvoices(allInvoices);
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
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
        return 'Emitida a Cliente';
      case 'SUBSCRIPTION':
        return 'Suscripción';
      case 'EXPENSE':
        return 'Recibida de Proveedor';
      default:
        return type;
    }
  };

  const getInvoiceTypeColor = (type: string) => {
    switch (type) {
      case 'CUSTOMER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SUBSCRIPTION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'EXPENSE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('¿Está seguro de eliminar esta factura? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/billing/invoices?id=${invoiceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error al eliminar la factura');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.tenantName?.toLowerCase().includes(searchLower) ||
      invoice.customerRTN?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver</span>
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Todas las Facturas</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {invoices.length} facturas en total
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={fetchInvoices}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
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
              {[
                { key: 'ALL', label: 'Todas', count: invoices.length },
                { key: 'CUSTOMER', label: 'Emitidas a Clientes', count: invoices.filter(i => i.invoiceType === 'CUSTOMER').length },
                { key: 'SUBSCRIPTION', label: 'Suscripciones', count: invoices.filter(i => i.invoiceType === 'SUBSCRIPTION').length },
                { key: 'EXPENSE', label: 'Recibidas de Proveedores', count: invoices.filter(i => i.invoiceType === 'EXPENSE').length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveType(tab.key as any)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeType === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por número, cliente, RTN o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando facturas...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No se encontraron facturas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente/Proveedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getInvoiceTypeColor(invoice.invoiceType)}`}>
                            {getInvoiceTypeLabel(invoice.invoiceType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.tenantName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/billing/invoices/${invoice.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalle"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              className="text-green-600 hover:text-green-900"
                              title="Descargar PDF"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

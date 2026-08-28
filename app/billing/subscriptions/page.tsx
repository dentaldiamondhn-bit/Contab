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
  ShoppingCart,
  Search,
  Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  customerName: string;
  customerRTN: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  currency: string;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: 'SUBSCRIPTION', limit: '200' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const response = await fetch(`/api/admin/billing/invoices?${params}`);
      if (!response.ok) throw new Error('Error al cargar las facturas');
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch = !searchTerm ||
      inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const totalInvoices = filtered.length;
  const paidInvoices = filtered.filter(i => i.status === 'PAID' || i.status === 'ACTIVE').length;
  const pendingAmount = filtered
    .filter(i => i.status === 'ACTIVE' || i.status === 'PENDING')
    .reduce((s, i) => s + (i.total || 0), 0);
  const totalAmount = filtered.reduce((s, i) => s + (i.total || 0), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);

  const formatDate = (dateString: string) =>
    dateString ? new Date(dateString).toLocaleDateString('es-HN') : '-';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
      case 'ACTIVE': return <Badge className="bg-blue-100 text-blue-800">Activa</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'OVERDUE': return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => router.push('/billing')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              Volver a Facturación
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Suscripción ContabHN</h1>
              <p className="text-gray-600 mt-1">Facturas de suscripción de todas las empresas</p>
            </div>
            <Button variant="outline" onClick={fetchInvoices} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/billing')} className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Facturas por Tenant
            </Button>
            <Button variant="default" className="flex items-center gap-2 bg-blue-600">
              <CreditCard className="w-4 h-4" />
              Suscripción ContabHN
            </Button>
            <Button variant="outline" onClick={() => router.push('/billing/expenses')} className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Facturas Recibidas
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por número o empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activas</option>
                  <option value="PAID">Pagadas</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="OVERDUE">Vencidas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facturas de Suscripción
              <span className="text-sm font-normal text-gray-500">({filtered.length} facturas)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando facturas...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No hay facturas de suscripción</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Factura</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Empresa</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Vencimiento</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Subtotal</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">ISV</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{inv.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{inv.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(inv.issueDate)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">{formatCurrency(inv.subtotal)}</td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">{formatCurrency(inv.tax)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-gray-900">{formatCurrency(inv.total)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-3 px-4 text-sm" colSpan={4}>TOTALES</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(filtered.reduce((s, i) => s + (i.subtotal || 0), 0))}</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(filtered.reduce((s, i) => s + (i.tax || 0), 0))}</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(totalAmount)}</td>
                      <td></td>
                    </tr>
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

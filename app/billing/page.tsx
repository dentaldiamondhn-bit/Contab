'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Search,
  Filter,
  Receipt,
  CreditCard as CardIcon,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TenantInvoiceCount {
  tenantId: string;
  businessName: string;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  totalAmount: number;
  paidAmount: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [tenantCounts, setTenantCounts] = useState<TenantInvoiceCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SUBSCRIPTION' | 'CUSTOMER' | 'EXPENSE'>('ALL');

  useEffect(() => {
    fetchTenantCounts();
  }, [typeFilter]);

  const fetchTenantCounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      const response = await fetch(`/api/admin/billing/invoice-counts?${params}`);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setTenantCounts(data.tenants || []);
      } else {
        // No es JSON (ej: HTML de login/404) - no bloquear UI
        console.warn('invoice-counts no es JSON:', response.status);
        setTenantCounts([]);
      }
    } catch (err) {
      console.error('Error fetching tenant counts:', err);
      setTenantCounts([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tenantCounts.filter((tc) =>
    tc.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInvoices = tenantCounts.reduce((s, t) => s + t.totalInvoices, 0);
  const totalPaid = tenantCounts.reduce((s, t) => s + t.paidInvoices, 0);
  const totalPending = tenantCounts.reduce((s, t) => s + t.pendingInvoices, 0);
  const totalOverdue = tenantCounts.reduce((s, t) => s + t.overdueInvoices, 0);
  const totalAmount = tenantCounts.reduce((s, t) => s + t.totalAmount, 0);
  const totalPaidAmount = tenantCounts.reduce((s, t) => s + t.paidAmount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
              <p className="text-gray-600 mt-1">
                Cantidad de facturas generadas por cada empresa
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchTenantCounts}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="default" className="flex items-center gap-2 bg-cyan-600">
              <Receipt className="w-4 h-4" />
              Facturas por Tenant
            </Button>
            <Button variant="outline" onClick={() => router.push('/billing/subscriptions')} className="flex items-center gap-2">
              <CardIcon className="w-4 h-4" />
              Suscripción ContabHN
            </Button>
            <Button variant="outline" onClick={() => router.push('/billing/expenses')} className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Facturas Recibidas
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Empresas</p>
                  <p className="text-2xl font-bold text-gray-900">{tenantCounts.length}</p>
                </div>
                <Building2 className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
                </div>
                <FileText className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagadas</p>
                  <p className="text-2xl font-bold text-green-600">{totalPaid}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
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
                  <p className="text-xl font-bold text-cyan-600">{formatCurrency(totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-cyan-400" />
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
                    placeholder="Buscar empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="ALL">Todos los tipos</option>
                  <option value="SUBSCRIPTION">Suscripción</option>
                  <option value="CUSTOMER">Cliente</option>
                  <option value="EXPENSE">Gasto</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Invoice Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facturas por Empresa
              <span className="text-sm font-normal text-gray-500">
                ({filtered.length} empresas)
              </span>
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
                <p className="text-gray-600">No hay facturas registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Empresa</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Total Facturas</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Pagadas</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Pendientes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Vencidas</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Monto Total</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tc) => (
                      <tr key={tc.tenantId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{tc.businessName}</p>
                              <p className="text-xs text-gray-500">{tc.tenantId.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-cyan-100 text-cyan-800">
                            {tc.totalInvoices}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-green-600">{tc.paidInvoices}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-yellow-600">{tc.pendingInvoices}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-red-600">{tc.overdueInvoices}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(tc.totalAmount)}</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(tc.paidAmount)}</p>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-3 px-4 text-sm text-gray-900">TOTALES</td>
                      <td className="py-3 px-4 text-center text-sm text-cyan-800">{totalInvoices}</td>
                      <td className="py-3 px-4 text-center text-sm text-green-600">{totalPaid}</td>
                      <td className="py-3 px-4 text-center text-sm text-yellow-600">{totalPending}</td>
                      <td className="py-3 px-4 text-center text-sm text-red-600">{totalOverdue}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-900">{formatCurrency(totalAmount)}</td>
                      <td className="py-3 px-4 text-right text-sm text-green-600">{formatCurrency(totalPaidAmount)}</td>
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

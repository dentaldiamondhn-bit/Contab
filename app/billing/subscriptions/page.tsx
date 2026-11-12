'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DisneyStyleInvoice from '@/components/billing/DisneyStyleInvoice';
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

  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
    generateCurrentMonthIfMissing();
  }, []);

  const generateCurrentMonthIfMissing = async () => {
    // 1. Intentar generar vía API (no bloqueante)
    try {
      const res = await fetch('/api/billing/invoices/generate-current', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.invoice) { setCurrentInvoice(data.invoice); return; }
      }
    } catch {}
    // 2. Fallback: crear factura del mes actual desde plan(es) activo(s) - muestra paquete(s) activo(s)
    const createFromPlan = (planOrPlans: any) => {
      const plans = Array.isArray(planOrPlans) ? planOrPlans : [planOrPlans];
      const now = new Date();
      const invoiceNumber = `FAC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-001`;
      const businessName = localStorage.getItem('businessName') || 'Mi Empresa';
      const subtotal = plans.reduce((s: number, p: any) => s + (p.subtotal ?? p.price ?? 0), 0);
      const tax = plans.reduce((s: number, p: any) => s + (p.taxAmount ?? Math.round((p.price||0)*0.15)), 0);
      const total = plans.reduce((s: number, p: any) => s + (p.total ?? Math.round((p.price||0)*1.15)), 0);
      setCurrentInvoice({
        id: `current-${Date.now()}`,
        invoiceNumber,
        invoiceType: 'SUBSCRIPTION',
        customerName: businessName,
        customerRTN: '',
        issueDate: now.toISOString(),
        dueDate: new Date(now.getFullYear(), now.getMonth()+1, 10).toISOString(),
        subtotal,
        tax,
        total,
        status: 'PENDING',
        currency: 'HNL',
        items: plans.map((p: any) => ({ id: p.id || `plan-${p.code || p.name}`, description: p.name || 'Plan Activo', quantity: 1, unitPrice: p.price || 0, total: p.total || p.price || 0 })),
      } as any);
    };
    try {
      const raw = localStorage.getItem('selectedPlans');
      if (raw) {
        const plans = JSON.parse(raw);
        if (Array.isArray(plans) && plans.length > 0) { createFromPlan(plans); return; }
      }
    } catch {}
    // 3. Si no hay plan en localStorage, buscar desde my-tenant (con todos los planes)
    try {
      const tRes = await fetch('/api/tenant/my-tenant');
      if (tRes.ok) {
        const tData = await tRes.json();
        const tenantPlans = tData.tenant?.plans || [];
        if (tenantPlans.length > 0) {
          const pRes = await fetch('/api/admin/plans-public');
          if (pRes.ok) {
            const pData = await pRes.json();
            const fullPlans = tenantPlans.map((tp: any) => {
              const found = (pData.plans || []).find((p: any) => p.name === tp.plan_name || p.code === tp.plan_code);
              return found ? found : { name: tp.plan_name || tp.plan_code, price: 0, total: 0, code: tp.plan_code };
            });
            createFromPlan(fullPlans);
            return;
          }
          createFromPlan(tenantPlans.map((tp: any) => ({ name: tp.plan_name || tp.plan_code, price: 0, total: 0, code: tp.plan_code })));
          return;
        }
        const planName = tData.tenant?.subscriptionPlan;
        if (planName) {
          const pRes = await fetch('/api/admin/plans-public');
          if (pRes.ok) {
            const pData = await pRes.json();
            const found = (pData.plans || []).filter((p: any) => p.name === planName || p.code === planName);
            if (found.length > 0) { createFromPlan(found); return; }
          }
          createFromPlan({ name: planName, price: 0, total: 0 });
          return;
        }
      }
    } catch {}
    // 4. Último fallback: plan por defecto
    createFromPlan({ name: 'Plan Actual', price: 0, total: 0 });
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: 'SUBSCRIPTION', limit: '200' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      // Intentar endpoint de usuario primero, fallback a admin
      let response = await fetch(`/api/billing/invoices?${params}`);
      let contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        response = await fetch(`/api/admin/billing/invoices?${params}`);
        contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) {
          console.warn('invoices no es JSON:', response.status);
          setInvoices([]);
          return;
        }
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.invoices || []);
      setInvoices(list);
      // Si no hay factura del mes actual en la lista, mostrar la generada
      const now = new Date();
      const hasCurrent = list.some((inv: any) => {
        const d = new Date(inv.issueDate || inv.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      if (!hasCurrent && currentInvoice) {
        setInvoices(prev => [currentInvoice, ...prev]);
      }
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('');
      setInvoices([]);
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
      case 'ACTIVE': return <Badge className="bg-cyan-100 text-cyan-800">Activa</Badge>;
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
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push('/account/billing')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700">
                <CreditCard className="w-4 h-4" />
                Actualizar Información de Pago
              </Button>
              <Button variant="outline" onClick={fetchInvoices} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/billing')} className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Facturas por Tenant
            </Button>
            <Button variant="default" className="flex items-center gap-2 bg-cyan-600">
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
                <FileText className="w-8 h-8 text-cyan-400" />
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
                  <p className="text-2xl font-bold text-cyan-600">{formatCurrency(totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Factura del Mes Actual */}
        {currentInvoice && (
          <Card className="mb-6 border-cyan-200 bg-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-cyan-600" />Factura del Mes Actual</CardTitle>
              <CardDescription>Generada para el ciclo actual - {new Date().toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-lg border">
                <div>
                  <p className="font-bold text-gray-900">{currentInvoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">{currentInvoice.customerName} • Vence {formatDate(currentInvoice.dueDate)}</p>
                  <p className="text-sm font-medium text-cyan-700 mt-1">Total: {formatCurrency(currentInvoice.total)} • {currentInvoice.status}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelectedInvoice(currentInvoice); setIsInvoiceModalOpen(true); }}><Eye className="w-4 h-4 mr-2" />Ver Factura</Button>
                  <Button variant="outline" onClick={() => {
                    const inv = currentInvoice;
                    if (!inv) return;
                    const html = document.createElement('div');
                    html.innerHTML = `<div style="font-family:system-ui;padding:40px;max-width:600px;margin:0 auto;"><h1 style="font-size:32px;font-weight:bold;">Factura</h1><p style="font-family:monospace;color:#6b7280;">#${inv.invoiceNumber}</p><p style="margin-top:20px;">${new Date(inv.issueDate).toLocaleDateString('es-HN', { day:'numeric', month:'long', year:'numeric' })}</p><hr style="height:3px;background:#d1d5db;margin:24px 0;border:none;"/><div style="display:flex;justify-content:space-between;"><div><p style="font-size:18px;font-weight:bold;">${inv.customerName} (Mensual)</p></div><p style="font-size:18px;font-weight:bold;">${new Intl.NumberFormat('es-HN', { style:'currency', currency:'HNL' }).format(inv.total)}</p></div><hr style="height:1px;background:#e5e7eb;margin:24px 0;border:none;"/><div style="display:flex;justify-content:space-between;"><div><p style="font-size:20px;font-weight:bold;">Total del Pedido</p><p style="font-size:14px;color:#6b7280;">ECMC **2831</p></div><p style="font-size:20px;font-weight:bold;">${new Intl.NumberFormat('es-HN', { style:'currency', currency:'HNL' }).format(inv.total)}</p></div><hr style="height:3px;background:#d1d5db;margin:24px 0;border:none;"/><p style="font-size:18px;font-weight:bold;">Diamond Accounting, S. de R.L.</p><p style="font-size:14px;color:#4b5563;">Col. Palmira, Tegucigalpa, Honduras</p><p style="font-size:14px;color:#4b5563;margin-top:12px;">0801-1995-12345</p></div>`;
                    const w = window.open('', '_blank');
                    if (!w) return;
                    w.document.write(`<!DOCTYPE html><html><head><title>Factura ${inv.invoiceNumber}</title><style>body{margin:0;padding:20px;}</style></head><body>${html.innerHTML}</body></html>`);
                    w.document.close();
                    setTimeout(() => { w.print(); }, 500);
                  }}><Download className="w-4 h-4 mr-2" />Descargar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial */}
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Facturas</h3>
          <p className="text-sm text-gray-600">Todas las facturas de suscripción generadas</p>
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Acciones</th>
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
                        <td className="py-3 px-4 text-center">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedInvoice(inv); setIsInvoiceModalOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-3 px-4 text-sm" colSpan={4}>TOTALES</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(filtered.reduce((s, i) => s + (i.subtotal || 0), 0))}</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(filtered.reduce((s, i) => s + (i.tax || 0), 0))}</td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(totalAmount)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Factura estilo Disney */}
        <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Factura</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="p-6 pt-0">
                <DisneyStyleInvoice
                  invoiceNumber={selectedInvoice.invoiceNumber || selectedInvoice.id}
                  date={selectedInvoice.issueDate}
                  planName={selectedInvoice.items?.[0]?.description || 'Suscripción'}
                  amount={formatCurrency(selectedInvoice.total)}
                  plans={selectedInvoice.items?.length ? selectedInvoice.items.map((it: any) => ({ name: it.description, amount: formatCurrency(it.total) })) : undefined}
                  cardLast4="2831"
                  companyName="Diamond Accounting, S. de R.L."
                  companyAddress="Col. Palmira, Tegucigalpa, Honduras"
                  companyRTN="0801-1995-12345"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronLeft, Menu, Search, Landmark, Check, X, FileText, CreditCard, BarChart3, Package, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PagoConciliable {
  id: string;
  supplier_name: string | null;
  purchase_id: string | null;
  invoice_number: string | null;
  amount: number;
  payment_date: string | null;
  payment_method: string | null;
  reference: string | null;
  journal_entry_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  bank_account_id: string | null;
  reconciliation_reference: string | null;
}

interface CuentaBancaria {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  account_type: string | null;
  currency: string | null;
}

interface ResumenConciliacion {
  totalPagos: number;
  conciliados: number;
  pendientes: number;
  montoTotal: number;
  montoConciliado: number;
  montoPendiente: number;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
  card: 'Tarjeta',
  other: 'Otro',
};

const formato = (amount: number) =>
  `L ${Number(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [pagos, setPagos] = useState<PagoConciliable[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [resumen, setResumen] = useState<ResumenConciliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [bankAccountId, setBankAccountId] = useState('todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reconciled'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [referencia, setReferencia] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ companyId });
      if (bankAccountId !== 'todas') query.set('bankAccountId', bankAccountId);
      const res = await fetch(`/api/purchases/payments/reconciliation?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPagos(data.pagos || []);
        setResumen(data.resumen || null);
        setCuentas(data.cuentas || []);
      }
    } catch (error) {
      console.error('Error cargando conciliación:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, bankAccountId]);

  useEffect(() => {
    setSeleccion(new Set());
  }, [companyId, bankAccountId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCuenta = useCallback(
    (id: string | null) => (id ? cuentas.find((c) => c.id === id)?.bank_name || 'Banco' : ''),
    [cuentas]
  );

  const visibles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pagos.filter((p) => {
      if (statusFilter === 'pending' && p.is_reconciled) return false;
      if (statusFilter === 'reconciled' && !p.is_reconciled) return false;
      if (!term) return true;
      return (
        String(p.supplier_name || '').toLowerCase().includes(term) ||
        String(p.invoice_number || '').toLowerCase().includes(term) ||
        String(p.reference || '').toLowerCase().includes(term)
      );
    });
  }, [pagos, statusFilter, searchTerm]);

  const toggle = (id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const todosVisiblesSeleccionados = visibles.length > 0 && visibles.every((p) => seleccion.has(p.id));

  const toggleTodos = () => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (todosVisiblesSeleccionados) for (const p of visibles) next.delete(p.id);
      else for (const p of visibles) next.add(p.id);
      return next;
    });
  };

  const marcarConciliados = async () => {
    if (seleccion.size === 0) return;
    if (bankAccountId === 'todas') {
      alert('Seleccione la cuenta bancaria del extracto contra la que se concilia.');
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch(`/api/purchases/payments/reconciliation?companyId=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIds: Array.from(seleccion),
          bankAccountId,
          reference: referencia || null,
        }),
      });
      if (res.ok) {
        setReferencia('');
        setSeleccion(new Set());
        await cargar();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo conciliar'));
      }
    } catch {
      alert('Error al conciliar los pagos');
    } finally {
      setProcesando(false);
    }
  };

  const quitarConciliacion = async () => {
    if (seleccion.size === 0) return;
    if (!confirm(`¿Quitar la conciliación de ${seleccion.size} pago(s)?`)) return;
    setProcesando(true);
    try {
      const res = await fetch(`/api/purchases/payments/reconciliation?companyId=${companyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: Array.from(seleccion) }),
      });
      if (res.ok) {
        setSeleccion(new Set());
        await cargar();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo quitar la conciliación'));
      }
    } catch {
      alert('Error al quitar la conciliación');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/purchases`)}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Compras
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Conciliación Bancaria de Pagos</h1>
            <p className="text-gray-500">Cuadre de los pagos a proveedores contra el estado de cuenta bancario</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Menu className="w-4 h-4 mr-2" />
              Menú
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Menú Principal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
              <FileText className="w-4 h-4 mr-2" /> Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
              <FileText className="w-4 h-4 mr-2" /> Proveedores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
              <CreditCard className="w-4 h-4 mr-2" /> Ctas. por Pagar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchase-orders`)}>
              <Package className="w-4 h-4 mr-2" /> Órdenes de Compra
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/returns`)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Devoluciones
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
              <BarChart3 className="w-4 h-4 mr-2" /> Dashboard de Compras
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen?.totalPagos ?? 0}</div>
            <div className="text-xs text-gray-500">{formato(resumen?.montoTotal ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conciliado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resumen?.conciliados ?? 0}</div>
            <div className="text-xs text-gray-500">{formato(resumen?.montoConciliado ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{resumen?.pendientes ?? 0}</div>
            <div className="text-xs text-gray-500">{formato(resumen?.montoPendiente ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Seleccionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seleccion.size}</div>
            <div className="text-xs text-gray-500">
              {formato(visibles.filter((p) => seleccion.has(p.id)).reduce((s, p) => s + p.amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Cuenta bancaria</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las cuentas</SelectItem>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.bank_name || 'Banco'}
                      {c.account_number ? ` · ${c.account_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="reconciled">Conciliados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referencia del extracto</Label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Opcional (ej. línea 24)"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={marcarConciliados} disabled={procesando || seleccion.size === 0} className="bg-cyan-600 hover:bg-cyan-700">
                <Check className="w-4 h-4 mr-2" /> Conciliar ({seleccion.size})
              </Button>
              <Button variant="outline" onClick={quitarConciliacion} disabled={procesando || seleccion.size === 0}>
                <X className="w-4 h-4 mr-2" /> Quitar
              </Button>
            </div>
          </div>

          {cuentas.length === 0 && (
            <div className="flex items-center gap-2 mt-3 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              No hay cuentas bancarias activas. Regístralas en Facturación → Cuentas Bancarias.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por proveedor, factura o referencia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos a Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : visibles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay pagos que mostrar con los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 w-10">
                      <input type="checkbox" checked={todosVisiblesSeleccionados} onChange={toggleTodos} />
                    </th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">Factura</th>
                    <th className="text-left py-3 px-4">Método</th>
                    <th className="text-left py-3 px-4">Referencia</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.id} className={`border-b hover:bg-gray-50 ${seleccion.has(p.id) ? 'bg-cyan-50' : ''}`}>
                      <td className="py-3 px-4 text-center">
                        <input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                      <td className="py-3 px-4">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4">{p.supplier_name || '-'}</td>
                      <td className="py-3 px-4">{p.invoice_number || '-'}</td>
                      <td className="py-3 px-4">{PAYMENT_METHOD_LABEL[p.payment_method || ''] || p.payment_method || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.reference || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">{formato(p.amount)}</td>
                      <td className="py-3 px-4">
                        {p.is_reconciled ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-green-100 text-green-800 border-green-300 w-fit">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Conciliado
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {nombreCuenta(p.bank_account_id)}
                              {p.reconciled_at ? ` · ${new Date(p.reconciled_at).toLocaleDateString()}` : ''}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">Pendiente</Badge>
                        )}
                        {!p.journal_entry_id && (
                          <div className="text-xs text-red-500 mt-1">Sin asiento contable</div>
                        )}
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
  );
}

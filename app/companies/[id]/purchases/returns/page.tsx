'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, FileText, CreditCard, ChevronLeft, Trash2, Eye, BarChart3, MoreHorizontal, Menu, Package, RotateCcw } from 'lucide-react';

interface PurchaseItem {
  id?: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier?: { id: string; name: string; rtn: string } | null;
  supplier_name?: string;
  total: number;
  items?: PurchaseItem[];
}

interface ReturnLine {
  id?: string;
  purchase_item_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface PurchaseReturn {
  id: string;
  return_number: string;
  return_date: string;
  return_type: string;
  invoice_number?: string;
  supplier_name?: string;
  reason?: string;
  notes?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  items: ReturnLine[];
}

export default function PurchaseReturnsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  // Create form
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnType, setReturnType] = useState('credit');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchases/returns?companyId=${companyId}`);
      if (res.ok) setReturns(await res.json());
    } catch (error) {
      console.error('Error loading purchase returns:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadPurchases = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchases?companyId=${companyId}`);
      if (res.ok) setPurchases(await res.json());
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  }, [companyId]);

  useEffect(() => {
    loadReturns();
    loadPurchases();
  }, [loadReturns, loadPurchases]);

  const selectedPurchase = useMemo(
    () => purchases.find((p) => p.id === selectedPurchaseId) || null,
    [purchases, selectedPurchaseId]
  );

  const openCreateModal = () => {
    setSelectedPurchaseId('');
    setQuantities({});
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnType('credit');
    setReason('');
    setNotes('');
    setShowCreateModal(true);
  };

  const selectPurchase = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    const purchase = purchases.find((p) => p.id === purchaseId);
    const inicial: Record<string, number> = {};
    for (const item of purchase?.items || []) {
      if (item.id) inicial[item.id] = 0;
    }
    setQuantities(inicial);
  };

  const setQuantity = (itemId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
  };

  const lineasSeleccionadas = useMemo(() => {
    if (!selectedPurchase?.items) return [] as Array<{ item: PurchaseItem; quantity: number }>;
    return selectedPurchase.items
      .filter((item) => item.id && (quantities[item.id!] || 0) > 0)
      .map((item) => ({ item, quantity: quantities[item.id!] || 0 }));
  }, [selectedPurchase, quantities]);

  const totales = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    for (const { item, quantity } of lineasSeleccionadas) {
      const sub = Math.round(quantity * (item.unit_price || 0));
      subtotal += sub;
      taxAmount += Math.round(sub * ((item.tax_rate ?? 15) / 100));
    }
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [lineasSeleccionadas]);

  const handleSubmit = async () => {
    if (!selectedPurchaseId) {
      alert('Seleccione la compra de origen');
      return;
    }
    if (lineasSeleccionadas.length === 0) {
      alert('Indique al menos una cantidad a devolver');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        purchase_id: selectedPurchaseId,
        return_date: returnDate,
        return_type: returnType,
        reason: reason || null,
        notes: notes || null,
        items: lineasSeleccionadas.map(({ item, quantity }) => ({
          purchase_item_id: item.id,
          quantity,
        })),
      };

      const res = await fetch(`/api/purchases/returns?companyId=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert('Devolución registrada exitosamente');
        setShowCreateModal(false);
        loadReturns();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo registrar la devolución'));
      }
    } catch (error) {
      alert('Error al registrar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ret: PurchaseReturn) => {
    if (!confirm(`¿Eliminar la devolución ${ret.return_number}? Se repondrá el stock y se borrará su asiento.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/purchases/returns/${ret.id}?companyId=${companyId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Devolución eliminada');
        loadReturns();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo eliminar la devolución'));
      }
    } catch (error) {
      alert('Error al eliminar la devolución');
    }
  };

  const formatCurrency = (amount: number) => {
    return `L ${Number(amount).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filtradas = returns.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      String(r.return_number || '').toLowerCase().includes(term) ||
      String(r.invoice_number || '').toLowerCase().includes(term) ||
      String(r.supplier_name || '').toLowerCase().includes(term) ||
      String(r.reason || '').toLowerCase().includes(term)
    );
  });

  const montoTotal = returns.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const esteMes = returns.filter((r) => new Date(r.return_date).getMonth() === new Date().getMonth());

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/purchases`)}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Compras
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Devoluciones a Proveedores</h1>
            <p className="text-gray-500">Devoluciones sobre compras, con efecto en inventario y contabilidad</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-10 px-3 bg-cyan-600 hover:bg-cyan-700"
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Devolución
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                <Menu className="w-4 h-4 mr-2" />
                Menú
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Menú Principal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
                <FileText className="w-4 h-4 mr-2" />
                Compras
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
                <FileText className="w-4 h-4 mr-2" />
                Proveedores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Ctas. por Pagar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchase-orders`)}>
                <Package className="w-4 h-4 mr-2" />
                Órdenes de Compra
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard de Compras
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(montoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(esteMes.reduce((sum, r) => sum + (Number(r.total) || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por número, factura, proveedor o motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Devoluciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay devoluciones registradas. Registre una nueva para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Número</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">Factura Origen</th>
                    <th className="text-left py-3 px-4">Motivo</th>
                    <th className="text-center py-3 px-4">Reembolso</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{ret.return_number}</td>
                      <td className="py-3 px-4">{new Date(ret.return_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{ret.supplier_name || '-'}</td>
                      <td className="py-3 px-4">{ret.invoice_number || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{ret.reason || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {ret.return_type === 'cash' ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">Efectivo</Badge>
                        ) : ret.return_type === 'replacement' ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">Cambio prod.</Badge>
                        ) : ret.return_type === 'next_purchase' ? (
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">Crédito sig. compra</Badge>
                        ) : ret.return_type === 'other' ? (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300">Otro</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">Crédito</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(ret.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { setSelectedReturn(ret); setShowViewModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(ret)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Devolución a Proveedor</DialogTitle>
            <DialogDescription>
              Seleccione la compra de origen e indique las cantidades a devolver. Se bajará el stock y se generará la nota de crédito.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Compra de Origen *</Label>
              <Select value={selectedPurchaseId} onValueChange={selectPurchase}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una compra" />
                </SelectTrigger>
                <SelectContent>
                  {purchases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.invoice_number} — {p.supplier?.name || p.supplier_name || 'Sin proveedor'} ({formatCurrency(p.total)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Reembolso</Label>
                <Select value={returnType} onValueChange={setReturnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Crédito (CxP)</SelectItem>
                      <SelectItem value="cash">Efectivo (Banco)</SelectItem>
                      <SelectItem value="replacement">Producto cambiado</SelectItem>
                      <SelectItem value="next_purchase">Crédito en siguiente compra</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: producto dañado" />
              </div>
            </div>

            {selectedPurchase && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Artículo</th>
                      <th className="text-center p-2">Comprado</th>
                      <th className="text-center p-2">A devolver</th>
                      <th className="text-right p-2">P. Unit</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPurchase.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-4 text-gray-500">
                          Esta compra no tiene artículos.
                        </td>
                      </tr>
                    ) : (
                      (selectedPurchase.items || []).map((item) => {
                        const key = item.id || '';
                        const qty = quantities[key] || 0;
                        const sub = Math.round(qty * (item.unit_price || 0));
                        return (
                          <tr key={key} className="border-t">
                            <td className="p-2">{item.product_name || item.description}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                step="0.01"
                                value={qty}
                                onChange={(e) => setQuantity(key, parseFloat(e.target.value) || 0)}
                                className="w-24 mx-auto text-center"
                              />
                            </td>
                            <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(sub)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones (opcional)" />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>ISV:</span>
                <span className="font-medium">{formatCurrency(totales.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(totales.total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || lineasSeleccionadas.length === 0}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {submitting ? 'Registrando...' : 'Registrar Devolución'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Devolución {selectedReturn?.return_number}</DialogTitle>
            <DialogDescription>
              {selectedReturn?.supplier_name || 'Sin proveedor'} — Factura origen {selectedReturn?.invoice_number || '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Fecha</div>
                  <div className="font-medium">{new Date(selectedReturn.return_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Reembolso</div>
                  <div className="font-medium">{(() => {
                    if (selectedReturn.return_type === 'credit') return 'Crédito (CxP)';
                    if (selectedReturn.return_type === 'cash') return 'Efectivo (Banco)';
                    if (selectedReturn.return_type === 'replacement') return 'Producto cambiado';
                    if (selectedReturn.return_type === 'next_purchase') return 'Crédito en siguiente compra';
                    if (selectedReturn.return_type === 'other') return 'Otro';
                    return selectedReturn.return_type;
                  })()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Motivo</div>
                  <div className="font-medium">{selectedReturn.reason || '-'}</div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Artículo</th>
                      <th className="text-center p-2">Cant.</th>
                      <th className="text-right p-2">P. Unit</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((line, idx) => (
                      <tr key={line.id || idx} className="border-t">
                        <td className="p-2">{line.product_name}</td>
                        <td className="p-2 text-center">{line.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(line.unit_price)}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(selectedReturn.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ISV:</span>
                  <span className="font-medium">{formatCurrency(selectedReturn.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedReturn.total)}</span>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Notas:</span> {selectedReturn.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

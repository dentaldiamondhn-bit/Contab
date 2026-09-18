'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Truck, Plus, Download, ArrowLeft, Trash2, FileText } from 'lucide-react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface Product {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  current_cost: number;
}

interface TransferItem {
  product_id: string;
  product_code?: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface Transfer {
  id: string;
  transfer_number: string;
  transfer_date: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  total_items: number;
  total_cost: number;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  carrier: string;
  guide_number: string;
  notes: string;
  dispatched_by: string | null;
  dispatched_at: string | null;
  received_by: string | null;
  received_at: string | null;
  items?: TransferItem[];
}

interface StockRow {
  warehouse_id: string;
  product_id: string;
  stock: number;
}

const STATUS_LABEL: Record<Transfer['status'], string> = {
  pending: 'Pendiente',
  in_transit: 'En tránsito',
  received: 'Recibido',
  cancelled: 'Anulado',
};

export default function TransfersManager({ companyId }: { companyId: string }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Transfer | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formSource, setFormSource] = useState('');
  const [formDest, setFormDest] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCarrier, setFormCarrier] = useState('');
  const [formGuide, setFormGuide] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [sourceStock, setSourceStock] = useState<StockRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');

  const base = `/api/companies/${companyId}/inventory/transfers`;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(n || 0);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trRes, whRes, prodRes] = await Promise.all([
        fetch(`${base}${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`),
        fetch(`/api/companies/${companyId}/inventory/warehouses`),
        fetch(`/api/inventory/products?tenantId=${encodeURIComponent(companyId)}`),
      ]);
      const trBody = await trRes.json();
      if (!trRes.ok || !trBody.success) throw new Error(trBody?.error || 'Error al cargar traslados');
      setTransfers(trBody.data.transfers || []);
      if (whRes.ok) {
        const whBody = await whRes.json();
        if (whBody?.success) setWarehouses(whBody.data.warehouses || []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [base, companyId, statusFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadSourceStock = async (warehouseId: string) => {
    if (!warehouseId) {
      setSourceStock([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/companies/${companyId}/inventory/stock?warehouseId=${encodeURIComponent(warehouseId)}`,
      );
      const body = await res.json();
      if (res.ok && body.success) setSourceStock(body.data.stock || []);
    } catch {
      setSourceStock([]);
    }
  };

  const availableFor = (productId: string) =>
    sourceStock.find((r) => r.product_id === productId)?.stock ?? 0;

  const openDetail = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`${base}/${id}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al cargar el traslado');
      setSelected(body.data.transfer);
      setReceivedBy('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el traslado');
    }
  };

  const createTransfer = async () => {
    if (!formSource || !formDest) {
      setError('Seleccione almacén origen y destino');
      return;
    }
    if (formItems.length === 0) {
      setError('Agregue al menos un producto');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_warehouse_id: formSource,
          destination_warehouse_id: formDest,
          transfer_date: formDate,
          carrier: formCarrier,
          guide_number: formGuide,
          notes: formNotes,
          items: formItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al crear el traslado');
      setShowCreate(false);
      setFormItems([]);
      setFormCarrier('');
      setFormGuide('');
      setFormNotes('');
      await loadAll();
      openDetail(body.data.transfer.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el traslado');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'dispatch' | 'receive' | 'cancel') => {
    if (!selected) return;
    const labels = { dispatch: 'despachar', receive: 'recibir', cancel: 'anular' };
    if (!confirm(`¿${labels[action]} el traslado ${selected.transfer_number}?`)) return;
    try {
      setActing(true);
      setError(null);
      const res = await fetch(`${base}/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, by: 'system', receivedBy: receivedBy || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error en la acción');
      setSelected(body.data.transfer);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en la acción');
    } finally {
      setActing(false);
    }
  };

  const statusBadge = (s: Transfer['status']) => {
    if (s === 'received') return <Badge variant="default">Recibido</Badge>;
    if (s === 'in_transit') return <Badge variant="secondary">En tránsito</Badge>;
    if (s === 'cancelled') return <Badge variant="outline">Anulado</Badge>;
    return <Badge variant="destructive">Pendiente</Badge>;
  };

  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name || id.slice(0, 8);

  const exportCSV = () => {
    const rows = [
      ['Numero', 'Fecha', 'Origen', 'Destino', 'Estado', 'Items', 'Costo_Total', 'Transportista', 'Guia'],
      ...transfers.map((t) => [
        t.transfer_number,
        t.transfer_date,
        `"${warehouseName(t.source_warehouse_id)}"`,
        `"${warehouseName(t.destination_warehouse_id)}"`,
        t.status,
        String(t.total_items),
        Number(t.total_cost).toFixed(2),
        `"${t.carrier || ''}"`,
        t.guide_number || '',
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traslados_${companyId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-600">Cargando traslados...</CardContent>
      </Card>
    );
  }

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selected.transfer_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                {statusBadge(selected.status)}
                <span className="text-xs text-gray-500">
                  {warehouseName(selected.source_warehouse_id)} → {warehouseName(selected.destination_warehouse_id)} · {selected.transfer_date}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.status === 'pending' && (
              <Button size="sm" onClick={() => runAction('dispatch')} disabled={acting}>
                <Truck className="w-4 h-4 mr-1" /> Despachar
              </Button>
            )}
            {selected.status === 'in_transit' && (
              <>
                <Input
                  placeholder="Recibido por..."
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-40"
                />
                <Button size="sm" onClick={() => runAction('receive')} disabled={acting}>
                  Recibir
                </Button>
              </>
            )}
            {(selected.status === 'pending' || selected.status === 'in_transit') && (
              <Button size="sm" variant="destructive" onClick={() => runAction('cancel')} disabled={acting}>
                Anular
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(
                  `/api/documents/pdf?type=transfer&id=${encodeURIComponent(selected.id)}&companyId=${encodeURIComponent(companyId)}`,
                  '_blank',
                )
              }
            >
              <FileText className="w-4 h-4 mr-1" /> PDF Guía
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos logísticos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Transportista:</span><div className="font-medium">{selected.carrier || '—'}</div></div>
            <div><span className="text-gray-500">Guía:</span><div className="font-medium">{selected.guide_number || '—'}</div></div>
            <div><span className="text-gray-500">Despachado:</span><div className="font-medium">{selected.dispatched_at ? `${selected.dispatched_by || ''} · ${new Date(selected.dispatched_at).toLocaleString('es-HN')}` : '—'}</div></div>
            <div><span className="text-gray-500">Recibido:</span><div className="font-medium">{selected.received_at ? `${selected.received_by || ''} · ${new Date(selected.received_at).toLocaleString('es-HN')}` : '—'}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ítems ({selected.items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selected.items || []).map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-medium">{i.product_code || i.product_id}</div>
                      <div className="text-xs text-gray-500">{i.product_name || ''}</div>
                    </TableCell>
                    <TableCell className="text-right">{i.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.total_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-3 text-sm">
              <span className="text-gray-600 mr-2">Costo total del traslado:</span>
              <span className="font-bold">{formatCurrency(selected.total_cost)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Traslados entre almacenes</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Traslado
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreate && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Crear traslado (reserva y valida stock en origen)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Origen</Label>
                <Select
                  value={formSource}
                  onValueChange={(v) => {
                    setFormSource(v);
                    loadSourceStock(v);
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Almacén origen" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((w) => w.is_active).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino</Label>
                <Select value={formDest} onValueChange={setFormDest}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Almacén destino" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((w) => w.is_active && w.id !== formSource).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Transportista</Label>
                <Input value={formCarrier} onChange={(e) => setFormCarrier(e.target.value)} placeholder="Ej: Transporte HN" className="mt-1" />
              </div>
              <div>
                <Label>N° Guía</Label>
                <Input value={formGuide} onChange={(e) => setFormGuide(e.target.value)} placeholder="Ej: G-00123" className="mt-1" />
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observaciones" className="mt-1" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-medium">Ítems</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormItems([...formItems, { product_id: '', quantity: 1 }])}
              >
                <Plus className="w-3 h-3 mr-1" /> Agregar ítem
              </Button>
            </div>

            {formItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded">
                <div className="col-span-7">
                  <Label className="text-xs">Producto</Label>
                  <Select
                    value={item.product_id}
                    onValueChange={(v) =>
                      setFormItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, product_id: v } : p)))
                    }
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.product_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Disponible en origen: {availableFor(item.product_id)}
                    </p>
                  )}
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setFormItems((prev) =>
                        prev.map((p, idx) => (idx === i ? { ...p, quantity: parseInt(e.target.value) || 0 } : p)),
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => setFormItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormItems([]); }}>
                Cancelar
              </Button>
              <Button onClick={createTransfer} disabled={saving}>
                {saving ? 'Guardando...' : 'Crear Traslado'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Historial de traslados</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="in_transit">En tránsito</SelectItem>
                <SelectItem value="received">Recibidos</SelectItem>
                <SelectItem value="cancelled">Anulados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin traslados registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Ítems</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetail(t.id)}>
                    <TableCell className="font-medium">{t.transfer_number}</TableCell>
                    <TableCell className="text-sm">
                      {warehouseName(t.source_warehouse_id)} → {warehouseName(t.destination_warehouse_id)}
                      {t.guide_number && <span className="text-xs text-gray-500 block">Guía {t.guide_number}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{t.transfer_date}</TableCell>
                    <TableCell className="text-right">{t.total_items}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

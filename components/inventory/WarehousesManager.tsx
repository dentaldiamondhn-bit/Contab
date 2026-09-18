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
import { AlertTriangle, Plus, Download, Pencil } from 'lucide-react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  description: string;
  is_active: boolean;
}

interface StockRow {
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  min_stock: number;
  unit_cost: number;
  stock: number;
  low_stock: boolean;
}

export default function WarehousesManager({ companyId }: { companyId: string }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingMigration, setMissingMigration] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const base = `/api/companies/${companyId}/inventory/warehouses`;
  const stockUrl = (wh: string) =>
    `/api/companies/${companyId}/inventory/stock${wh !== 'all' ? `?warehouseId=${encodeURIComponent(wh)}` : ''}`;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(n || 0);

  const loadAll = useCallback(
    async (wh: string) => {
      try {
        setLoading(true);
        setError(null);
        setMissingMigration(false);
        const [whRes, stockRes] = await Promise.all([fetch(base), fetch(stockUrl(wh))]);
        const whBody = await whRes.json();
        const stockBody = await stockRes.json();
        if (!whRes.ok || !whBody.success) {
          if (/WAREHOUSE_LOGISTICS\.sql|Faltan columnas/i.test(whBody?.error || '')) {
            setMissingMigration(true);
          }
          throw new Error(whBody?.error || 'Error al cargar almacenes');
        }
        if (!stockRes.ok || !stockBody.success) {
          throw new Error(stockBody?.error || 'Error al cargar stock');
        }
        setWarehouses(whBody.data.warehouses || []);
        setStock(stockBody.data.stock || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    },
    [base],
  );

  useEffect(() => {
    loadAll(filterWarehouse);
  }, [loadAll, filterWarehouse]);

  const openCreate = () => {
    setEditing(null);
    setFormCode('');
    setFormName('');
    setFormLocation('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setFormCode(w.code);
    setFormName(w.name);
    setFormLocation(w.location || '');
    setFormDescription(w.description || '');
    setShowForm(true);
  };

  const saveWarehouse = async () => {
    if (!formCode.trim() || !formName.trim()) {
      setError('Código y nombre son requeridos');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const url = editing ? `${base}/${editing.id}` : base;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode.trim(),
          name: formName.trim(),
          location: formLocation.trim(),
          description: formDescription.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al guardar');
      setShowForm(false);
      await loadAll(filterWarehouse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (w: Warehouse) => {
    const action = w.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿${action} el almacén "${w.name}"?`)) return;
    try {
      const res = await fetch(`${base}/${w.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !w.is_active }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al actualizar');
      await loadAll(filterWarehouse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const filteredStock = stock.filter(
    (r) =>
      search === '' ||
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.product_code.toLowerCase().includes(search.toLowerCase()),
  );

  const exportCSV = () => {
    const rows = [
      ['Almacen', 'Codigo', 'Producto', 'Stock', 'Minimo', 'Costo_Unit', 'Valorizado', 'Bajo_Stock'],
      ...filteredStock.map((r) => [
        `"${r.warehouse_name}"`,
        r.product_code,
        `"${r.product_name}"`,
        String(r.stock),
        String(r.min_stock),
        r.unit_cost.toFixed(2),
        (r.stock * r.unit_cost).toFixed(2),
        r.low_stock ? 'SI' : 'NO',
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_por_almacen_${companyId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-600">Cargando almacenes...</CardContent>
      </Card>
    );
  }

  if (missingMigration) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Migración de logística no instalada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Ejecute <code className="bg-gray-100 px-1 rounded">supabase/WAREHOUSE_LOGISTICS.sql</code> en el
            SQL Editor de Supabase y recargue.
          </p>
          <Button variant="outline" onClick={() => loadAll(filterWarehouse)}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Almacenes</h2>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Almacén
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? 'Editar almacén' : 'Crear almacén'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="PRINCIPAL"
                  disabled={!!editing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Bodega Principal"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Edificio Principal - Planta Baja"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Almacén principal"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={saveWarehouse} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <Card key={w.id} className={!w.is_active ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{w.name}</CardTitle>
              <Badge variant={w.is_active ? 'default' : 'secondary'}>
                {w.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Código: {w.code}</p>
              {w.location && <p className="text-sm text-gray-500">{w.location}</p>}
              <p className="text-sm font-medium mt-2">
                Stock: {stock.filter((r) => r.warehouse_id === w.id).reduce((s, r) => s + r.stock, 0)} uds.
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(w)}>
                  {w.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Stock por almacén (kardex)</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los almacenes</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStock.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Sin movimientos registrados por almacén. Los movimientos con almacén asignado aparecen aquí.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Valorizado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((r, i) => (
                  <TableRow key={`${r.warehouse_id}-${r.product_id}-${i}`}>
                    <TableCell>
                      <div className="font-medium">{r.warehouse_name}</div>
                      <div className="text-xs text-gray-500">{r.warehouse_code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.product_code}</div>
                      <div className="text-xs text-gray-500">{r.product_name}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.stock}</TableCell>
                    <TableCell className="text-right">{r.min_stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.stock * r.unit_cost)}</TableCell>
                    <TableCell>
                      {r.low_stock ? (
                        <Badge variant="destructive">Bajo stock</Badge>
                      ) : (
                        <Badge variant="default">OK</Badge>
                      )}
                    </TableCell>
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

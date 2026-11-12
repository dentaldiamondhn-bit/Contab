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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Plus, Download, Pencil, Upload, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
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

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string; errors?: { row: number; message: string }[]; warnings?: { row: number; message: string }[] } | null>(null);

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
        setLocationCounts(stockBody.data.locationCounts || {});
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

  const TEMPLATE_HEADERS = ['code', 'name', 'location', 'description'];
  const TEMPLATE_SAMPLE = ['PRINCIPAL', 'Bodega Principal', 'Edificio Principal - Planta Baja', 'Almacén principal'];

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const rows = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE];
    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Almacenes');
      XLSX.writeFile(wb, 'plantilla_almacenes.xlsx');
      return;
    }
    const escapeCsv = (v: string) => {
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = '\ufeff' + rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_almacenes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportResult({ success: true, message: 'Seleccione un archivo para continuar' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('tenantId', companyId);
      const res = await fetch(`${base}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult({
          success: true,
          message: data.message || 'Importación completada',
          errors: data.errors || [],
          warnings: data.warnings || [],
        });
        loadAll(filterWarehouse);
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }, 1200);
      } else {
        setImportResult({ success: false, message: data?.error || 'Error al importar el archivo' });
      }
    } catch (e) {
      console.error('Warehouses import exception:', e);
      setImportResult({ success: false, message: 'Error al importar el archivo' });
    } finally {
      setImporting(false);
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
        <div>
          <h2 className="text-xl font-bold">Almacenes</h2>
          <p className="text-sm text-gray-500">
            Bodegas y centros de distribución para el control de stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setShowImportModal(true); }}>
            <Upload className="w-4 h-4 mr-2" /> Subir Archivo
          </Button>
          <Button variant="outline" onClick={() => handleDownloadTemplate('xlsx')}>
            <Download className="w-4 h-4 mr-2" /> Plantilla Excel
          </Button>
          <Button variant="outline" onClick={() => handleDownloadTemplate('csv')}>
            <FileText className="w-4 h-4 mr-2" /> Plantilla CSV
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Almacén
          </Button>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Almacenes</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ubicación</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Ubicaciones</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {warehouses.map((w) => (
                <tr key={w.id} className={!w.is_active ? 'opacity-60 hover:bg-gray-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium">{w.code}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{w.name}</div>
                    {w.description && <div className="text-xs text-gray-500">{w.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{w.location || '—'}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium">
                    {locationCounts[w.id] ?? 0}
                    {locationCounts[w.id] ? (
                      <span className="block text-xs text-gray-400">ubicac.</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {stock.filter((r) => r.warehouse_id === w.id).reduce((s, r) => s + r.stock, 0)} uds.
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={w.is_active ? 'default' : 'secondary'}>
                      {w.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="ml-1" onClick={() => toggleActive(w)}>
                      {w.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
            <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Almacén</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Producto</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stock</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Mínimo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Valorizado</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStock.map((r, i) => (
                    <tr key={`${r.warehouse_id}-${r.product_id}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{r.warehouse_name}</div>
                        <div className="text-xs text-gray-500">{r.warehouse_code}</div>
                        {locationCounts[r.warehouse_id] != null && (
                          <div className="text-xs text-gray-500">
                            {locationCounts[r.warehouse_id] || 0} ubicacion{locationCounts[r.warehouse_id] === 1 ? '' : 'es'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{r.product_code}</div>
                        <div className="text-xs text-gray-500">{r.product_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{r.stock}</td>
                      <td className="px-4 py-3 text-sm text-right">{r.min_stock}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(r.stock * r.unit_cost)}</td>
                      <td className="px-4 py-3 text-sm">
                        {r.low_stock ? (
                          <Badge variant="destructive">Bajo stock</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Almacenes desde Archivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                Suba un archivo <strong>CSV</strong> o <strong>Excel (.xlsx / .xls)</strong> con los almacenes.
                Requiere las columnas <code className="font-mono text-xs bg-muted px-1 rounded">code</code> y{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">name</code>. Los códigos ya existentes
                se omiten automáticamente.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-500">Descargue la plantilla para ver el formato:</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('xlsx')}>
                  <Download className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('csv')}>
                  <Download className="w-4 h-4 mr-2" /> CSV
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportResult(null);
                }}
              />
            </div>

            {importResult && (
              <>
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  <AlertDescription>
                    {importResult.message}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto text-sm">
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="text-xs">Fila {err.row > 0 ? err.row : '—'}: {err.message}</div>
                        ))}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <Alert className="border-yellow-300 bg-yellow-50 text-yellow-800">
                    <AlertDescription>
                      <div className="font-medium text-sm mb-1">Avisos:</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto text-sm">
                        {importResult.warnings.map((warn, i) => (
                          <div key={i} className="text-xs">Fila {warn.row > 0 ? warn.row : '—'}: {warn.message}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cerrar</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

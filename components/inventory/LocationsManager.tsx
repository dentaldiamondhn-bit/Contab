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
import { AlertTriangle, Plus, Pencil, MapPin, Trash2, Upload, Download, FileText, Warehouse } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LocationPhotoUploader from '@/components/inventory/LocationPhotoUploader';
import * as XLSX from 'xlsx';

interface LocationRow {
  id: string;
  code: string | null;
  name: string;
  aisle: string | null;
  shelf: string | null;
  description: string | null;
  is_active: boolean;
  image_url?: string | null;
  warehouse_id?: string | null;
  warehouse?: { id: string; code: string | null; name: string } | null;
  product_count?: number;
}

interface WarehouseRow {
  id: string;
  code: string;
  name: string;
}

export default function LocationsManager({ companyId }: { companyId: string }) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingMigration, setMissingMigration] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAisle, setFormAisle] = useState('');
  const [formShelf, setFormShelf] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string; errors?: { row: number; message: string }[]; warnings?: { row: number; message: string }[] } | null>(null);

  const base = `/api/companies/${companyId}/inventory/locations`;
  const baseWarehouses = `/api/companies/${companyId}/inventory/warehouses`;

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMissingMigration(false);
      const [res, whRes] = await Promise.all([fetch(base), fetch(baseWarehouses)]);
      const body = await res.json();
      const whBody = whRes.ok ? await whRes.json() : null;
      if (!res.ok || !body.success) {
        if (/017_location_master\.sql|Faltan columnas/i.test(body?.error || '')) {
          setMissingMigration(true);
        }
        throw new Error(body?.error || 'Error al cargar ubicaciones');
      }
      setLocations(body.data.locations || []);
      setWarehouses(whBody?.data?.warehouses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [base, baseWarehouses]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openCreate = () => {
    setEditing(null);
    setFormCode('');
    setFormName('');
    setFormAisle('');
    setFormShelf('');
    setFormDescription('');
    setFormWarehouseId('');
    setFormImageUrl('');
    setShowForm(true);
  };

  const openEdit = (l: LocationRow) => {
    setEditing(l);
    setFormCode(l.code || '');
    setFormName(l.name);
    setFormAisle(l.aisle || '');
    setFormShelf(l.shelf || '');
    setFormDescription(l.description || '');
    setFormWarehouseId(l.warehouse_id || '');
    setFormImageUrl(l.image_url || '');
    setShowForm(true);
  };

  const saveLocation = async () => {
    if (!formName.trim()) {
      setError('Nombre es requerido');
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
          aisle: formAisle.trim(),
          shelf: formShelf.trim(),
          description: formDescription.trim(),
          image_url: formImageUrl,
          warehouse_id: formWarehouseId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al guardar');
      setShowForm(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (l: LocationRow) => {
    const action = l.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿${action} la ubicación "${l.name}"?`)) return;
    try {
      const res = await fetch(`${base}/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !l.is_active }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al actualizar');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const TEMPLATE_HEADERS = ['code', 'name', 'aisle', 'shelf', 'description', 'warehouse'];
  const TEMPLATE_SAMPLE = ['P1', 'Pasillo 1 - Estante A', 'Pasillo 1', 'Estante A', 'Materiales de consumo', 'PRINCIPAL'];

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const rows = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE];
    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ubicaciones');
      XLSX.writeFile(wb, 'plantilla_ubicaciones.xlsx');
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
    a.download = 'plantilla_ubicaciones.csv';
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
        loadAll();
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }, 1200);
      } else {
        setImportResult({ success: false, message: data?.error || 'Error al importar el archivo' });
      }
    } catch (e) {
      console.error('Locations import exception:', e);
      setImportResult({ success: false, message: 'Error al importar el archivo' });
    } finally {
      setImporting(false);
    }
  };

  const removeLocation = async (l: LocationRow) => {
    if (!confirm(`¿Eliminar la ubicación "${l.name}"? Los productos vinculados quedarán sin ubicación.`)) return;
    try {
      const res = await fetch(`${base}/${l.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al eliminar');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-600">Cargando ubicaciones...</CardContent>
      </Card>
    );
  }

  if (missingMigration) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Migración de ubicaciones no instalada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Ejecute <code className="bg-gray-100 px-1 rounded">prisma/migrations/017_location_master.sql</code>
            {' '}y <code className="bg-gray-100 px-1 rounded">supabase/LOCATION_MASTER.sql</code> en el
            SQL Editor de Supabase y recargue.
          </p>
          <Button variant="outline" onClick={() => loadAll()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Ubicaciones</h2>
          <p className="text-sm text-gray-500">
            Ubicaciones físicas del inventario (pasillo/estante) para asignar a los productos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openImportModal}>
            <Upload className="w-4 h-4 mr-2" /> Subir Archivo
          </Button>
          <Button variant="outline" onClick={() => handleDownloadTemplate('xlsx')}>
            <Download className="w-4 h-4 mr-2" /> Plantilla Excel
          </Button>
          <Button variant="outline" onClick={() => handleDownloadTemplate('csv')}>
            <FileText className="w-4 h-4 mr-2" /> Plantilla CSV
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Ubicación
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? 'Editar ubicación' : 'Crear ubicación'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="P1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Pasillo 1 - Estante A"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Pasillo</Label>
                <Input
                  value={formAisle}
                  onChange={(e) => setFormAisle(e.target.value)}
                  placeholder="Pasillo 1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Estante</Label>
                <Input
                  value={formShelf}
                  onChange={(e) => setFormShelf(e.target.value)}
                  placeholder="Estante A"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Almacén</Label>
                <Select value={formWarehouseId || 'none'} onValueChange={(v) => setFormWarehouseId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin almacén</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Referencia adicional"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Foto</Label>
                <div className="mt-1">
                  <LocationPhotoUploader
                    imageUrl={formImageUrl}
                    tenantId={companyId}
                    companyId={companyId}
                    locationId={editing?.id}
                    onImageUrlChange={setFormImageUrl}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={saveLocation} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {locations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-gray-500">
            <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            Aún no hay ubicaciones. Crea la primera para asignarla a los productos.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Foto</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Almacén</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Pasillo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Estante</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Productos</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {locations.map((l) => (
                    <tr key={l.id} className={!l.is_active ? 'opacity-60 hover:bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.name} className="w-10 h-10 rounded object-cover border border-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{l.code || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{l.name}</span>
                        </div>
                        {l.description && (
                          <div className="text-xs text-gray-500">{l.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {l.warehouse ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                            {l.warehouse.name}
                            {l.warehouse.code && <span className="text-xs text-gray-400">({l.warehouse.code})</span>}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{l.aisle || '—'}</td>
                      <td className="px-4 py-3 text-sm">{l.shelf || '—'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span>{l.product_count ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={l.is_active ? 'default' : 'secondary'}>
                          {l.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="ml-1" onClick={() => toggleActive(l)}>
                          {l.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="outline" size="sm" className="ml-1 text-red-600" onClick={() => removeLocation(l)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Ubicaciones desde Archivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                Suba un archivo <strong>CSV</strong> o <strong>Excel (.xlsx / .xls)</strong> con las ubicaciones.
                Requiere la columna <code className="font-mono text-xs bg-muted px-1 rounded">name</code>. Los
                nombres ya existentes se omiten automáticamente.
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
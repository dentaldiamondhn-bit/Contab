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
import { ArrowLeftRight, Download, Search } from 'lucide-react';

interface VariationRow {
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  fromStock: number;
  toStock: number;
  varAbs: number;
  fromIn: number;
  fromOut: number;
  toIn: number;
  toOut: number;
}

interface Warehouse {
  id: string;
  name: string;
  is_active: boolean;
}

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function InventoryVariations({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<VariationRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [from, setFrom] = useState(prevMonth());
  const [to, setTo] = useState(thisMonth());
  const [warehouseId, setWarehouseId] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/inventory/warehouses`);
      const body = await res.json();
      if (res.ok && body.success) setWarehouses(body.data.warehouses || []);
    } catch {
      // Opcional: el filtro de almacén queda deshabilitado.
    }
  }, [companyId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ from, to });
      if (warehouseId !== 'all') params.set('warehouseId', warehouseId);
      const res = await fetch(`/api/companies/${companyId}/inventory/variations?${params.toString()}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al cargar');
      setRows(body.data.variations.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to, warehouseId]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter(
    (r) =>
      (!onlyChanged || r.varAbs !== 0) &&
      (search === '' ||
        r.product_name.toLowerCase().includes(search.toLowerCase()) ||
        r.product_code.toLowerCase().includes(search.toLowerCase()))
  );

  const exportCSV = () => {
    const header = ['Almacen', 'Codigo', 'Producto', `Stock_${from}`, `Stock_${to}`, 'Variacion', `IN_${from}`, `OUT_${from}`, `IN_${to}`, `OUT_${to}`];
    const lines = [
      header,
      ...filtered.map((r) => [
        `"${r.warehouse_name}"`,
        r.product_code,
        `"${r.product_name}"`,
        String(r.fromStock),
        String(r.toStock),
        String(r.varAbs),
        String(r.fromIn),
        String(r.fromOut),
        String(r.toIn),
        String(r.toOut),
      ]),
    ];
    const blob = new Blob([lines.map((l) => l.join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variaciones_inventario_${from}_vs_${to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" /> Variaciones de Inventario
        </h2>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Mes base</Label>
              <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-44" />
            </div>
            <div>
              <Label>Mes a comparar</Label>
              <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-44" />
            </div>
            <div>
              <Label>Almacén</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="mt-1 w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1 w-48"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
              <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
              Solo con cambios
            </label>
            <Button onClick={load} disabled={loading} className="flex items-center gap-2">
              <Search className="w-4 h-4" /> {loading ? 'Cargando...' : 'Comparar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {from} vs {to} ({filtered.length} líneas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-gray-500 text-center py-4">Calculando variaciones...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Sin variaciones con los filtros actuales.</p>
          )}
          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Almacén / Producto</TableHead>
                  <TableHead className="text-right">Stock {from}</TableHead>
                  <TableHead className="text-right">Stock {to}</TableHead>
                  <TableHead className="text-right">Variación</TableHead>
                  <TableHead className="text-right">IN/OUT {from}</TableHead>
                  <TableHead className="text-right">IN/OUT {to}</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={`${r.warehouse_id}-${r.product_id}-${i}`}>
                    <TableCell>
                      <div className="text-xs text-gray-500">{r.warehouse_name}</div>
                      <div className="font-medium">{r.product_code}</div>
                      <div className="text-xs text-gray-500">{r.product_name}</div>
                    </TableCell>
                    <TableCell className="text-right">{r.fromStock}</TableCell>
                    <TableCell className="text-right font-medium">{r.toStock}</TableCell>
                    <TableCell className={`text-right font-medium ${r.varAbs < 0 ? 'text-red-600' : r.varAbs > 0 ? 'text-green-600' : ''}`}>
                      {r.varAbs > 0 ? `+${r.varAbs}` : r.varAbs}
                    </TableCell>
                    <TableCell className="text-right text-sm">+{r.fromIn} / −{r.fromOut}</TableCell>
                    <TableCell className="text-right text-sm">+{r.toIn} / −{r.toOut}</TableCell>
                    <TableCell>
                      {r.varAbs > 0 ? (
                        <Badge variant="default">Sube</Badge>
                      ) : r.varAbs < 0 ? (
                        <Badge variant="destructive">Baja</Badge>
                      ) : (
                        <Badge variant="outline">Igual</Badge>
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

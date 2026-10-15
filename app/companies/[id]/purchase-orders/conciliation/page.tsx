'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Reporte de conciliación 3 vías (O.C. → Recepción → Factura), solo lectura.
 * Con `?orderId=` muestra el detalle de una orden; sin él, la lista de todas
 * las órdenes de la empresa con sus diferencias. Los importes vienen en
 * lempiras (igual que el resto del módulo de compras).
 */

interface ConciliacionLinea {
  product_id: string | null;
  product_name: string;
  ordered_qty: number;
  ordered_unit_price: number;
  received_qty: number;
  invoiced_qty: number;
  invoiced_unit_price: number;
  qty_variance: number;
  invoice_variance: number;
  price_variance: number;
  estado: string;
}

interface Totales {
  ordered: number;
  received: number;
  invoiced: number;
}

interface OrdenConciliacion {
  id: string;
  order_number: string;
  status: string;
  supplier?: { name?: string } | null;
}

interface DetalleConciliacion {
  order: OrdenConciliacion;
  lines: ConciliacionLinea[];
  receipts: any[];
  totals: Totales;
  hayDiscrepancias: boolean;
}

interface ResumenConciliacion {
  order: OrdenConciliacion;
  totals: Totales;
  hayDiscrepancias: boolean;
  lineasConProblema: ConciliacionLinea[];
}

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-800' },
  SIN_RECIBIR: { label: 'Sin recibir', className: 'bg-gray-100 text-gray-800' },
  PARCIAL: { label: 'Parcial', className: 'bg-amber-100 text-amber-800' },
  EXCESO: { label: 'Exceso', className: 'bg-orange-100 text-orange-800' },
  FALTANTE_FACTURA: { label: 'Falta factura', className: 'bg-red-100 text-red-800' },
  DIF_PRECIO: { label: 'Diferencia de precio', className: 'bg-rose-100 text-rose-800' },
};

const formatCurrency = (amount: number) =>
  `L ${(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function EstadoBadge({ estado }: { estado: string }) {
  const config = ESTADO_CONFIG[estado] || { label: estado, className: 'bg-gray-100 text-gray-800' };
  return <Badge className={config.className}>{config.label}</Badge>;
}

export default function PurchaseOrderConciliationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  const orderId = searchParams.get('orderId');

  const [tolerancia, setTolerancia] = useState('0');
  const [toleranciaPrecio, setToleranciaPrecio] = useState('0.01');
  const [soloConDiscrepancias, setSoloConDiscrepancias] = useState(false);
  const [detalle, setDetalle] = useState<DetalleConciliacion | null>(null);
  const [resumen, setResumen] = useState<ResumenConciliacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ companyId });
      if (orderId) qs.set('orderId', orderId);
      if (tolerancia.trim() !== '') qs.set('tolerancia', tolerancia.trim());
      if (toleranciaPrecio.trim() !== '') qs.set('toleranciaPrecio', toleranciaPrecio.trim());
      if (!orderId && soloConDiscrepancias) qs.set('soloConDiscrepancias', '1');

      const res = await fetch(`/api/purchase-orders/conciliation?${qs.toString()}`);
      if (res.status === 404) {
        setError('Orden de compra no encontrada.');
        setDetalle(null);
        setResumen([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'No se pudo cargar la conciliación.');
        return;
      }
      const data = await res.json();
      if (orderId) {
        setDetalle(data);
        setResumen([]);
      } else {
        setResumen(Array.isArray(data) ? data : []);
        setDetalle(null);
      }
    } catch (e) {
      console.error('Error loading conciliation:', e);
      setError('Error de red al cargar la conciliación.');
    } finally {
      setLoading(false);
    }
  }, [companyId, orderId, tolerancia, toleranciaPrecio, soloConDiscrepancias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const volver = () => router.push(`/companies/${companyId}/purchase-orders`);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={volver}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Órdenes
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conciliación de Órdenes</h1>
            <p className="text-gray-500">Ordenado (O.C.) vs recibido vs facturado — solo lectura</p>
          </div>
        </div>
        <Button variant="outline" onClick={cargar} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Tolerancia cantidades</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={tolerancia}
                onChange={(e) => setTolerancia(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Tolerancia precio</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={toleranciaPrecio}
                onChange={(e) => setToleranciaPrecio(e.target.value)}
                className="w-40"
              />
            </div>
            {!orderId && (
              <label className="flex items-center gap-2 text-sm pb-3">
                <input
                  type="checkbox"
                  checked={soloConDiscrepancias}
                  onChange={(e) => setSoloConDiscrepancias(e.target.checked)}
                />
                Solo con diferencias
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : orderId && detalle ? (
        <DetalleConciliacionView detalle={detalle} />
      ) : !orderId ? (
        <ListaConciliacionView
          filas={resumen}
          onVer={(id) => router.push(`/companies/${companyId}/purchase-orders/conciliation?orderId=${id}`)}
        />
      ) : null}
    </div>
  );
}

function DetalleConciliacionView({ detalle }: { detalle: DetalleConciliacion }) {
  const { order, lines, receipts, totals, hayDiscrepancias } = detalle;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {hayDiscrepancias ? (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {order.order_number}
            <span className="text-sm font-normal text-gray-500">{order.supplier?.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Ordenado</div>
              <div className="text-xl font-bold">{formatCurrency(totals.ordered)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Recibido</div>
              <div className="text-xl font-bold">{formatCurrency(totals.received)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Facturado</div>
              <div className="text-xl font-bold">{formatCurrency(totals.invoiced)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por artículo</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              La orden no tiene artículos (recepción por totales de cabecera).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Artículo</th>
                    <th className="text-center p-2">Pedido</th>
                    <th className="text-center p-2">Recibido</th>
                    <th className="text-center p-2">Facturado</th>
                    <th className="text-right p-2">P. Orden</th>
                    <th className="text-right p-2">P. Factura</th>
                    <th className="text-center p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{l.product_name}</td>
                      <td className="p-2 text-center">{l.ordered_qty}</td>
                      <td className="p-2 text-center">{l.received_qty}</td>
                      <td className="p-2 text-center">{l.invoiced_qty}</td>
                      <td className="p-2 text-right">{formatCurrency(l.ordered_unit_price)}</td>
                      <td className="p-2 text-right">{formatCurrency(l.invoiced_unit_price)}</td>
                      <td className="p-2 text-center">
                        <EstadoBadge estado={l.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recepciones ({receipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Sin recepciones registradas.</div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-3 text-sm">
                  <div>
                    <div className="font-medium">{r.invoice_number}</div>
                    <div className="text-gray-500">
                      {r.invoice_date ? new Date(r.invoice_date).toLocaleDateString() : '-'}
                      {r.cai ? ` · CAI ${r.cai}` : ''}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Compra registrada
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListaConciliacionView({
  filas,
  onVer,
}: {
  filas: ResumenConciliacion[];
  onVer: (id: string) => void;
}) {
  if (filas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No hay órdenes para mostrar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Órdenes ({filas.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Orden</th>
                <th className="text-left p-2">Proveedor</th>
                <th className="text-right p-2">Ordenado</th>
                <th className="text-right p-2">Recibido</th>
                <th className="text-right p-2">Facturado</th>
                <th className="text-center p-2">Diferencias</th>
                <th className="text-center p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.order.id} className="border-t">
                  <td className="p-2 font-medium">{f.order.order_number}</td>
                  <td className="p-2">{f.order.supplier?.name}</td>
                  <td className="p-2 text-right">{formatCurrency(f.totals.ordered)}</td>
                  <td className="p-2 text-right">{formatCurrency(f.totals.received)}</td>
                  <td className="p-2 text-right">{formatCurrency(f.totals.invoiced)}</td>
                  <td className="p-2 text-center">
                    {f.hayDiscrepancias ? (
                      <Badge className="bg-amber-100 text-amber-800">{f.lineasConProblema.length}</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        OK
                      </Badge>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <Button variant="outline" size="sm" onClick={() => onVer(f.order.id)}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download, Printer, DollarSign } from "lucide-react";

export default function FlujoEfectivoPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/flujo-efectivo?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  const totalIngresos = data.reduce((s, d) => s + Number(d.ingresos), 0);
  const totalEgresos = data.reduce((s, d) => s + Number(d.egresos), 0);
  const flujoAcumulado = totalIngresos - totalEgresos;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-cyan-600" />
            Flujo de Efectivo
          </h1>
          <p className="text-sm text-gray-500">{currentTenant?.businessName || "Empresa"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando datos...</div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /> Total Ingresos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{fmt(totalIngresos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600" /> Total Egresos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{fmt(totalEgresos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Flujo Neto Acumulado</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${flujoAcumulado >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fmt(flujoAcumulado)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle mensual */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Flujo Mensual</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Egresos</TableHead>
                      <TableHead className="text-right">Flujo Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{d.mes}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{fmt(Number(d.ingresos))}</TableCell>
                        <TableCell className="text-right text-sm text-red-600">{fmt(Number(d.egresos))}</TableCell>
                        <TableCell className={`text-right text-sm font-bold ${Number(d.flujo_neto) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {fmt(Number(d.flujo_neto))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">Sin datos de flujo de efectivo</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

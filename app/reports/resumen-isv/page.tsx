"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, Printer, TrendingUp, TrendingDown } from "lucide-react";

export default function ResumenISVPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/resumen-isv?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-red-600" />
            Resumen ISV
          </h1>
          <p className="text-sm text-gray-500">Impuesto Sobre Ventas por periodo - {currentTenant?.businessName}</p>
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
          {/* Resumen por tasa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">ISV 15% - Tasa General</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {fmt(data.reduce((s, d) => s + Number(d.isv_15), 0))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Base: {fmt(data.reduce((s, d) => s + Number(d.base_gravada_15), 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">ISV 18% - Tasa Especifica</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {fmt(data.reduce((s, d) => s + Number(d.isv_18), 0))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Base: {fmt(data.reduce((s, d) => s + Number(d.base_gravada_18), 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total ISV */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Total ISV a Pagar</div>
                <div className="text-3xl font-bold text-red-600">
                  {fmt(data.reduce((s, d) => s + Number(d.isv_total), 0))}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {data.reduce((s, d) => s + Number(d.facturas), 0)} facturas en {data.length} periodos
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalle mensual */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalle Mensual</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Base 15%</TableHead>
                      <TableHead className="text-right">ISV 15%</TableHead>
                      <TableHead className="text-right">Base 18%</TableHead>
                      <TableHead className="text-right">ISV 18%</TableHead>
                      <TableHead className="text-right">ISV Total</TableHead>
                      <TableHead className="text-right">Facturas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{d.mes}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(d.base_gravada_15))}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(d.isv_15))}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(d.base_gravada_18))}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(d.isv_18))}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-red-600">{fmt(Number(d.isv_total))}</TableCell>
                        <TableCell className="text-right text-sm"><Badge variant="secondary">{d.facturas}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Sin datos de ISV</TableCell></TableRow>
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

"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Printer, Trophy, TrendingUp } from "lucide-react";

export default function TopClientesPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/top-clientes?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });
  const totalVentas = data.reduce((s, c) => s + Number(c.total_ventas), 0);
  const totalFacturas = data.reduce((s, c) => s + Number(c.num_facturas), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-green-600" />
            Top Clientes
          </h1>
          <p className="text-sm text-gray-500">Clientes con mas facturacion - {currentTenant?.businessName}</p>
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
          {/* Top 3 */}
          {data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.slice(0, 3).map((c, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {i === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {i === 1 && <TrendingUp className="w-4 h-4 text-gray-400" />}
                      {i === 2 && <TrendingUp className="w-4 h-4 text-orange-400" />}
                      <span className="truncate">{c.client_name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">#{i + 1}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{fmt(Number(c.total_ventas))}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.num_facturas} facturas</div>
                    {c.client_rtn && <div className="text-xs font-mono text-gray-400 mt-1">RTN: {c.client_rtn}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Todos los Clientes ({data.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>RTN</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Facturas</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">ISV</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Primera Venta</TableHead>
                      <TableHead>Ultima Venta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-bold">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{c.client_name}</TableCell>
                        <TableCell className="text-sm font-mono text-xs">{c.client_rtn}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.client_email}</TableCell>
                        <TableCell className="text-right text-sm">{c.num_facturas}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(c.total_base))}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(c.total_isv))}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-green-600">{fmt(Number(c.total_ventas))}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.primera_venta}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.ultima_venta}</TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">Sin clientes registrados</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{fmt(totalVentas)}</div>
                  <div className="text-xs text-gray-500">Ventas Totales</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{totalFacturas}</div>
                  <div className="text-xs text-gray-500">Facturas Totales</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

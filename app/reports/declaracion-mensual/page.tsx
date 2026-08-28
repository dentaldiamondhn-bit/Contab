"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Printer } from "lucide-react";

export default function DeclaracionMensualPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/declaracion-mensual?tenantId=${currentTenant.id}`);
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
            <Calendar className="w-6 h-6 text-red-600" />
            Declaracion Mensual SAR
          </h1>
          <p className="text-sm text-gray-500">ISV a pagar: Ventas vs Compras - {currentTenant?.businessName}</p>
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
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Ventas Base</TableHead>
                    <TableHead className="text-right">ISV Ventas</TableHead>
                    <TableHead className="text-right">Compras Base</TableHead>
                    <TableHead className="text-right">ISV Compras</TableHead>
                    <TableHead className="text-right">ISV a Pagar</TableHead>
                    <TableHead className="text-center"># Facturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{d.mes}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(d.ventas_base))}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(d.ventas_isv))}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(d.compras_base))}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(d.compras_isv))}</TableCell>
                      <TableCell className="text-right text-sm font-bold">
                        <span className={Number(d.isv_a_pagar) >= 0 ? "text-red-600" : "text-green-600"}>
                          {fmt(Number(d.isv_a_pagar))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {Number(d.num_ventas)}V / {Number(d.num_compras)}C
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Sin datos de declaracion mensual</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

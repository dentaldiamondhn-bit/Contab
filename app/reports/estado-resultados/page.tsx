"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FileText, Download, Printer, TrendingUp, TrendingDown } from "lucide-react";

export default function EstadoResultadosPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/estado-resultados?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const ingresos = data.filter((a) => a.type === "REVENUE");
  const gastos = data.filter((a) => a.type === "EXPENSE");

  const totalIngresos = ingresos.reduce((s, a) => s + Number(a.balance), 0);
  const totalGastos = gastos.reduce((s, a) => s + Number(a.balance), 0);
  const utilidadNeta = totalIngresos - totalGastos;

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            Estado de Resultados
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingresos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingresos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {a.nature === 'DEBIT' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(Number(a.balance))}</TableCell>
                    </TableRow>
                  ))}
                  {ingresos.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-400">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total Ingresos</span>
                <span className="text-green-700">{fmt(totalIngresos)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Gastos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" /> Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {a.nature === 'DEBIT' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(Number(a.balance))}</TableCell>
                    </TableRow>
                  ))}
                  {gastos.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-400">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total Gastos</span>
                <span className="text-red-700">{fmt(totalGastos)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Utilidad Neta */}
      {!loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Utilidad Neta del Periodo</div>
              <div className={`text-3xl font-bold ${utilidadNeta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(utilidadNeta)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

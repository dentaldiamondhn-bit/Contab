"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Calculator, Download, Printer } from "lucide-react";

export default function BalanzaComprobacionPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/balanza-comprobacion?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const totalDebitos = data.reduce((s, a) => s + Number(a.total_debitos), 0);
  const totalCreditos = data.reduce((s, a) => s + Number(a.total_creditos), 0);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            Balanza de Comprobacion
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
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Debitos</TableHead>
                  <TableHead className="text-right">Creditos</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-mono">{a.code}</TableCell>
                    <TableCell className="text-sm">{a.name}</TableCell>
                    <TableCell className="text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.type === "ASSET" ? "bg-blue-100 text-blue-800" :
                        a.type === "LIABILITY" ? "bg-red-100 text-red-800" :
                        a.type === "EQUITY" ? "bg-green-100 text-green-800" :
                        a.type === "REVENUE" ? "bg-emerald-100 text-emerald-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {a.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(a.total_debitos))}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(a.total_creditos))}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${Number(a.saldo) >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmt(Number(a.saldo))}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400">Sin datos contables</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {data.length > 0 && (
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500">Total Debitos</div>
                  <div className="text-lg font-bold text-blue-600">{fmt(totalDebitos)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total Creditos</div>
                  <div className="text-lg font-bold text-red-600">{fmt(totalCreditos)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Diferencia</div>
                  <div className={`text-lg font-bold ${Math.abs(totalDebitos - totalCreditos) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(totalDebitos - totalCreditos)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

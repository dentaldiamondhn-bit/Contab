"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Printer } from "lucide-react";

export default function LibroDiarioPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/libro-diario?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const filtered = data.filter((r) =>
    !filtro || r.description?.toLowerCase().includes(filtro.toLowerCase()) ||
    r.account_name?.toLowerCase().includes(filtro.toLowerCase()) ||
    r.voucher_type?.toLowerCase().includes(filtro.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Libro Diario
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

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por descripcion, cuenta o comprobante..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
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
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.entry_id || i}>
                      <TableCell className="text-sm whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="secondary" className="text-xs">{r.voucher_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{r.voucher_number}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{r.account_code}</span> {r.account_name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{r.description || r.entry_description}</TableCell>
                      <TableCell className="text-right text-sm">
                        {r.entry_type === "DEBIT" ? fmt(Number(r.amount)) : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.entry_type === "CREDIT" ? fmt(Number(r.amount)) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Sin movimientos registrados</TableCell></TableRow>
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

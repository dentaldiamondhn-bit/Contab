"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt, Download, Printer, BookOpen } from "lucide-react";

export default function LibrosContablesPage() {
  const { currentTenant } = useTenant();
  const [ventas, setVentas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resVentas, resCompras] = await Promise.all([
          fetch(`/api/reports/libro-ventas?tenantId=${currentTenant.id}`),
          fetch(`/api/reports/libro-compras?tenantId=${currentTenant.id}`),
        ]);
        const jsonVentas = await resVentas.json();
        const jsonCompras = await resCompras.json();
        setVentas(jsonVentas.data || []);
        setCompras(jsonCompras.data || []);
      } catch { setVentas([]); setCompras([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  const totalVentasBase = ventas.reduce((s, v) => s + Number(v.subtotal), 0);
  const totalVentasISV = ventas.reduce((s, v) => s + Number(v.tax_amount), 0);
  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
  const totalComprasBase = compras.reduce((s, c) => s + Number(c.subtotal), 0);
  const totalComprasISV = compras.reduce((s, c) => s + Number(c.tax_amount), 0);
  const totalCompras = compras.reduce((s, c) => s + Number(c.total), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Libros de Compras y Ventas
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
        <Tabs defaultValue="ventas">
          <TabsList>
            <TabsTrigger value="ventas" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Libro de Ventas ({ventas.length})
            </TabsTrigger>
            <TabsTrigger value="compras" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Libro de Compras ({compras.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ventas">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600">Ventas con Debito Fiscal ISV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>RTN</TableHead>
                        <TableHead>CAI</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">ISV</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventas.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-sm whitespace-nowrap">{v.invoice_date}</TableCell>
                          <TableCell className="text-sm font-mono">{v.invoice_number}</TableCell>
                          <TableCell className="text-sm">{v.customer_name}</TableCell>
                          <TableCell className="text-sm font-mono text-xs">{v.customer_rtn}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-500 max-w-[120px] truncate">{v.cai}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(Number(v.subtotal))}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(Number(v.tax_amount))}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmt(Number(v.total))}</TableCell>
                        </TableRow>
                      ))}
                      {ventas.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">Sin facturas de ventas</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {ventas.length > 0 && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-xs text-gray-500">Base Gravada</div><div className="text-lg font-bold text-blue-600">{fmt(totalVentasBase)}</div></div>
                    <div><div className="text-xs text-gray-500">ISV Debito Fiscal</div><div className="text-lg font-bold text-red-600">{fmt(totalVentasISV)}</div></div>
                    <div><div className="text-xs text-gray-500">Total Ventas</div><div className="text-lg font-bold text-green-600">{fmt(totalVentas)}</div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compras">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600">Compras con Credito Fiscal ISV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>RTN</TableHead>
                        <TableHead>CAI</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">ISV</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compras.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm whitespace-nowrap">{c.invoice_date}</TableCell>
                          <TableCell className="text-sm font-mono">{c.invoice_number}</TableCell>
                          <TableCell className="text-sm">{c.supplier_name}</TableCell>
                          <TableCell className="text-sm font-mono text-xs">{c.supplier_rtn}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-500 max-w-[120px] truncate">{c.cai}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(Number(c.subtotal))}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(Number(c.tax_amount))}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmt(Number(c.total))}</TableCell>
                        </TableRow>
                      ))}
                      {compras.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">Sin facturas de compras</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {compras.length > 0 && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-xs text-gray-500">Base Gravada</div><div className="text-lg font-bold text-blue-600">{fmt(totalComprasBase)}</div></div>
                    <div><div className="text-xs text-gray-500">ISV Credito Fiscal</div><div className="text-lg font-bold text-green-600">{fmt(totalComprasISV)}</div></div>
                    <div><div className="text-xs text-gray-500">Total Compras</div><div className="text-lg font-bold text-orange-600">{fmt(totalCompras)}</div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

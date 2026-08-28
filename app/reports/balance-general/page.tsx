"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Building2, Download, Printer } from "lucide-react";

export default function BalanceGeneralPage() {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/balance-general?tenantId=${currentTenant.id}`);
        const json = await res.json();
        setData(json.data || []);
      } catch { setData([]); }
      setLoading(false);
    };
    fetchData();
  }, [currentTenant?.id]);

  const activos = data.filter((a) => a.type === "ASSET");
  const pasivos = data.filter((a) => a.type === "LIABILITY");
  const patrimonio = data.filter((a) => a.type === "EQUITY");

  const totalActivos = activos.reduce((s, a) => s + Number(a.balance), 0);
  const totalPasivos = pasivos.reduce((s, a) => s + Number(a.balance), 0);
  const totalPatrimonio = patrimonio.reduce((s, a) => s + Number(a.balance), 0);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Balance General
          </h1>
          <p className="text-sm text-gray-500">{currentTenant?.businessName || "Empresa"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-blue-700">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {a.nature === 'DEBIT' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(a.balance))}</TableCell>
                    </TableRow>
                  ))}
                  {activos.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-400">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total Activos</span>
                <span className="text-blue-700">{fmt(totalActivos)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pasivos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Pasivos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pasivos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {a.nature === 'DEBIT' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(a.balance))}</TableCell>
                    </TableRow>
                  ))}
                  {pasivos.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-400">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total Pasivos</span>
                <span className="text-red-700">{fmt(totalPasivos)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Patrimonio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Patrimonio</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {a.nature === 'DEBIT' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(a.balance))}</TableCell>
                    </TableRow>
                  ))}
                  {patrimonio.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-400">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total Patrimonio</span>
                <span className="text-green-700">{fmt(totalPatrimonio)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resumen */}
      {!loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500">Total Activos</div>
                <div className="text-xl font-bold text-blue-600">{fmt(totalActivos)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Pasivos</div>
                <div className="text-xl font-bold text-red-600">{fmt(totalPasivos)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Patrimonio</div>
                <div className="text-xl font-bold text-green-600">{fmt(totalPatrimonio)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

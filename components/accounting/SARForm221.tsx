"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Calculator, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SARForm221Props {
  ingresos: any[];
  egresos: any[];
  period: string;
}

export default function SARForm221({ ingresos, egresos, period }: SARForm221Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  // Lógica de agrupación para Formulario 221 SAR
  const summary = React.useMemo(() => {
    const data = {
      ventas: {
        exentas: 0, // Casilla 401
        exportaciones: 0, // Casilla 402
        gravadas15: 0, // Casilla 403
        gravadas18: 0, // Casilla 404
        servicios15: 0, // Casilla 405
        debitoFiscal: 0,
      },
      compras: {
        exentas: 0, // Casilla 501
        importacionesExentas: 0, // Casilla 502
        gravadas15: 0, // Casilla 503
        gravadas18: 0, // Casilla 504
        importaciones15: 0, // Casilla 505
        creditoFiscal: 0,
      }
    };

    // Procesar Ingresos
    ingresos.forEach(ing => {
      const monto = ing.total_amount || 0;
      // Simplificación: Asumimos 15% si no se especifica. 
      // En producción, esto debe venir de los JournalEntries vinculados a cuentas de ISV.
      const neto = monto / 1.15;
      const isv = monto - neto;
      
      data.ventas.gravadas15 += neto;
      data.ventas.debitoFiscal += isv;
    });

    // Procesar Egresos
    egresos.forEach(egr => {
      const monto = egr.total_amount || 0;
      const neto = monto / 1.15;
      const isv = monto - neto;
      
      data.compras.gravadas15 += neto;
      data.compras.creditoFiscal += isv;
    });

    return data;
  }, [ingresos, egresos]);

  const impuestoAPagar = summary.ventas.debitoFiscal - summary.compras.creditoFiscal;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-cyan-600" />
          <h2 className="text-xl font-bold">Resumen Formulario 221 (ISV)</h2>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Generar Archivo DET
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SECCIÓN VENTAS */}
        <Card>
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg">Débito Fiscal (Ventas)</CardTitle>
            <CardDescription>Agrupación según casillas del SAR</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">401 - Ventas Exentas</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.ventas.exentas)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">402 - Exportaciones</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.ventas.exportaciones)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">403 - Ventas Gravadas 15%</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.ventas.gravadas15)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">404 - Ventas Gravadas 18%</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.ventas.gravadas18)}</TableCell>
                </TableRow>
                <TableRow className="bg-cyan-50 font-bold">
                  <TableCell>TOTAL DÉBITO FISCAL</TableCell>
                  <TableCell className="text-right text-cyan-700">{formatCurrency(summary.ventas.debitoFiscal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* SECCIÓN COMPRAS */}
        <Card>
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg">Crédito Fiscal (Compras)</CardTitle>
            <CardDescription>Agrupación según casillas del SAR</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">501 - Compras Exentas</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.compras.exentas)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">503 - Compras Gravadas 15%</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.compras.gravadas15)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">504 - Compras Gravadas 18%</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.compras.gravadas18)}</TableCell>
                </TableRow>
                <TableRow className="bg-emerald-50 font-bold">
                  <TableCell>TOTAL CRÉDITO FISCAL</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(summary.compras.creditoFiscal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* RESULTADO LIQUIDACIÓN */}
      <Card className={impuestoAPagar >= 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">
                {impuestoAPagar >= 0 ? "Impuesto Neto a Pagar" : "Saldo a Favor (Crédito)"}
              </h3>
              <p className="text-sm text-slate-600">Periodo Fiscal: {period}</p>
            </div>
            <div className="text-3xl font-black">
              {formatCurrency(Math.abs(impuestoAPagar))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 border rounded-lg bg-cyan-50 border-cyan-200 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-cyan-600 mt-0.5" />
        <div className="text-sm text-cyan-800">
          <p className="font-bold">Nota para el Contador:</p>
          <p>Este resumen es preliminar. Asegúrese de que todas las facturas tengan el RTN correctamente validado y que el CAI esté vigente antes de presentar su declaración definitiva en el portal del SAR.</p>
        </div>
      </div>
    </div>
  );
}
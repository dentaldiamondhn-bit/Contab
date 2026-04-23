"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  FileText, 
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  RefreshCw,
  Calculator
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface AccountingBooksViewerProps {
  tenantId: string;
}

interface LibroDiarioEntry {
  transaction_id: string;
  fecha: string;
  tipo_comprobante: string;
  numero_comprobante: number;
  descripcion: string;
  empresa: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  debe: number;
  haber: number;
  moneda: string;
}

interface LibroMayorEntry {
  codigo_cuenta: string;
  nombre_cuenta: string;
  tipo_cuenta: string;
  total_debe: number;
  total_haber: number;
  saldo: number;
  empresa: string;
}

interface BalanceEntry {
  categoria: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  saldo: number;
  empresa: string;
}

interface EstadoResultadosEntry {
  categoria: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  monto: number;
  empresa: string;
}

interface LibroIvaEntry {
  fecha: string;
  numero_factura: number;
  rtn_proveedor?: string;
  rtn_cliente?: string;
  descripcion_compra?: string;
  descripcion_venta?: string;
  monto_compra?: number;
  monto_venta?: number;
  credito_fiscal?: number;
  debito_fiscal?: number;
  cf_pendiente?: number;
  df_pendiente?: number;
  empresa: string;
  moneda: string;
}

export function AccountingBooksViewer({ tenantId }: AccountingBooksViewerProps) {
  const supabase = createSupabaseClient();
  
  const [activeTab, setActiveTab] = useState("diario");
  const [loading, setLoading] = useState(false);
  
  const [libroDiario, setLibroDiario] = useState<LibroDiarioEntry[]>([]);
  const [libroMayor, setLibroMayor] = useState<LibroMayorEntry[]>([]);
  const [balanceGeneral, setBalanceGeneral] = useState<BalanceEntry[]>([]);
  const [estadoResultados, setEstadoResultados] = useState<EstadoResultadosEntry[]>([]);
  const [libroCompras, setLibroCompras] = useState<LibroIvaEntry[]>([]);
  const [libroVentas, setLibroVentas] = useState<LibroIvaEntry[]>([]);

  useEffect(() => {
    loadAllBooks();
  }, [tenantId]);

  const loadAllBooks = async () => {
    setLoading(true);
    try {
      // Establecer tenant para RLS
      await (supabase as any).rpc("set_tenant", { tenant_id: tenantId });

      // Cargar todos los libros en paralelo
      const [
        { data: diario },
        { data: mayor },
        { data: balance },
        { data: resultados },
        { data: compras },
        { data: ventas }
      ] = await Promise.all([
        supabase.from("libro_diario").select("*").order("fecha", { ascending: false }),
        supabase.from("libro_mayor").select("*").order("codigo_cuenta"),
        supabase.from("balance_general").select("*").order("categoria"),
        supabase.from("estado_resultados").select("*").order("categoria"),
        supabase.from("libro_compras").select("*").order("fecha", { ascending: false }),
        supabase.from("libro_ventas").select("*").order("fecha", { ascending: false })
      ]);

      setLibroDiario(diario || []);
      setLibroMayor(mayor || []);
      setBalanceGeneral(balance || []);
      setEstadoResultados(resultados || []);
      setLibroCompras(compras || []);
      setLibroVentas(ventas || []);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-HN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Calcular totales
  const totalIngresos = estadoResultados
    .filter(e => e.categoria === "INGRESOS")
    .reduce((sum, e) => sum + (e.monto || 0), 0);
    
  const totalGastos = estadoResultados
    .filter(e => e.categoria === "GASTOS")
    .reduce((sum, e) => sum + (e.monto || 0), 0);
    
  const utilidadNeta = totalIngresos - totalGastos;

  const totalActivo = balanceGeneral
    .filter(e => e.categoria.includes("ACTIVO"))
    .reduce((sum, e) => sum + (e.saldo || 0), 0);
    
  const totalPasivo = balanceGeneral
    .filter(e => e.categoria.includes("PASIVO"))
    .reduce((sum, e) => sum + (e.saldo || 0), 0);
    
  const totalPatrimonio = balanceGeneral
    .filter(e => e.categoria === "PATRIMONIO")
    .reduce((sum, e) => sum + (e.saldo || 0), 0);

  const totalDebitoFiscal = libroVentas.reduce((sum, e) => sum + (e.debito_fiscal || 0), 0);
  const totalCreditoFiscal = libroCompras.reduce((sum, e) => sum + (e.credito_fiscal || 0), 0);
  const ivaAPagar = totalDebitoFiscal - totalCreditoFiscal;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Libros Contables</CardTitle>
              <CardDescription>
                Libros fiscales generados automáticamente de las transacciones
              </CardDescription>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={loadAllBooks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">Ingresos</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalIngresos)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-800">Gastos</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalGastos)}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800">Utilidad Neta</span>
              </div>
              <p className={`text-2xl font-bold ${utilidadNeta >= 0 ? "text-blue-900" : "text-red-900"}`}>
                {formatCurrency(utilidadNeta)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-purple-800">IVA a Pagar</span>
              </div>
              <p className={`text-2xl font-bold ${ivaAPagar >= 0 ? "text-purple-900" : "text-green-900"}`}>
                {formatCurrency(Math.abs(ivaAPagar))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="diario">
              <FileText className="h-4 w-4 mr-2" />
              Libro Diario
            </TabsTrigger>
            <TabsTrigger value="mayor">
              <BookOpen className="h-4 w-4 mr-2" />
              Libro Mayor
            </TabsTrigger>
            <TabsTrigger value="balance">
              <Calculator className="h-4 w-4 mr-2" />
              Balance
            </TabsTrigger>
            <TabsTrigger value="resultados">
              <TrendingUp className="h-4 w-4 mr-2" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="compras">
              <TrendingDown className="h-4 w-4 mr-2" />
              Compras
            </TabsTrigger>
            <TabsTrigger value="ventas">
              <TrendingUp className="h-4 w-4 mr-2" />
              Ventas
            </TabsTrigger>
          </TabsList>

          {/* Libro Diario */}
          <TabsContent value="diario" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 text-sm font-medium">Fecha</th>
                    <th className="text-left p-2 text-sm font-medium">Comprobante</th>
                    <th className="text-left p-2 text-sm font-medium">Descripción</th>
                    <th className="text-left p-2 text-sm font-medium">Cuenta</th>
                    <th className="text-right p-2 text-sm font-medium">Débito</th>
                    <th className="text-right p-2 text-sm font-medium">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {libroDiario.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{formatDate(entry.fecha)}</td>
                      <td className="p-2 text-sm">
                        <Badge variant="outline">
                          {entry.tipo_comprobante}-{entry.numero_comprobante}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm">{entry.descripcion}</td>
                      <td className="p-2 text-sm">
                        <span className="font-mono text-xs">{entry.codigo_cuenta}</span>
                        <br />
                        <span className="text-xs text-gray-600">{entry.nombre_cuenta}</span>
                      </td>
                      <td className="p-2 text-sm text-right font-medium">
                        {entry.debe > 0 ? formatCurrency(entry.debe) : ""}
                      </td>
                      <td className="p-2 text-sm text-right font-medium">
                        {entry.haber > 0 ? formatCurrency(entry.haber) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libroDiario.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  No hay transacciones registradas. Ingrese ingresos o egresos para ver el libro diario.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Libro Mayor */}
          <TabsContent value="mayor" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 text-sm font-medium">Código</th>
                    <th className="text-left p-2 text-sm font-medium">Cuenta</th>
                    <th className="text-left p-2 text-sm font-medium">Tipo</th>
                    <th className="text-right p-2 text-sm font-medium">Total Débito</th>
                    <th className="text-right p-2 text-sm font-medium">Total Crédito</th>
                    <th className="text-right p-2 text-sm font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {libroMayor.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm font-mono">{entry.codigo_cuenta}</td>
                      <td className="p-2 text-sm font-medium">{entry.nombre_cuenta}</td>
                      <td className="p-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {entry.tipo_cuenta}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm text-right">{formatCurrency(entry.total_debe)}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(entry.total_haber)}</td>
                      <td className={`p-2 text-sm text-right font-bold ${entry.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(entry.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libroMayor.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  No hay datos para mostrar en el libro mayor.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Balance General */}
          <TabsContent value="balance" className="space-y-4">
            {["ACTIVO CORRIENTE", "ACTIVO NO CORRIENTE", "PASIVO CORRIENTE", "PATRIMONIO"].map((categoria) => {
              const items = balanceGeneral.filter(e => e.categoria === categoria);
              const total = items.reduce((sum, e) => sum + (e.saldo || 0), 0);
              
              return (
                <Card key={categoria}>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{categoria}</CardTitle>
                      <Badge variant="secondary" className="text-lg">
                        {formatCurrency(total)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full">
                      <tbody>
                        {items.map((entry, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2 text-sm font-mono">{entry.codigo_cuenta}</td>
                            <td className="py-2 text-sm">{entry.nombre_cuenta}</td>
                            <td className="py-2 text-sm text-right font-medium">
                              {formatCurrency(entry.saldo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <p className="text-center py-4 text-gray-400 text-sm">
                        No hay cuentas en esta categoría
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            <Card className="bg-blue-50">
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">TOTAL ACTIVO</span>
                  <span className="text-xl font-bold text-blue-900">{formatCurrency(totalActivo)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-bold">TOTAL PASIVO + PATRIMONIO</span>
                  <span className="text-xl font-bold text-blue-900">{formatCurrency(totalPasivo + totalPatrimonio)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estado de Resultados */}
          <TabsContent value="resultados" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingresos */}
              <Card className="bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">INGRESOS</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <tbody>
                      {estadoResultados
                        .filter(e => e.categoria === "INGRESOS")
                        .map((entry, index) => (
                          <tr key={index} className="border-b last:border-0 border-green-200">
                            <td className="py-2 text-sm">{entry.nombre_cuenta}</td>
                            <td className="py-2 text-sm text-right font-medium text-green-700">
                              {formatCurrency(entry.monto)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-4 border-t border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-800">TOTAL INGRESOS</span>
                      <span className="text-xl font-bold text-green-900">{formatCurrency(totalIngresos)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gastos */}
              <Card className="bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800">GASTOS</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <tbody>
                      {estadoResultados
                        .filter(e => e.categoria === "GASTOS")
                        .map((entry, index) => (
                          <tr key={index} className="border-b last:border-0 border-red-200">
                            <td className="py-2 text-sm">{entry.nombre_cuenta}</td>
                            <td className="py-2 text-sm text-right font-medium text-red-700">
                              {formatCurrency(entry.monto)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-4 border-t border-red-300">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-800">TOTAL GASTOS</span>
                      <span className="text-xl font-bold text-red-900">{formatCurrency(totalGastos)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Utilidad Neta */}
            <Card className={`${utilidadNeta >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <CardContent className="py-6">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">
                    {utilidadNeta >= 0 ? "UTILIDAD NETA" : "PÉRDIDA NETA"}
                  </span>
                  <span className={`text-3xl font-bold ${utilidadNeta >= 0 ? "text-blue-900" : "text-orange-900"}`}>
                    {formatCurrency(Math.abs(utilidadNeta))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Libro de Compras */}
          <TabsContent value="compras" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 text-sm font-medium">Fecha</th>
                    <th className="text-left p-2 text-sm font-medium">Factura</th>
                    <th className="text-left p-2 text-sm font-medium">RTN Proveedor</th>
                    <th className="text-left p-2 text-sm font-medium">Descripción</th>
                    <th className="text-right p-2 text-sm font-medium">Monto</th>
                    <th className="text-right p-2 text-sm font-medium">Crédito Fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {libroCompras.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{formatDate(entry.fecha)}</td>
                      <td className="p-2 text-sm">{entry.numero_factura}</td>
                      <td className="p-2 text-sm font-mono">{entry.rtn_proveedor}</td>
                      <td className="p-2 text-sm">{entry.descripcion_compra}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(entry.monto_compra || 0)}</td>
                      <td className="p-2 text-sm text-right font-medium text-green-600">
                        {formatCurrency(entry.credito_fiscal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libroCompras.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  No hay compras registradas. Ingrese egresos con RTN de proveedor para ver el libro de compras.
                </p>
              )}
            </div>
            
            {libroCompras.length > 0 && (
              <Card className="bg-green-50">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">TOTAL CRÉDITO FISCAL</span>
                    <span className="text-xl font-bold text-green-900">{formatCurrency(totalCreditoFiscal)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Libro de Ventas */}
          <TabsContent value="ventas" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 text-sm font-medium">Fecha</th>
                    <th className="text-left p-2 text-sm font-medium">Factura</th>
                    <th className="text-left p-2 text-sm font-medium">RTN Cliente</th>
                    <th className="text-left p-2 text-sm font-medium">Descripción</th>
                    <th className="text-right p-2 text-sm font-medium">Monto</th>
                    <th className="text-right p-2 text-sm font-medium">Débito Fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {libroVentas.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{formatDate(entry.fecha)}</td>
                      <td className="p-2 text-sm">{entry.numero_factura}</td>
                      <td className="p-2 text-sm font-mono">{entry.rtn_cliente}</td>
                      <td className="p-2 text-sm">{entry.descripcion_venta}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(entry.monto_venta || 0)}</td>
                      <td className="p-2 text-sm text-right font-medium text-blue-600">
                        {formatCurrency(entry.debito_fiscal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libroVentas.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  No hay ventas registradas. Ingrese ingresos con RTN de cliente para ver el libro de ventas.
                </p>
              )}
            </div>
            
            {libroVentas.length > 0 && (
              <Card className="bg-blue-50">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">TOTAL DÉBITO FISCAL</span>
                    <span className="text-xl font-bold text-blue-900">{formatCurrency(totalDebitoFiscal)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

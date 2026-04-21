"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  TrendingUp,
  FileText,
  Calendar,
  Search,
  Calculator
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface SalesBookProps {
  tenantId: string;
}

interface SalesItem {
  fecha: string;
  numero_factura: string;
  rtn_cliente: string;
  descripcion_venta: string;
  monto_venta: number;
  debito_fiscal: number;
  df_pendiente: number;
  empresa: string;
  moneda: string;
}

export default function SalesBook({ tenantId }: SalesBookProps) {
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadSalesBook();
  }, [tenantId, startDate, endDate]);

  const loadSalesBook = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos del libro de ventas
      const { data, error } = await supabase
        .from('libro_ventas')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: true });

      if (error) throw error;

      setSalesData(data || []);
    } catch (error: any) {
      console.error("Error loading sales book:", error);
      alert("Error al cargar el libro de ventas");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha', 'Número Factura', 'RTN Cliente', 'Descripción', 
      'Monto Venta', 'Débito Fiscal', 'DF Pendiente', 'Moneda'
    ];
    const rows = salesData.map(item => [
      item.fecha,
      item.numero_factura,
      item.rtn_cliente || '',
      item.descripcion_venta,
      item.monto_venta.toFixed(2),
      item.debito_fiscal.toFixed(2),
      item.df_pendiente.toFixed(2),
      item.moneda
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `libro_ventas_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('sales-book-content');
    if (printContent) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Libro de Ventas</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .header { text-align: center; margin-bottom: 20px; }
                .summary { margin-top: 20px; background-color: #f9f9f9; padding: 15px; }
                .total { font-weight: bold; font-size: 1.1em; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>LIBRO DE VENTAS</h1>
                <p>Período: ${startDate} a ${endDate}</p>
                <p>Empresa: ${salesData[0]?.empresa || ''}</p>
              </div>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filteredData = salesData.filter(item =>
    item.descripcion_venta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_factura.includes(searchTerm) ||
    item.rtn_cliente?.includes(searchTerm)
  );

  const totalVentas = filteredData.reduce((sum, item) => sum + item.monto_venta, 0);
  const totalDebitoFiscal = filteredData.reduce((sum, item) => sum + item.debito_fiscal, 0);
  const totalDFPendiente = filteredData.reduce((sum, item) => sum + item.df_pendiente, 0);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando libro de ventas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
            Libro de Ventas
          </h2>
          <p className="text-gray-600">Registro de ventas y débito fiscal (IVA)</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Factura, RTN o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {totalVentas.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              {filteredData.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Débito Fiscal Total</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              L. {totalDebitoFiscal.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              15% de ventas gravadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DF Pendiente</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              L. {totalDFPendiente.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              31% de ventas &gt; L. 100,000
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas</CardTitle>
          <CardDescription>
            Registro completo de ventas y débito fiscal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="sales-book-content" className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RTN Cliente
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Débito Fiscal
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DF Pendiente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron ventas en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {new Date(item.fecha).toLocaleDateString('es-HN')}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {item.numero_factura}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.rtn_cliente || 'N/A'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.descripcion_venta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                        L. {item.monto_venta.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium text-blue-600">
                        L. {item.debito_fiscal.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium text-orange-600">
                        L. {item.df_pendiente.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={4} className="border border-gray-200 px-4 py-3 font-bold">
                      TOTALES
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right font-bold">
                      L. {totalVentas.toFixed(2)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right font-bold text-blue-600">
                      L. {totalDebitoFiscal.toFixed(2)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right font-bold text-orange-600">
                      L. {totalDFPendiente.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Fiscal SAR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Requisitos del Libro de Ventas</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Registro mensual obligatorio</li>
                <li>• Todas las ventas mayores a L. 1,000</li>
                <li>• RTN del cliente obligatorio</li>
                <li>• Cálculo de débito fiscal (15%)</li>
                <li>• DF pendiente para ventas &gt; L. 100,000</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Información del Reporte</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Período:</span>
                  <span className="font-medium">{startDate} a {endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de transacciones:</span>
                  <span className="font-medium">{filteredData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Promedio por venta:</span>
                  <span className="font-medium">
                    L. {filteredData.length > 0 ? (totalVentas / filteredData.length).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tasa efectiva de DF:</span>
                  <span className="font-medium">
                    {totalVentas > 0 ? ((totalDebitoFiscal / totalVentas) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  ShoppingCart,
  FileText,
  Calendar,
  Search,
  Calculator
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
interface PurchaseBookProps {
  tenantId: string;
}

interface PurchaseItem {
  fecha: string;
  numero_factura: string;
  rtn_proveedor: string;
  descripcion_compra: string;
  monto_compra: number;
  credito_fiscal: number;
  cf_pendiente: number;
  empresa: string;
  moneda: string;
}

export default function PurchaseBook({ tenantId }: PurchaseBookProps) {
  const [purchaseData, setPurchaseData] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadPurchaseBook();
  }, [tenantId, startDate, endDate]);

  const loadPurchaseBook = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos del libro de compras
      const { data, error } = await supabase
        .from('libro_compras')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: true });

      if (error) throw error;

      setPurchaseData(data || []);
    } catch (error: any) {
      console.error("Error loading purchase book:", error);
      alert("Error al cargar el libro de compras");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha', 'Número Factura', 'RTN Proveedor', 'Descripción', 
      'Monto Compra', 'Crédito Fiscal', 'CF Pendiente', 'Moneda'
    ];
    const rows = purchaseData.map(item => [
      item.fecha,
      item.numero_factura,
      item.rtn_proveedor || '',
      item.descripcion_compra,
      item.monto_compra.toFixed(2),
      item.credito_fiscal.toFixed(2),
      item.cf_pendiente.toFixed(2),
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
    link.setAttribute('download', `libro_compras_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('purchase-book-content');
    if (printContent) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Libro de Compras</title>
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
                <h1>LIBRO DE COMPRAS</h1>
                <p>Período: ${startDate} a ${endDate}</p>
                <p>Empresa: ${purchaseData[0]?.empresa || ''}</p>
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

  const filteredData = purchaseData.filter(item =>
    item.descripcion_compra.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_factura.includes(searchTerm) ||
    item.rtn_proveedor?.includes(searchTerm)
  );

  const totalCompras = filteredData.reduce((sum, item) => sum + item.monto_compra, 0);
  const totalCreditoFiscal = filteredData.reduce((sum, item) => sum + item.credito_fiscal, 0);
  const totalCFPendiente = filteredData.reduce((sum, item) => sum + item.cf_pendiente, 0);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando libro de compras...</p>
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
            <ShoppingCart className="h-6 w-6 mr-2 text-orange-600" />
            Libro de Compras
          </h2>
          <p className="text-gray-600">Registro de compras y crédito fiscal (IVA)</p>
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
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              L. {totalCompras.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              {filteredData.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédito Fiscal Total</CardTitle>
            <Calculator className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {totalCreditoFiscal.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              15% de compras gravadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CF Pendiente</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              L. {totalCFPendiente.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              46% de compras &gt; L. 100,000
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Compras */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Compras</CardTitle>
          <CardDescription>
            Registro completo de compras y crédito fiscal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="purchase-book-content" className="overflow-x-auto">
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
                    RTN Proveedor
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crédito Fiscal
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CF Pendiente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron compras en el período seleccionado
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
                        {item.rtn_proveedor || 'N/A'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.descripcion_compra}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                        L. {item.monto_compra.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium text-green-600">
                        L. {item.credito_fiscal.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium text-orange-600">
                        L. {item.cf_pendiente.toFixed(2)}
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
                      L. {totalCompras.toFixed(2)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right font-bold text-green-600">
                      L. {totalCreditoFiscal.toFixed(2)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right font-bold text-orange-600">
                      L. {totalCFPendiente.toFixed(2)}
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
              <h4 className="font-semibold mb-3">Requisitos del Libro de Compras</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Registro mensual obligatorio</li>
                <li>• Todas las compras mayores a L. 1,000</li>
                <li>• RTN del proveedor obligatorio</li>
                <li>• Cálculo de crédito fiscal (15%)</li>
                <li>• CF pendiente para compras &gt; L. 100,000</li>
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
                  <span className="text-gray-600">Promedio por compra:</span>
                  <span className="font-medium">
                    L. {filteredData.length > 0 ? (totalCompras / filteredData.length).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tasa efectiva de CF:</span>
                  <span className="font-medium">
                    {totalCompras > 0 ? ((totalCreditoFiscal / totalCompras) * 100).toFixed(2) : '0.00'}%
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

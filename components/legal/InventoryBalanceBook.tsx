"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  FileText,
  Calendar,
  Building,
  Search
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface InventoryBalanceBookProps {
  tenantId: string;
}

interface InventoryItem {
  codigo_cuenta: string;
  nombre_cuenta: string;
  saldo: number;
  empresa: string;
}

export default function InventoryBalanceBook({ tenantId }: InventoryBalanceBookProps) {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadInventoryBalance();
  }, [tenantId, dateFilter]);

  const loadInventoryBalance = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos del libro de inventarios y balances
      // Este es un reporte que combina activos, pasivos y patrimonio
      const { data: balanceData, error: balanceError } = await supabase
        .from('balance_general')
        .select('*');

      if (balanceError) throw balanceError;

      setInventoryData(balanceData || []);
    } catch (error: any) {
      console.error("Error loading inventory balance:", error);
      alert("Error al cargar el libro de inventarios y balances");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Cuenta', 'Saldo', 'Empresa'];
    const rows = inventoryData.map(item => [
      item.codigo_cuenta,
      item.nombre_cuenta,
      item.saldo.toFixed(2),
      item.empresa
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `libro_inventarios_balances_${dateFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Implementación básica de exportación a PDF
    const printContent = document.getElementById('inventory-balance-content');
    if (printContent) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Libro de Inventarios y Balances</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .header { text-align: center; margin-bottom: 20px; }
                .total { font-weight: bold; background-color: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>LIBRO DE INVENTARIOS Y BALANCES</h1>
                <p>Fecha: ${dateFilter}</p>
                <p>Empresa: ${inventoryData[0]?.empresa || ''}</p>
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

  const filteredData = inventoryData.filter(item =>
    item.nombre_cuenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_cuenta.includes(searchTerm)
  );

  const totalActivos = filteredData
    .filter(item => item.codigo_cuenta.startsWith('1') || item.codigo_cuenta.startsWith('2'))
    .reduce((sum, item) => sum + item.saldo, 0);

  const totalPasivos = filteredData
    .filter(item => item.codigo_cuenta.startsWith('3'))
    .reduce((sum, item) => sum + item.saldo, 0);

  const totalPatrimonio = filteredData
    .filter(item => item.codigo_cuenta.startsWith('4'))
    .reduce((sum, item) => sum + item.saldo, 0);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando libro de inventarios y balances...</p>
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
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            Libro de Inventarios y Balances
          </h2>
          <p className="text-gray-600">Reporte fiscal SAR</p>
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
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha del Reporte</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Cuenta</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código o nombre..."
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {totalActivos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pasivos</CardTitle>
            <Building className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {totalPasivos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              L. {totalPatrimonio.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              L. {(totalActivos - totalPasivos - totalPatrimonio).toFixed(2)}
            </div>
            <Badge variant={
              Math.abs(totalActivos - totalPasivos - totalPatrimonio) < 0.01 
                ? "default" 
                : "destructive"
            }>
              {Math.abs(totalActivos - totalPasivos - totalPatrimonio) < 0.01 
                ? "Cuadrado" 
                : "Desbalanceado"
              }
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Inventario y Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle del Libro de Inventarios y Balances</CardTitle>
          <CardDescription>
            Estado financiero completo para fines fiscales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="inventory-balance-content" className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Activos */}
                <tr className="bg-green-50">
                  <td colSpan={4} className="border border-gray-200 px-4 py-2 font-bold text-green-700">
                    ACTIVOS
                  </td>
                </tr>
                {filteredData
                  .filter(item => item.codigo_cuenta.startsWith('1') || item.codigo_cuenta.startsWith('2'))
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {item.codigo_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.nombre_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                        L. {item.saldo.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <Badge variant="outline" className="text-green-700">
                          {item.codigo_cuenta.startsWith('1') ? 'Activo Corriente' : 'Activo No Corriente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                <tr className="bg-green-100">
                  <td colSpan={2} className="border border-gray-200 px-4 py-2 font-bold">
                    Total Activos
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-bold text-green-700">
                    L. {totalActivos.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-4 py-2"></td>
                </tr>

                {/* Pasivos */}
                <tr className="bg-red-50">
                  <td colSpan={4} className="border border-gray-200 px-4 py-2 font-bold text-red-700">
                    PASIVOS
                  </td>
                </tr>
                {filteredData
                  .filter(item => item.codigo_cuenta.startsWith('3'))
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {item.codigo_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.nombre_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                        L. {item.saldo.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <Badge variant="outline" className="text-red-700">
                          Pasivo
                        </Badge>
                      </td>
                    </tr>
                  ))}
                <tr className="bg-red-100">
                  <td colSpan={2} className="border border-gray-200 px-4 py-2 font-bold">
                    Total Pasivos
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-bold text-red-700">
                    L. {totalPasivos.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-4 py-2"></td>
                </tr>

                {/* Patrimonio */}
                <tr className="bg-blue-50">
                  <td colSpan={4} className="border border-gray-200 px-4 py-2 font-bold text-blue-700">
                    PATRIMONIO
                  </td>
                </tr>
                {filteredData
                  .filter(item => item.codigo_cuenta.startsWith('4'))
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                        {item.codigo_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {item.nombre_cuenta}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                        L. {item.saldo.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <Badge variant="outline" className="text-blue-700">
                          Patrimonio
                        </Badge>
                      </td>
                    </tr>
                  ))}
                <tr className="bg-blue-100">
                  <td colSpan={2} className="border border-gray-200 px-4 py-2 font-bold">
                    Total Patrimonio
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-bold text-blue-700">
                    L. {totalPatrimonio.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-4 py-2"></td>
                </tr>

                {/* Validación Final */}
                <tr className="bg-gray-100">
                  <td colSpan={2} className="border border-gray-200 px-4 py-2 font-bold">
                    TOTAL PASIVOS Y PATRIMONIO
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-bold">
                    L. {(totalPasivos + totalPatrimonio).toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información Legal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Legal y Fiscal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Requisitos SAR</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Presentación mensual obligatoria</li>
                <li>• Debe incluir todos los activos y pasivos</li>
                <li>• Firmado por contador público autorizado</li>
                <li>• Conservación mínima de 5 años</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Información del Reporte</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha de generación:</span>
                  <span className="font-medium">{new Date().toLocaleDateString('es-HN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Período:</span>
                  <span className="font-medium">{dateFilter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de cuentas:</span>
                  <span className="font-medium">{filteredData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado del balance:</span>
                  <Badge variant={
                    Math.abs(totalActivos - totalPasivos - totalPatrimonio) < 0.01 
                      ? "default" 
                      : "destructive"
                  }>
                    {Math.abs(totalActivos - totalPasivos - totalPatrimonio) < 0.01 
                      ? "Cuadrado" 
                      : "Desbalanceado"
                    }
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

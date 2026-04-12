'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Download, Printer, FileText, Calendar, Calculator } from 'lucide-react';

interface PurchaseBookEntry {
  id: string;
  invoice_date: string;
  invoice_number: string;
  supplier_rtn: string;
  supplier_name: string;
  cai: string;
  net_value: number;
  tax_value: number;
  total_value: number;
  purchase_type: string;
  expense_category: string;
}

export default function PurchaseBookPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [entries, setEntries] = useState<PurchaseBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<PurchaseBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPurchaseBook();
  }, [companyId, selectedMonth, selectedYear]);

  useEffect(() => {
    // Filter by month and year
    const filtered = entries.filter(entry => {
      const entryDate = new Date(entry.invoice_date);
      return entryDate.getMonth() + 1 === selectedMonth && 
             entryDate.getFullYear() === selectedYear;
    });
    setFilteredEntries(filtered);
  }, [entries, selectedMonth, selectedYear]);

  const loadPurchaseBook = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-book?companyId=${companyId}&month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setFilteredEntries(data);
      }
    } catch (error) {
      console.error('Error loading purchase book:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatRTN = (rtn: string) => {
    if (!rtn) return '-';
    const clean = rtn.replace(/\D/g, '');
    if (clean.length !== 14) return rtn;
    return `${clean.slice(0, 4)}-${clean.slice(4, 9)}-${clean.slice(9, 13)}-${clean.slice(13)}`;
  };

  const formatCAI = (cai: string) => {
    if (!cai) return '-';
    return cai;
  };

  const totals = {
    net: filteredEntries.reduce((sum, e) => sum + e.net_value, 0),
    tax: filteredEntries.reduce((sum, e) => sum + e.tax_value, 0),
    total: filteredEntries.reduce((sum, e) => sum + e.total_value, 0),
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Factura',
      'RTN Proveedor',
      'Nombre Proveedor',
      'CAI',
      'Valor Neto',
      'ISV',
      'Total'
    ].join(',');

    const rows = filteredEntries.map(entry => [
      entry.invoice_date,
      entry.invoice_number,
      entry.supplier_rtn,
      `"${entry.supplier_name}"`,
      entry.cai || '',
      (entry.net_value / 100).toFixed(2),
      (entry.tax_value / 100).toFixed(2),
      (entry.total_value / 100).toFixed(2)
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Libro_Compras_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}/reports`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Reportes
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Libro de Compras</h1>
            <p className="text-gray-500">Reporte mensual para declaración SAR</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">LIBRO DE COMPRAS</h1>
        <p className="text-lg">
          Período: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
        </p>
        <p className="text-sm text-gray-600">Servicio de Administración de Rentas (SAR)</p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Seleccionar Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label className="text-xs mb-1 block">Mes</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-xs mb-1 block">Año</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
            <div className="text-sm text-gray-500">facturas registradas</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Neto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.net)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ISV Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.tax)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Book Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Registro de Compras - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay compras registradas para el período seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-2">No.</th>
                    <th className="text-left py-3 px-2">Fecha</th>
                    <th className="text-left py-3 px-2">Factura</th>
                    <th className="text-left py-3 px-2">RTN Proveedor</th>
                    <th className="text-left py-3 px-2">Nombre Proveedor</th>
                    <th className="text-left py-3 px-2">CAI</th>
                    <th className="text-right py-3 px-2">Valor Neto</th>
                    <th className="text-right py-3 px-2">ISV</th>
                    <th className="text-right py-3 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">{index + 1}</td>
                      <td className="py-3 px-2">{new Date(entry.invoice_date).toLocaleDateString()}</td>
                      <td className="py-3 px-2 font-medium">{entry.invoice_number}</td>
                      <td className="py-3 px-2 font-mono text-xs">{formatRTN(entry.supplier_rtn)}</td>
                      <td className="py-3 px-2">{entry.supplier_name}</td>
                      <td className="py-3 px-2 font-mono text-xs">{formatCAI(entry.cai)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(entry.net_value)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(entry.tax_value)}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(entry.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={6} className="py-3 px-2 text-right">TOTALES:</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(totals.net)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(totals.tax)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAR Format Notice */}
      <Card className="bg-blue-50 border-blue-200 print:hidden">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Información para Declaración SAR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Valor Neto Total:</strong> {formatCurrency(totals.net)} - Base imponible para ISV
          </p>
          <p>
            <strong>ISV Total:</strong> {formatCurrency(totals.tax)} - Crédito fiscal del período
          </p>
          <p>
            <strong>Total Compras:</strong> {formatCurrency(totals.total)} - Incluye ISV
          </p>
          <p className="text-xs text-gray-600 mt-4">
            Este reporte cumple con el formato requerido por el SAR para la declaración mensual del Impuesto Sobre Ventas (ISV).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Download, Printer, FileText, Calendar, Calculator, FileSpreadsheet, Database } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import { transformToLibroCompras, groupPurchaseBookItems, computePurchaseBookTotals, formatPurchaseBookForExcel } from '@/lib/reports/purchase-book';
import type { PurchaseBookItem } from '@/lib/reports/purchase-book';

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

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
  const [autoItems, setAutoItems] = useState<PurchaseBookItem[]>([]);
  const [dataSource, setDataSource] = useState<'auto' | 'manual'>('auto');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    rtn: '',
    address: ''
  });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyInfo({
            name: data.business_name || data.businessname || data.name || '',
            rtn: data.business_rtn || data.businessrtn || data.rtn || '',
            address: data.business_address || data.businessaddress || data.address || ''
          });
        } else {
          const lr = await fetch(`/api/companies`);
          if (lr.ok) {
            const lj = await lr.json();
            const list: any[] = lj.companies || lj || [];
            const comp = list.find((c: any) => c.tenant_id === companyId || c.id === companyId);
            if (comp) setCompanyInfo({
              name: comp.business_name || comp.name || '',
              rtn: comp.business_rtn || comp.rtn || '',
              address: comp.business_address || comp.address || ''
            });
          }
        }
      } catch {}
    };
    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    if (dataSource === 'manual') {
      loadPurchaseBook();
    } else {
      loadAutoBook();
    }
  }, [companyId, selectedMonth, selectedYear, dataSource]);

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

  const loadAutoBook = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      if (response.ok) {
        const data = await response.json();
        const transformed = transformToLibroCompras(data || []);
        setAutoItems(transformed);
      }
    } catch (error) {
      console.error('Error loading automatic purchase book:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const groupedAuto = groupPurchaseBookItems(autoItems);
  const autoTotals = computePurchaseBookTotals(groupedAuto);

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

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const exportItems: PurchaseBookItem[] =
      dataSource === 'auto'
        ? autoItems
        : filteredEntries.map((e) => ({
            code: e.invoice_number,
            name: e.supplier_name,
            type: 'COMPRA' as const,
            amount: e.net_value / 100,
            tax: e.tax_value / 100,
            total: e.total_value / 100,
            date: e.invoice_date,
            supplier: e.supplier_name,
            transactionId: e.id,
          }));
    const rows = formatPurchaseBookForExcel(exportItems);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Libro de Compras');
    XLSX.writeFile(
      workbook,
      `Libro_Compras_${companyInfo.name.replace(/\s+/g, '_')}_${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.xlsx`
    );
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
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            size="sm"
            variant={dataSource === 'auto' ? 'default' : 'ghost'}
            onClick={() => setDataSource('auto')}
          >
            <Database className="w-4 h-4 mr-1" />
            Automático (contable)
          </Button>
          <Button
            size="sm"
            variant={dataSource === 'manual' ? 'default' : 'ghost'}
            onClick={() => setDataSource('manual')}
          >
            Manual
          </Button>
        </div>
        <div className="flex gap-2">
          {dataSource === 'manual' && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
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
      {dataSource === 'auto' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Registros Contables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{autoItems.length}</div>
              <div className="text-sm text-gray-500">cuentas de gasto con balance</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Base Neta Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(autoTotals.totalNeto)}</div>
              <div className="text-sm text-gray-500">compras + gastos</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">ISV Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{formatMoney(autoTotals.totalISV)}</div>
              <div className="text-sm text-gray-500">{formatMoney(autoTotals.total)} incluido total</div>
            </CardContent>
          </Card>
        </div>
      ) : (
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
              <div className="text-2xl font-bold text-cyan-600">{formatCurrency(totals.tax)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purchase Book Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Registro de Compras - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
          {dataSource === 'auto' && (
            <p className="text-xs text-gray-500">Generado automáticamente desde transacciones contables</p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : dataSource === 'auto' ? (
            autoItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay compras registradas en las transacciones contables para el período seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-2">No.</th>
                      <th className="text-left py-3 px-2">Código</th>
                      <th className="text-left py-3 px-2">Cuenta</th>
                      <th className="text-left py-3 px-2">Tipo</th>
                      <th className="text-left py-3 px-2">Fecha</th>
                      <th className="text-left py-3 px-2">Proveedor</th>
                      <th className="text-right py-3 px-2">Base</th>
                      <th className="text-right py-3 px-2">ISV</th>
                      <th className="text-right py-3 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoItems.map((item, index) => (
                      <tr key={`${item.code}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2 font-mono text-xs">{item.code}</td>
                        <td className="py-3 px-2 font-medium">{item.name}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={item.type === 'COMPRA' ? 'default' : item.type === 'GASTO' ? 'secondary' : 'outline'}
                          >
                            {item.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-2">{item.supplier || '-'}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(item.amount)}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(item.tax)}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={6} className="py-3 px-2 text-right">TOTALES:</td>
                      <td className="py-3 px-2 text-right">{formatMoney(autoTotals.totalNeto)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(autoTotals.totalISV)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(autoTotals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : (
            filteredEntries.length === 0 ? (
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
            )
          )}
        </CardContent>
      </Card>

      {/* SAR Format Notice */}
      <Card className="bg-cyan-50 border-cyan-200 print:hidden">
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

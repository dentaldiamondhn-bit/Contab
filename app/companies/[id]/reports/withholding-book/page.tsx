'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Download, Printer, FileText, Calendar, Calculator, FileSpreadsheet, Database } from 'lucide-react';

import { transformToLibroRetenciones, groupWithholdingBookItems, computeWithholdingBookTotals, formatWithholdingBookForExcel, classifyWithholdingItemType } from '@/lib/reports/withholding-book';
import type { WithholdingBookItem, WithholdingBookItemType } from '@/lib/reports/withholding-book';

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

interface WithholdingEntry {
  id: string;
  type: string;
  invoiceNumber: string;
  invoiceDate: string;
  providerName: string;
  providerRTN: string;
  amount: number;
  withholdingRate: number;
  withholdingAmount: number;
  description: string;
  period: string;
}

export default function WithholdingBookPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [entries, setEntries] = useState<WithholdingEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WithholdingEntry[]>([]);
  const [autoItems, setAutoItems] = useState<WithholdingBookItem[]>([]);
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
      loadManualBook();
    } else {
      loadAutoBook();
    }
  }, [companyId, selectedMonth, selectedYear, dataSource]);

  useEffect(() => {
    // Filter by period (YYYY-MM)
    const period = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
    const filtered = entries.filter(entry => (entry.period || '').startsWith(period));
    setFilteredEntries(filtered);
  }, [entries, selectedMonth, selectedYear]);

  const loadManualBook = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/withholding');
      if (res.ok) {
        const json = await res.json();
        const list: any[] = json.data || json || [];
        const entriesMapped: WithholdingEntry[] = list.map((w: any) => ({
          id: w.id,
          type: w.type || '',
          invoiceNumber: w.invoiceNumber || '',
          invoiceDate: w.invoiceDate || '',
          providerName: w.providerName || '',
          providerRTN: w.providerRTN || '',
          amount: Number(w.amount) || 0,
          withholdingRate: Number(w.withholdingRate) || 0,
          withholdingAmount: Number(w.withholdingAmount) || 0,
          description: w.description || '',
          period: w.period || '',
        }));
        setEntries(entriesMapped);
        setFilteredEntries(entriesMapped);
      }
    } catch (error) {
      console.error('Error loading withholding book:', error);
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
        const transformed = transformToLibroRetenciones(data || []);
        setAutoItems(transformed);
      }
    } catch (error) {
      console.error('Error loading automatic withholding book:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const groupedAuto = groupWithholdingBookItems(autoItems);
  const autoTotals = computeWithholdingBookTotals(groupedAuto);

  const manualItemType = (e: WithholdingEntry): WithholdingBookItemType => {
    const t = String(e.type || '').toUpperCase();
    if (/12[\_.]?5/.test(t)) return 'IR';
    if (t.includes('1%')) return 'ISR';
    return classifyWithholdingItemType(e.invoiceNumber || '', `${e.description || ''} ${e.type || ''}`);
  };

  const manualByType = (typeName: string) =>
    filteredEntries
      .filter((e) => manualItemType(e) === typeName)
      .reduce((sum, e) => sum + e.withholdingAmount / 100, 0);

  const formatRTN = (rtn: string) => {
    if (!rtn) return '-';
    const clean = rtn.replace(/\D/g, '');
    if (clean.length !== 14) return rtn;
    return `${clean.slice(0, 4)}-${clean.slice(4, 9)}-${clean.slice(9, 13)}-${clean.slice(13)}`;
  };

  const manualTotals = {
    base: filteredEntries.reduce((sum, e) => sum + e.amount / 100, 0),
    withheld: filteredEntries.reduce((sum, e) => sum + e.withholdingAmount / 100, 0),
  };

  const sarIR = dataSource === 'auto' ? (autoTotals.retencionesPorTipo.IR || 0) : manualByType('IR');
  const sarISR = dataSource === 'auto' ? (autoTotals.retencionesPorTipo.ISR || 0) : manualByType('ISR');
  const sarIGV = dataSource === 'auto' ? (autoTotals.retencionesPorTipo.IGV || 0) : manualByType('IGV');
  const sarTotal = dataSource === 'auto' ? autoTotals.totalNeto : manualTotals.withheld;
  const sarBase = dataSource === 'auto' ? autoTotals.totalBase : manualTotals.base;

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Factura',
      'RTN Proveedor',
      'Nombre Proveedor',
      'Tipo',
      'Tasa',
      'Base',
      'Retención'
    ].join(',');

    const manualRows = filteredEntries.map(entry => [
      entry.invoiceDate,
      entry.invoiceNumber,
      entry.providerRTN,
      `"${entry.providerName}"`,
      `"${entry.description || entry.type}"`,
      Math.round((entry.withholdingRate || 0) * 1000) / 10,
      (entry.amount / 100).toFixed(2),
      (entry.withholdingAmount / 100).toFixed(2)
    ].join(','));

    const autoRows = autoItems.map(item => [
      item.date || '',
      item.code,
      '',
      `"${item.provider || item.name}"`,
      item.type,
      item.rate,
      item.total.toFixed(2),
      item.amount.toFixed(2)
    ].join(','));

    const rows = dataSource === 'auto' ? autoRows : manualRows;
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Libro_Retenciones_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportItems: WithholdingBookItem[] =
        dataSource === 'auto'
          ? autoItems
          : filteredEntries.map((e) => ({
              code: e.invoiceNumber || '-',
              name: e.description || e.type || 'Retención',
              type: manualItemType(e),
              rate: Math.round((e.withholdingRate || 0) * 1000) / 10,
              amount: e.withholdingAmount / 100,
              total: e.amount / 100,
              date: e.invoiceDate ? String(e.invoiceDate).slice(0, 10) : '',
              provider: e.providerName,
              transactionId: e.id,
            }));
      const rows = formatWithholdingBookForExcel(exportItems);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 }
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, 'Libro de Retenciones');
      XLSX.writeFile(
        workbook,
        `Libro_Retenciones_${companyInfo.name.replace(/\s+/g, '_')}_${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.xlsx`
      );
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('No se pudo generar el archivo Excel');
    }
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
            <h1 className="text-3xl font-bold">Libro de Retenciones</h1>
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
          <Button variant="outline" onClick={handleExportCSV} title="Descargar Libro de Retenciones en CSV">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel} title="Descargar Libro de Retenciones en Excel">
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
        <h1 className="text-2xl font-bold">LIBRO DE RETENCIONES</h1>
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
              <div className="text-sm text-gray-500">cuentas de retención con balance</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Retenciones Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(autoTotals.totalNeto)}</div>
              <div className="text-sm text-gray-500">IR + ISR + IGV + otros</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Base Imponible</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{formatMoney(autoTotals.totalBase)}</div>
              <div className="text-sm text-gray-500">suma de bases sujetas a retención</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Retenciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
              <div className="text-sm text-gray-500">retenciones registradas</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Base Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(manualTotals.base)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monto Retenido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{formatMoney(manualTotals.withheld)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withholding Book Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Registro de Retenciones - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
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
                No hay retenciones registradas en las transacciones contables para el período seleccionado.
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
                      <th className="text-right py-3 px-2">Tasa</th>
                      <th className="text-right py-3 px-2">Base</th>
                      <th className="text-right py-3 px-2">Retención</th>
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
                            variant={item.type === 'IR' ? 'default' : item.type === 'ISR' ? 'secondary' : item.type === 'IGV' ? 'secondary' : 'outline'}
                          >
                            {item.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-2">{item.provider || '-'}</td>
                        <td className="py-3 px-2 text-right">{item.rate > 0 ? `${item.rate}%` : '-'}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(item.total)}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatMoney(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={7} className="py-3 px-2 text-right">TOTALES:</td>
                      <td className="py-3 px-2 text-right">{formatMoney(autoTotals.totalBase)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(autoTotals.totalNeto)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : (
            filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay retenciones registradas para el período seleccionado.
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
                      <th className="text-left py-3 px-2">Tipo</th>
                      <th className="text-right py-3 px-2">Tasa</th>
                      <th className="text-right py-3 px-2">Base</th>
                      <th className="text-right py-3 px-2">Retención</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2">{entry.invoiceDate ? new Date(entry.invoiceDate).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-2 font-medium">{entry.invoiceNumber}</td>
                        <td className="py-3 px-2 font-mono text-xs">{formatRTN(entry.providerRTN)}</td>
                        <td className="py-3 px-2">{entry.providerName}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{entry.description || entry.type}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">{Math.round((entry.withholdingRate || 0) * 1000) / 10}%</td>
                        <td className="py-3 px-2 text-right">{formatMoney(entry.amount / 100)}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatMoney(entry.withholdingAmount / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={7} className="py-3 px-2 text-right">TOTALES:</td>
                      <td className="py-3 px-2 text-right">{formatMoney(manualTotals.base)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(manualTotals.withheld)}</td>
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
            <strong>Retención IR (12.5%):</strong> {formatMoney(sarIR)} - servicios profesionales
          </p>
          <p>
            <strong>Retención ISR (1%):</strong> {formatMoney(sarISR)} - compras sujetas a retención
          </p>
          <p>
            <strong>Retención ISV:</strong> {formatMoney(sarIGV)} - ISV retenido en compras sujetas
          </p>
          <p>
            <strong>Total Retenciones:</strong> {formatMoney(sarTotal)} - sobre base {formatMoney(sarBase)}
          </p>
          <p className="text-xs text-gray-600 mt-4">
            Este reporte cumple con el formato requerido por el SAR para la declaración mensual de retenciones (IR 12.5% servicios, ISR 1% compras e ISV retenido).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
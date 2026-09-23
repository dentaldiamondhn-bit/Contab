'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Download, Printer, FileText, Calendar, Calculator, FileSpreadsheet, Database } from 'lucide-react';

import { transformToLibroMayor, transformToLibroDiario, groupLedgerItems, computeLedgerTotals, formatLibroMayorForExcel, formatLibroDiarioForExcel, classifyLedgerType } from '@/lib/reports/general-ledger';
import type { LedgerItem, JournalEntryRow } from '@/lib/reports/general-ledger';

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

interface ManualEntry {
  id: string;
  date: string;
  tipoComprobante: string;
  numeroComprobante: string;
  description: string;
  code: string;
  accountName: string;
  debit: number;
  credit: number;
}

export default function GeneralLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<ManualEntry[]>([]);
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [diaryRows, setDiaryRows] = useState<JournalEntryRow[]>([]);
  const [dataSource, setDataSource] = useState<'auto' | 'manual'>('auto');
  const [bookType, setBookType] = useState<'Mayor' | 'Diario'>('Mayor');
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

  const isMayor = bookType === 'Mayor';
  const bookLabel = isMayor ? 'Mayor' : 'Diario';

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
    const filtered = entries.filter(entry => (entry.date || '').startsWith(period));
    setFilteredEntries(filtered);
  }, [entries, selectedMonth, selectedYear]);

  const loadManualBook = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/libro-diario?tenantId=${companyId}`);
      if (res.ok) {
        const json = await res.json();
        const list: any[] = json.data || json || [];
        const entriesMapped: ManualEntry[] = list.map((e: any) => ({
          id: e.id || '',
          date: e.fecha || e.date || '',
          tipoComprobante: e.tipo_comprobante || e.voucher_type || e.type || '',
          numeroComprobante: e.numero_comprobante || String(e.voucher_number ?? '') || String(e.number ?? ''),
          description: e.descripcion || e.description || '',
          code: e.codigo_cuenta || e.code || e.codigo || '',
          accountName: e.nombre_cuenta || e.account_name || e.name || '',
          debit: Number(e.debe ?? e.debit ?? 0) || 0,
          credit: Number(e.haber ?? e.credit ?? 0) || 0,
        }));
        setEntries(entriesMapped);
        setFilteredEntries(entriesMapped);
      }
    } catch (error) {
      console.error('Error loading manual book:', error);
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
        const transformed = transformToLibroMayor(data || []);
        setLedgerItems(transformed);
        setDiaryRows(transformToLibroDiario(data || []));
      }
    } catch (error) {
      console.error('Error loading automatic book:', error);
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

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const manualMayorItems: LedgerItem[] = (() => {
    const map = new Map<string, LedgerItem>();
    filteredEntries.forEach((e) => {
      const key = e.code || '-';
      const existing = map.get(key);
      if (existing) {
        existing.debit = round2(existing.debit + e.debit);
        existing.credit = round2(existing.credit + e.credit);
        existing.balance = round2(existing.debit - existing.credit);
      } else {
        map.set(key, {
          code: e.code || '-',
          name: e.accountName || 'Sin nombre',
          type: classifyLedgerType(e.code || '', e.accountName || ''),
          debit: round2(e.debit),
          credit: round2(e.credit),
          balance: round2(e.debit - e.credit),
          date: '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  })();

  const manualDiaryRows: JournalEntryRow[] = filteredEntries.map((e) => ({
    date: e.date || '',
    reference: `${e.tipoComprobante} ${e.numeroComprobante}`.trim() || e.description || '',
    accountName: e.accountName || 'Sin nombre',
    code: e.code || '',
    debit: round2(e.debit),
    credit: round2(e.credit),
  }));

  const mayorItems = dataSource === 'auto' ? ledgerItems : manualMayorItems;
  const diarioRows = dataSource === 'auto' ? diaryRows : manualDiaryRows;

  const groupedLedger = groupLedgerItems(mayorItems);
  const ledgerTotals = computeLedgerTotals(groupedLedger);
  const diarioTotals = {
    totalDebitos: diarioRows.reduce((sum, r) => sum + r.debit, 0),
    totalCreditos: diarioRows.reduce((sum, r) => sum + r.credit, 0),
  };

  const handleExportCSV = () => {
    const period = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;

    const rows = isMayor
      ? mayorItems.map(item => [
          item.date || '',
          `"${item.name}"`,
          item.code,
          item.type,
          item.debit.toFixed(2),
          item.credit.toFixed(2),
          item.balance.toFixed(2)
        ].join(','))
      : diarioRows.map(r => [
          r.date || '',
          `"${r.reference || ''}"`,
          `"${r.accountName || ''}"`,
          r.code || '',
          r.debit.toFixed(2),
          r.credit.toFixed(2)
        ].join(','));

    const headers = isMayor
      ? ['Fecha', 'Cuenta', 'Código', 'Tipo', 'Débito', 'Crédito', 'Saldo'].join(',')
      : ['Fecha', 'Referencia', 'Cuenta', 'Código', 'Débito', 'Crédito'].join(',');

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Libro_${bookLabel}_${period}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = isMayor ? formatLibroMayorForExcel(mayorItems) : formatLibroDiarioForExcel(diarioRows);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = isMayor
        ? [
            { wch: 14 },
            { wch: 30 },
            { wch: 14 },
            { wch: 12 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 }
          ]
        : [
            { wch: 14 },
            { wch: 24 },
            { wch: 30 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 }
          ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, isMayor ? 'Libro Mayor' : 'Libro Diario');
      XLSX.writeFile(
        workbook,
        `Libro_${bookLabel}_${companyInfo.name.replace(/\s+/g, '_')}_${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.xlsx`
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

  const summaryCount = isMayor ? mayorItems.length : diarioRows.length;
  const summaryDebits = isMayor ? ledgerTotals.totalDebitos : diarioTotals.totalDebitos;
  const summaryCredits = isMayor ? ledgerTotals.totalCreditos : diarioTotals.totalCreditos;

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
            <h1 className="text-3xl font-bold">Libro {bookLabel}</h1>
            <p className="text-gray-500">Reporte mensual del Libro {bookLabel} desde transacciones contables</p>
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
          <Button variant="outline" onClick={handleExportCSV} title={`Descargar Libro ${bookLabel} en CSV`}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel} title={`Descargar Libro ${bookLabel} en Excel`}>
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
        <h1 className="text-2xl font-bold">{isMayor ? 'LIBRO MAYOR' : 'LIBRO DIARIO'}</h1>
        <p className="text-lg">
          Período: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
        </p>
        <p className="text-sm text-gray-600">Libro legal de contabilidad</p>
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
            <div>
              <Label className="text-xs mb-1 block">Tipo de Libro</Label>
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  size="sm"
                  variant={bookType === 'Mayor' ? 'default' : 'ghost'}
                  onClick={() => setBookType('Mayor')}
                >
                  Mayor
                </Button>
                <Button
                  size="sm"
                  variant={bookType === 'Diario' ? 'default' : 'ghost'}
                  onClick={() => setBookType('Diario')}
                >
                  Diario
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {dataSource === 'manual' ? 'Registros Manuales' : 'Registros Contables'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryCount}</div>
            <div className="text-sm text-gray-500">
              {isMayor ? 'cuentas con movimiento' : 'movimientos registrados'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Débitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summaryDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{formatMoney(summaryCredits)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Book Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Registro del Libro {bookLabel} - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
          {dataSource === 'auto' && (
            <p className="text-xs text-gray-500">Generado automáticamente desde transacciones contables</p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : isMayor ? (
            mayorItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {dataSource === 'auto'
                  ? 'No hay cuentas con movimiento en las transacciones contables para el período seleccionado.'
                  : 'No hay registros manuales del Libro Mayor para el período seleccionado.'}
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
                      <th className="text-right py-3 px-2">Débito</th>
                      <th className="text-right py-3 px-2">Crédito</th>
                      <th className="text-right py-3 px-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mayorItems.map((item, index) => (
                      <tr key={`${item.code}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2 font-mono text-xs">{item.code}</td>
                        <td className="py-3 px-2 font-medium">{item.name}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={item.type === 'ACTIVO' ? 'default' : item.type === 'PASIVO' ? 'secondary' : item.type === 'INGRESO' ? 'secondary' : 'outline'}
                          >
                            {item.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">{formatMoney(item.debit)}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(item.credit)}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatMoney(item.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={4} className="py-3 px-2 text-right">TOTALES:</td>
                      <td className="py-3 px-2 text-right">{formatMoney(ledgerTotals.totalDebitos)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(ledgerTotals.totalCreditos)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(ledgerTotals.totalBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : (
            diarioRows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {dataSource === 'auto'
                  ? 'No hay movimientos registrados en las transacciones contables para el período seleccionado.'
                  : 'No hay registros manuales del Libro Diario para el período seleccionado.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-2">No.</th>
                      <th className="text-left py-3 px-2">Fecha</th>
                      <th className="text-left py-3 px-2">Referencia</th>
                      <th className="text-left py-3 px-2">Cuenta</th>
                      <th className="text-left py-3 px-2">Código</th>
                      <th className="text-right py-3 px-2">Débito</th>
                      <th className="text-right py-3 px-2">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diarioRows.map((row, index) => (
                      <tr key={`${row.code}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2">{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-2 font-medium">{row.reference || '-'}</td>
                        <td className="py-3 px-2">{row.accountName || '-'}</td>
                        <td className="py-3 px-2 font-mono text-xs">{row.code || '-'}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(row.debit)}</td>
                        <td className="py-3 px-2 text-right">{formatMoney(row.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={5} className="py-3 px-2 text-right">TOTALES:</td>
                      <td className="py-3 px-2 text-right">{formatMoney(diarioTotals.totalDebitos)}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(diarioTotals.totalCreditos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Totals Notice */}
      <Card className="bg-cyan-50 border-cyan-200 print:hidden">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Totales del Libro {bookLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isMayor ? (
            <>
              <p>
                <strong>Activos:</strong> {formatMoney(groupedLedger.activos.reduce((sum, i) => sum + i.balance, 0))} - cuentas de activo con movimiento
              </p>
              <p>
                <strong>Pasivos:</strong> {formatMoney(groupedLedger.pasivos.reduce((sum, i) => sum + i.balance, 0))} - cuentas de pasivo con movimiento
              </p>
              <p>
                <strong>Patrimonio:</strong> {formatMoney(groupedLedger.patrimonio.reduce((sum, i) => sum + i.balance, 0))} - cuentas de patrimonio
              </p>
              <p>
                <strong>Ingresos:</strong> {formatMoney(groupedLedger.ingresos.reduce((sum, i) => sum + i.balance, 0))} - ventas e ingresos
              </p>
              <p>
                <strong>Gastos:</strong> {formatMoney(groupedLedger.gastos.reduce((sum, i) => sum + i.balance, 0))} - costos y gastos
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Total Débitos:</strong> {formatMoney(diarioTotals.totalDebitos)} - movimientos al debe
              </p>
              <p>
                <strong>Total Créditos:</strong> {formatMoney(diarioTotals.totalCreditos)} - movimientos al haber
              </p>
            </>
          )}
          <p className="text-xs text-gray-600 mt-4">
            Este reporte cumple con el formato del Libro {bookLabel} requerido por la legislación contable hondureña, generado desde las transacciones contables del período.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
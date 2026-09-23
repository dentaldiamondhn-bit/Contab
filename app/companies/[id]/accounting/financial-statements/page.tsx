'use client';

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Scale, 
  PieChart, 
  TrendingUp, 
  Wallet,
  ExternalLink,
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2
} from 'lucide-react';
import {
  exportAllToExcel,
  exportAllToPDF,
  fetchTrialBalanceForStatements,
  transformAllStatements,
} from '@/lib/reports/export-all';
import type { AllStatements } from '@/lib/reports/export-all';
import { groupBalanceItems } from '@/lib/reports/balance-general';
import type { GroupedBalance } from '@/lib/reports/balance-general';
import { groupResultadoItems } from '@/lib/reports/income-statement';
import type { GroupedResultado } from '@/lib/reports/income-statement';
import { groupFlujoItems } from '@/lib/reports/cash-flow';
import type { FlujoEfectivoGrouped } from '@/lib/reports/cash-flow';

const financialStatements = [
  {
    id: 'balance-comprobacion',
    title: 'Balance de Comprobación',
    description: 'Verifica que los débitos sean iguales a los créditos del período contable. Estructura de 6 columnas con saldos anteriores, movimientos y saldos actuales.',
    icon: Scale,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    path: '/accounting/financial-statements/balance-comprobacion',
    status: 'active'
  },
  {
    id: 'balance-general',
    title: 'Balance General',
    description: 'Muestra los activos, pasivos y patrimonio de la empresa a una fecha determinada. Incluye firmas de responsabilidad.',
    icon: PieChart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    path: '/accounting/financial-statements/balance-general',
    status: 'active'
  },
  {
    id: 'estado-resultados',
    title: 'Estado de Resultados',
    description: 'Ingresos, costos, gastos y utilidad neta. Incluye cálculo de ISR 25% y análisis de gastos.',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    path: '/accounting/financial-statements/estado-resultados',
    status: 'active'
  },
  {
    id: 'flujo-efectivo',
    title: 'Estado de Flujo de Efectivo',
    description: 'Detalla los flujos de entrada y salida de efectivo por actividades operativas, de inversión y financiamiento. Incluye conciliación y burn rate.',
    icon: Wallet,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    path: '/accounting/financial-statements/flujo-efectivo',
    status: 'active'
  }
];

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

type PrintableRow = {
  cells: string[];
  section?: boolean;
  bold?: boolean;
};

const printableTh: CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
};
const printableThRight: CSSProperties = { ...printableTh, textAlign: 'right' };
const printableTd: CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '4px 8px',
  textAlign: 'left',
  fontSize: 12,
};
const printableTdRight: CSSProperties = { ...printableTd, textAlign: 'right' };

function PrintableTable({ rows }: { rows: PrintableRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
      <thead>
        <tr style={{ background: '#f3f4f6' }}>
          <th style={printableTh}>CUENTA</th>
          <th style={printableTh}>CÓDIGO</th>
          <th style={printableThRight}>MONTO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) =>
          r.section ? (
            <tr key={idx} style={{ background: '#e5e7eb', fontWeight: 700 }}>
              <td colSpan={3} style={printableTd}>{r.cells[0]}</td>
            </tr>
          ) : (
            <tr key={idx} style={r.bold ? { fontWeight: 700, background: '#f9fafb' } : undefined}>
              <td style={printableTd}>{r.cells[0]}</td>
              <td style={printableTd}>{r.cells[1]}</td>
              <td style={printableTdRight}>{r.cells[2]}</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

export default function FinancialStatementsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('HNL');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    rtn: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [printStatements, setPrintStatements] = useState<AllStatements | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompanyInfo({
            name: data.business_name || data.businessname || data.name || data.businessName || '',
            rtn: (data.business_rtn || data.businessrtn || data.rtn || data.businessRTN || '').split("-")[0].trim(),
            address: data.business_address || data.businessaddress || data.address || data.businessAddress || ''
          });
          if (data.currency) setCurrency(data.currency);
        } else {
          try {
            const lr = await fetch(`/api/companies`);
            if (lr.ok) {
              const lj = await lr.json();
              const list: any[] = lj.companies || lj || [];
              const comp = list.find((c:any)=> c.tenant_id===companyId || c.id===companyId);
              if (comp) {
                setCompanyInfo({ name: comp.business_name || comp.name || '', rtn: comp.business_rtn || comp.rtn || '', address: comp.business_address || comp.address || '' });
                if (comp.currency) setCurrency(comp.currency);
              }
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    };
    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(first.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCardClick = (statement: typeof financialStatements[0]) => {
    if (statement.status === 'active') {
      router.push(`/companies/${companyId}${statement.path}`);
    } else {
      alert(`${statement.title} - Próximamente disponible`);
    }
  };

  const handleExportExcel = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      await exportAllToExcel(companyId, startDate, endDate, companyInfo.name || 'Empresa', currency);
    } catch (error) {
      console.error('Error exporting all to Excel:', error);
      alert('No se pudo generar el archivo Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!startDate || !endDate) return;
    setLoadingPdf(true);
    try {
      const data = await fetchTrialBalanceForStatements(companyId, startDate, endDate);
      const statements = transformAllStatements(data);
      setPrintStatements(statements);
      setShowPrint(true);
      await new Promise((r) => setTimeout(r, 300));
      await exportAllToPDF(companyId, startDate, endDate, companyInfo.name || 'Empresa', data);
    } catch (error) {
      console.error('Error exporting all to PDF:', error);
      alert('No se pudo generar el PDF combinado');
    } finally {
      setShowPrint(false);
      setPrintStatements(null);
      setLoadingPdf(false);
    }
  };

  const buildBalanceRows = (g: GroupedBalance, fmt: (n: number) => string): PrintableRow[] => {
    const rows: PrintableRow[] = [];
    rows.push({ cells: ['ACTIVOS'], section: true });
    rows.push({ cells: ['Activos Corrientes'], section: true });
    g.activosCorrientes.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Total Activos Corrientes', '', fmt(g.totalActivosCorrientes)], bold: true });
    rows.push({ cells: ['Activos No Corrientes'], section: true });
    g.activosNoCorrientes.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Total Activos No Corrientes', '', fmt(g.totalActivosNoCorrientes)], bold: true });
    rows.push({ cells: ['TOTAL ACTIVOS', '', fmt(g.totalActivos)], bold: true });
    rows.push({ cells: ['PASIVOS'], section: true });
    rows.push({ cells: ['Pasivos Corrientes'], section: true });
    g.pasivosCorrientes.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Total Pasivos Corrientes', '', fmt(g.totalPasivosCorrientes)], bold: true });
    rows.push({ cells: ['Pasivos No Corrientes'], section: true });
    g.pasivosNoCorrientes.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Total Pasivos No Corrientes', '', fmt(g.totalPasivosNoCorrientes)], bold: true });
    rows.push({ cells: ['TOTAL PASIVOS', '', fmt(g.totalPasivos)], bold: true });
    rows.push({ cells: ['PATRIMONIO'], section: true });
    g.patrimonio.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['TOTAL PATRIMONIO', '', fmt(g.totalPatrimonio)], bold: true });
    rows.push({ cells: ['TOTAL PASIVO + PATRIMONIO', '', fmt(g.totalPatrimonioPasivos)], bold: true });
    return rows;
  };

  const buildIncomeRows = (g: GroupedResultado, fmt: (n: number) => string): PrintableRow[] => {
    const rows: PrintableRow[] = [];
    rows.push({ cells: ['INGRESOS OPERACIONALES'], section: true });
    g.ingresos.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(Math.abs(i.amount))] }));
    rows.push({ cells: ['TOTAL INGRESOS', '', fmt(g.totalIngresos)], bold: true });
    rows.push({ cells: ['COSTOS DE VENTAS'], section: true });
    g.costos.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(Math.abs(i.amount))] }));
    rows.push({ cells: ['TOTAL COSTOS', '', fmt(g.totalCostos)], bold: true });
    rows.push({ cells: ['UTILIDAD BRUTA', '', fmt(g.utilidadBruta)], bold: true });
    rows.push({ cells: ['GASTOS OPERATIVOS'], section: true });
    g.gastos.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(Math.abs(i.amount))] }));
    rows.push({ cells: ['TOTAL GASTOS OPERATIVOS', '', fmt(g.totalGastos)], bold: true });
    rows.push({ cells: ['UTILIDAD DE OPERACIÓN', '', fmt(g.utilidadOperacion)], bold: true });
    rows.push({ cells: ['UTILIDAD ANTES DE IMPUESTOS', '', fmt(g.utilidadAntesImpuestos)], bold: true });
    rows.push({ cells: ['IMPUESTO SOBRE LA RENTA (ISR 25%)', '', fmt(g.isr)], bold: true });
    rows.push({ cells: ['UTILIDAD NETA', '', fmt(g.utilidadNeta)], bold: true });
    return rows;
  };

  const buildCashRows = (g: FlujoEfectivoGrouped, fmt: (n: number) => string): PrintableRow[] => {
    const rows: PrintableRow[] = [];
    rows.push({ cells: ['1. ACTIVIDADES DE OPERACIÓN'], section: true });
    g.operacion.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Efectivo Neto de Operación', '', fmt(g.netoOperacion)], bold: true });
    rows.push({ cells: ['2. ACTIVIDADES DE INVERSIÓN'], section: true });
    g.inversion.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Efectivo Neto de Inversión', '', fmt(g.netoInversion)], bold: true });
    rows.push({ cells: ['3. ACTIVIDADES DE FINANCIACIÓN'], section: true });
    g.financiacion.forEach((i) => rows.push({ cells: [i.name, i.code, fmt(i.amount)] }));
    rows.push({ cells: ['Efectivo Neto de Financiación', '', fmt(g.netoFinanciacion)], bold: true });
    rows.push({ cells: ['AUMENTO / DISMINUCIÓN NETA DE EFECTIVO', '', fmt(g.netoTotal)], bold: true });
    rows.push({ cells: ['Saldo Inicial', '', fmt(g.saldoInicial)] });
    rows.push({ cells: ['Saldo Final en Bancos', '', fmt(g.saldoFinal)], bold: true });
    return rows;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/modules`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📑 Estados Financieros</h1>
                <p className="text-gray-600">Genera y visualiza los estados financieros de la empresa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exportar Todo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-lg text-blue-900 flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Exportar Todo (Consolidado)
            </CardTitle>
            <CardDescription>
              Balance General + Estado de Resultados + Flujo de Efectivo en un solo archivo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-start" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Desde
                </Label>
                <Input
                  id="export-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-end" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Hasta
                </Label>
                <Input
                  id="export-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleExportExcel}
                  disabled={loading || loadingPdf || !startDate || !endDate}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  📊 Exportar Todo a Excel
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={handleExportPDF}
                  disabled={loading || loadingPdf || !startDate || !endDate}
                  className="w-full"
                >
                  {loadingPdf ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  📄 Exportar Todo a PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Statements Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {financialStatements.map((statement) => {
            const IconComponent = statement.icon;
            return (
              <Card 
                key={statement.id}
                className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  statement.status === 'coming-soon' ? 'opacity-75' : ''
                }`}
                onClick={() => handleCardClick(statement)}
              >
                <CardHeader className={`${statement.bgColor} border-b`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <IconComponent className={`h-6 w-6 ${statement.color}`} />
                    </div>
                    {statement.status === 'coming-soon' && (
                      <Badge variant="secondary" className="text-xs">
                        Próximamente
                      </Badge>
                    )}
                    {statement.status === 'active' && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{statement.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {statement.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {statement.status === 'active' ? 'Haz clic para acceder' : 'En desarrollo'}
                    </span>
                    {statement.status === 'active' ? (
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    ) : (
                      <span className="text-gray-400 text-xs">🔒</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Panel imprimible para el PDF combinado */}
      {showPrint && printStatements && (
        <div
          id="printable-export-all"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 794,
            minHeight: '100vh',
            background: '#ffffff',
            zIndex: 9999,
            padding: 24,
            color: '#111827'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              ESTADOS FINANCIEROS CONSOLIDADOS
            </h1>
            <p style={{ fontWeight: 600, margin: '6px 0 0' }}>{companyInfo.name}</p>
            <p style={{ margin: 0, fontSize: 12 }}>
              RTN: {companyInfo.rtn} | Del {formatDate(startDate)} al {formatDate(endDate)}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              (Expresado en {currency === 'USD' ? 'Dólares' : 'Lempiras'})
            </p>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>1. BALANCE GENERAL</h2>
          <PrintableTable rows={buildBalanceRows(groupBalanceItems(printStatements.balance), formatCurrency)} />

          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>2. ESTADO DE RESULTADOS</h2>
          <PrintableTable rows={buildIncomeRows(groupResultadoItems(printStatements.income), formatCurrency)} />

          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>3. ESTADO DE FLUJO DE EFECTIVO</h2>
          <PrintableTable rows={buildCashRows(groupFlujoItems(printStatements.cash), formatCurrency)} />

          <p style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', marginTop: 24 }}>
            Documento generado el {new Date().toLocaleDateString('es-HN')} | Sistema Contable Diamond
          </p>
        </div>
      )}
    </div>
  );
}
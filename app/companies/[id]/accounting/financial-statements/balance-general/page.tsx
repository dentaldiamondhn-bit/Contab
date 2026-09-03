'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Building2,
  Printer,
  FileText,
  Percent,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';

interface BalanceItem {
  code: string;
  name: string;
  amount: number;
  type: 'activo-corriente' | 'activo-no-corriente' | 'pasivo-corriente' | 'pasivo-no-corriente' | 'patrimonio';
  parentCode?: string;
}

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

export default function BalanceGeneralPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState<'HNL' | 'USD'>('HNL');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    rtn: '',
    address: ''
  });
  const [balanceData, setBalanceData] = useState<BalanceItem[]>([]);
  const [showPercentages, setShowPercentages] = useState(true);

  // Cargar datos de la empresa
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          // Tenant viene como businessname/business_name, companies como name
          setCompanyInfo({
            name: data.business_name || data.businessname || data.name || data.businessName || '',
            rtn: (data.business_rtn || data.businessrtn || data.rtn || data.businessRTN || '').split("-")[0].trim(),
            address: data.business_address || data.businessaddress || data.address || data.businessAddress || ''
          });
        } else {
          // Fallback a companies list
          try {
            const lr = await fetch(`/api/companies`);
            if (lr.ok) {
              const lj = await lr.json();
              const list: any[] = lj.companies || lj || [];
              const comp = list.find((c:any)=> c.tenant_id===companyId || c.id===companyId);
              if (comp) setCompanyInfo({ name: comp.business_name || comp.name || '', rtn: comp.business_rtn || comp.rtn || '', address: comp.business_address || comp.address || '' });
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    };
    fetchCompany();
  }, [companyId]);

  // Cargar fechas iniciales (mes actual)
  useEffect(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(first.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Cargar datos del balance
  useEffect(() => {
    if (startDate && endDate) {
      loadBalanceData();
    }
  }, [startDate, endDate]);

  const loadBalanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      
      if (response.ok) {
        const data = await response.json();
        const transformed = transformToBalanceGeneral(data || []);
        setBalanceData(transformed);
      }
    } catch (error) {
      console.error('Error loading balance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transformar datos del trial balance a estructura de Balance General
  const transformToBalanceGeneral = (data: any[]): BalanceItem[] => {
    return data.map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance || 0);
      
      // Clasificar por tipo de cuenta según código
      const firstDigit = code.charAt(0);
      let type: BalanceItem['type'];
      
      if (firstDigit === '1') {
        // Activos: 1xxx
        // Corrientes: 11xx (Caja, Bancos), 12xx (Clientes), 13xx (Inventarios)
        // No corrientes: 14xx+ (Mobiliario, Vehículos)
        type = code.startsWith('11') || code.startsWith('12') || code.startsWith('13') 
          ? 'activo-corriente' 
          : 'activo-no-corriente';
      } else if (firstDigit === '2') {
        // Pasivos: 2xxx
        // Corrientes: 21xx (Proveedores), 22xx (Acreedores), 23xx (Impuestos)
        // No corrientes: 24xx+ (Préstamos largo plazo)
        type = code.startsWith('21') || code.startsWith('22') || code.startsWith('23')
          ? 'pasivo-corriente'
          : 'pasivo-no-corriente';
      } else if (firstDigit === '3') {
        // Patrimonio: 3xxx
        type = 'patrimonio';
      } else {
        // Por defecto, si no encaja, lo ponemos en patrimonio
        type = 'patrimonio';
      }
      
      return {
        code,
        name,
        amount: Math.abs(balance), // Balance General usa valores absolutos
        type,
        parentCode: code.length > 2 ? code.substring(0, 2) : undefined
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
  };

  // Agrupar por secciones
  const groupedData = useMemo(() => {
    const activosCorrientes = balanceData.filter(i => i.type === 'activo-corriente');
    const activosNoCorrientes = balanceData.filter(i => i.type === 'activo-no-corriente');
    const pasivosCorrientes = balanceData.filter(i => i.type === 'pasivo-corriente');
    const pasivosNoCorrientes = balanceData.filter(i => i.type === 'pasivo-no-corriente');
    const patrimonio = balanceData.filter(i => i.type === 'patrimonio');
    
    return {
      activosCorrientes,
      activosNoCorrientes,
      pasivosCorrientes,
      pasivosNoCorrientes,
      patrimonio,
      totalActivosCorrientes: activosCorrientes.reduce((sum, i) => sum + i.amount, 0),
      totalActivosNoCorrientes: activosNoCorrientes.reduce((sum, i) => sum + i.amount, 0),
      totalPasivosCorrientes: pasivosCorrientes.reduce((sum, i) => sum + i.amount, 0),
      totalPasivosNoCorrientes: pasivosNoCorrientes.reduce((sum, i) => sum + i.amount, 0),
      totalPatrimonio: patrimonio.reduce((sum, i) => sum + i.amount, 0),
    };
  }, [balanceData]);

  const totalActivos = groupedData.totalActivosCorrientes + groupedData.totalActivosNoCorrientes;
  const totalPasivos = groupedData.totalPasivosCorrientes + groupedData.totalPasivosNoCorrientes;
  const totalPatrimonioPasivos = totalPasivos + groupedData.totalPatrimonio;
  
  // Validar que Activo = Pasivo + Patrimonio
  const isBalanced = Math.abs(totalActivos - totalPatrimonioPasivos) < 0.01;

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calcular porcentaje del activo total
  const getPercentage = (amount: number) => {
    if (totalActivos === 0) return 0;
    return (amount / totalActivos) * 100;
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Exportar a PDF/Print — solo balance, con formatos del proyecto
  const handlePrint = () => {
    const el = document.getElementById("printable-balance");
    if (!el) return window.print();
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s=>s.outerHTML).join("\n");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return window.print();
    w.document.write(`
      <html><head><title>Balance General - ${companyInfo.name}</title>
      ${styles}
      <style>
        body{padding:24px;color:#111;background:white}
        @media print{ @page{margin:12mm} .print\\:hidden{display:none!important} }
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px}
      </style>
      </head><body><div class="max-w-5xl mx-auto">${el.innerHTML}</div></body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); w.close(); }, 400);
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById("printable-balance");
    if (!el) return handlePrint();
    try {
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `Balance_General_${companyInfo.name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      // Fallback a impresión si falla html2canvas
      handlePrint();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/accounting/financial-statements`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <Scale className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
                  <p className="text-gray-600">Estado de Situación Financiera</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowPercentages(!showPercentages)}>
                <Percent className="h-4 w-4 mr-2" />
                {showPercentages ? 'Ocultar %' : 'Mostrar %'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <Card className="mb-6 print:hidden">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Fecha Inicio
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Fecha Fin
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select value={currency} onValueChange={(v: 'HNL' | 'USD') => setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HNL">Lempiras (HNL)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadBalanceData} className="w-full">
                  Generar Balance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="printable-balance">
        {/* Encabezado del Reporte */}
        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center print:p-4">
            <div className="mb-4 print:mb-2">
              <Building2 className="h-12 w-12 mx-auto text-blue-600 print:h-8 print:w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
              {companyInfo.name}
            </h2>
            <p className="text-gray-600 mt-1">RTN: {companyInfo.rtn}</p>
            <p className="text-gray-500 text-sm">{companyInfo.address}</p>
            
            <div className="mt-6 border-t pt-4">
              <h1 className="text-3xl font-bold text-gray-900">BALANCE GENERAL</h1>
              <p className="text-lg text-gray-600 mt-2">
                Del {formatDate(startDate)} al {formatDate(endDate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                (Expresado en {currency === 'HNL' ? 'Lempiras' : 'Dólares'})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Validación */}
        <Card className={`mb-6 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isBalanced ? (
                  <Scale className="h-5 w-5 text-green-600" />
                ) : (
                  <Scale className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                  {isBalanced ? '✅ Balance Cuadrado' : '⚠️ Balance Descuadrado'}
                </span>
                <span className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  Activo = {formatCurrency(totalActivos)} | Pasivo + Patrimonio = {formatCurrency(totalPatrimonioPasivos)}
                </span>
              </div>
              <Badge variant={isBalanced ? 'default' : 'destructive'}>
                {balanceData.length} cuentas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ACTIVOS */}
        <Card className="mb-6">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-xl text-blue-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              ACTIVOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Activos Corrientes */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Activos Corrientes</h4>
              {groupedData.activosCorrientes.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    {showPercentages && (
                      <span className="text-xs text-gray-400">{getPercentage(item.amount).toFixed(1)}%</span>
                    )}
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-2 border-t font-semibold text-blue-700">
                <span>Total Activos Corrientes</span>
                <div className="flex items-center space-x-4">
                  {showPercentages && (
                    <span className="text-xs">{getPercentage(groupedData.totalActivosCorrientes).toFixed(1)}%</span>
                  )}
                  <span>{formatCurrency(groupedData.totalActivosCorrientes)}</span>
                </div>
              </div>
            </div>

            {/* Activos No Corrientes */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Activos No Corrientes</h4>
              {groupedData.activosNoCorrientes.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    {showPercentages && (
                      <span className="text-xs text-gray-400">{getPercentage(item.amount).toFixed(1)}%</span>
                    )}
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-2 border-t font-semibold text-blue-700">
                <span>Total Activos No Corrientes</span>
                <div className="flex items-center space-x-4">
                  {showPercentages && (
                    <span className="text-xs">{getPercentage(groupedData.totalActivosNoCorrientes).toFixed(1)}%</span>
                  )}
                  <span>{formatCurrency(groupedData.totalActivosNoCorrientes)}</span>
                </div>
              </div>
            </div>

            {/* Total Activos */}
            <div className="p-4 bg-blue-100">
              <div className="flex justify-between font-bold text-lg text-blue-900">
                <span>TOTAL ACTIVOS</span>
                <div className="flex items-center space-x-4">
                  {showPercentages && <span className="text-sm">100.0%</span>}
                  <span>{formatCurrency(totalActivos)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PASIVOS */}
        <Card className="mb-6">
          <CardHeader className="bg-red-50 border-b">
            <CardTitle className="text-xl text-red-900 flex items-center">
              <TrendingDown className="h-5 w-5 mr-2" />
              PASIVOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Pasivos Corrientes */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Pasivos Corrientes</h4>
              {groupedData.pasivosCorrientes.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-2 border-t font-semibold text-red-700">
                <span>Total Pasivos Corrientes</span>
                <span>{formatCurrency(groupedData.totalPasivosCorrientes)}</span>
              </div>
            </div>

            {/* Pasivos No Corrientes */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Pasivos No Corrientes</h4>
              {groupedData.pasivosNoCorrientes.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-2 border-t font-semibold text-red-700">
                <span>Total Pasivos No Corrientes</span>
                <span>{formatCurrency(groupedData.totalPasivosNoCorrientes)}</span>
              </div>
            </div>

            {/* Total Pasivos */}
            <div className="p-4 bg-red-100">
              <div className="flex justify-between font-bold text-lg text-red-900">
                <span>TOTAL PASIVOS</span>
                <span>{formatCurrency(totalPasivos)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PATRIMONIO */}
        <Card className="mb-6">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-xl text-green-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              PATRIMONIO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-gray-50">
              {groupedData.patrimonio.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-green-100">
              <div className="flex justify-between font-bold text-lg text-green-900">
                <span>TOTAL PATRIMONIO</span>
                <span>{formatCurrency(groupedData.totalPatrimonio)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Pasivo + Patrimonio */}
        <Card className="mb-6 border-2 border-gray-800">
          <CardContent className="p-4 bg-gray-100">
            <div className="flex justify-between font-bold text-xl text-gray-900">
              <span>TOTAL PASIVO + PATRIMONIO</span>
              <span>{formatCurrency(totalPatrimonioPasivos)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Firmas de Responsabilidad */}
        <Card className="mt-8 print:mt-12">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Firmas de Responsabilidad</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Contador General</p>
                <p className="text-xs text-gray-500">No. Colegiación: ____________</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Representante Legal</p>
                <p className="text-xs text-gray-500">Nombre: ____________</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Auditor Externo</p>
                <p className="text-xs text-gray-500">(Si aplica)</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-8">
              Documento generado el {new Date().toLocaleDateString('es-HN')} | Sistema Contable Diamond
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

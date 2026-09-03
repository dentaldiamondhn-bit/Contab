'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Filter,
  Scale
} from 'lucide-react';

interface BalanceItem {
  code: string;
  name: string;
  saldoAnteriorDebe: number;
  saldoAnteriorHaber: number;
  movimientosDebe: number;
  movimientosHaber: number;
  saldoActualDebe: number;
  saldoActualHaber: number;
  nivel: number;
  parentCode?: string;
}

export default function BalanceComprobacionPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<BalanceItem[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountLevel, setAccountLevel] = useState<'all' | 'mayor' | 'detalle'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDateStr = today.toISOString().split('T')[0];
    const startDateStr = firstDayOfMonth.toISOString().split('T')[0];
    
    setEndDate(endDateStr);
    setStartDate(startDateStr);
  }, []);

  // Cargar datos cuando las fechas estén listas
  useEffect(() => {
    if (startDate && endDate) {
      loadBalanceData();
    }
  }, [startDate, endDate]);

  const loadBalanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trial balance data:', data);
        // Transformar datos al formato de Balance de Comprobación
        const transformed = transformToBalanceComprobacion(data || []);
        setBalanceData(transformed);
      } else {
        console.error('Error loading trial balance:', await response.text());
      }
    } catch (error) {
      console.error('Error loading balance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transformar datos a formato 6 columnas
  const transformToBalanceComprobacion = (data: any[]): BalanceItem[] => {
    return data.map((item: any) => {
      // Manejar estructura anidada de getTrialBalance: item.account.code, item.debit, item.credit
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      
      // Los campos de la API trial-balance son: debit, credit, balance
      const movDebe = parseFloat(item.debit || item.debit_amount || item.debe || 0);
      const movHaber = parseFloat(item.credit || item.credit_amount || item.haber || 0);
      const saldoActual = parseFloat(item.balance || (movDebe - movHaber) || 0);
      
      // Calcular nivel de la cuenta basado en el código
      const nivel = code.length <= 2 ? 1 : code.length <= 4 ? 2 : 3;
      
      return {
        code,
        name,
        saldoAnteriorDebe: 0, // Se calcularía de transacciones previas al período
        saldoAnteriorHaber: 0,
        movimientosDebe: movDebe,
        movimientosHaber: movHaber,
        saldoActualDebe: saldoActual > 0 ? saldoActual : 0,
        saldoActualHaber: saldoActual < 0 ? Math.abs(saldoActual) : 0,
        nivel,
        parentCode: code.length > 2 ? code.substring(0, 2) : undefined
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
  };

  // Filtrar datos según nivel de cuenta y búsqueda
  const filteredData = useMemo(() => {
    let filtered = balanceData;
    
    // Filtrar por nivel
    if (accountLevel === 'mayor') {
      filtered = filtered.filter(item => item.code.length <= 2);
    } else if (accountLevel === 'detalle') {
      filtered = filtered.filter(item => item.code.length > 2);
    }
    
    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [balanceData, accountLevel, searchTerm]);

  // Calcular totales
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      saldoAnteriorDebe: acc.saldoAnteriorDebe + item.saldoAnteriorDebe,
      saldoAnteriorHaber: acc.saldoAnteriorHaber + item.saldoAnteriorHaber,
      movimientosDebe: acc.movimientosDebe + item.movimientosDebe,
      movimientosHaber: acc.movimientosHaber + item.movimientosHaber,
      saldoActualDebe: acc.saldoActualDebe + item.saldoActualDebe,
      saldoActualHaber: acc.saldoActualHaber + item.saldoActualHaber,
    }), {
      saldoAnteriorDebe: 0,
      saldoAnteriorHaber: 0,
      movimientosDebe: 0,
      movimientosHaber: 0,
      saldoActualDebe: 0,
      saldoActualHaber: 0,
    });
  }, [filteredData]);

  // Validar que Debe = Haber
  const isBalanced = useMemo(() => {
    const debeTotal = totals.saldoActualDebe;
    const haberTotal = totals.saldoActualHaber;
    return Math.abs(debeTotal - haberTotal) < 0.01; // Margen de error de 1 centavo
  }, [totals]);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'Código', 'Cuenta', 'Saldo Anterior Debe', 'Saldo Anterior Haber',
      'Movimientos Debe', 'Movimientos Haber', 'Saldo Actual Debe', 'Saldo Actual Haber'
    ];
    
    const rows = filteredData.map(item => [
      item.code,
      item.name,
      item.saldoAnteriorDebe.toFixed(2),
      item.saldoAnteriorHaber.toFixed(2),
      item.movimientosDebe.toFixed(2),
      item.movimientosHaber.toFixed(2),
      item.saldoActualDebe.toFixed(2),
      item.saldoActualHaber.toFixed(2)
    ]);
    
    const totalRow = [
      'TOTALES', '',
      totals.saldoAnteriorDebe.toFixed(2),
      totals.saldoAnteriorHaber.toFixed(2),
      totals.movimientosDebe.toFixed(2),
      totals.movimientosHaber.toFixed(2),
      totals.saldoActualDebe.toFixed(2),
      totals.saldoActualHaber.toFixed(2)
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      totalRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `balance-comprobacion-${startDate}-${endDate}.csv`;
    link.click();
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
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
                onClick={() => router.push(`/companies/${companyId}/accounting/financial-statements`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <Scale className="h-6 w-6 text-cyan-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Balance de Comprobación</h1>
                  <p className="text-gray-600">6 Columnas - Validación de Partida Doble</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="accountLevel">Nivel de Cuentas</Label>
                <Select value={accountLevel} onValueChange={(v: any) => setAccountLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    <SelectItem value="mayor">Solo Mayor (2 dígitos)</SelectItem>
                    <SelectItem value="detalle">Solo Detalle (4+ dígitos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={loadBalanceData}>
                <Filter className="h-4 w-4 mr-2" />
                Generar Balance
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Validación */}
        <Card className={`mb-6 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isBalanced ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                  {isBalanced ? '✅ Balance Cuadrado' : '⚠️ Balance Descuadrado'}
                </span>
                <span className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced 
                    ? `Debe = Haber: ${formatCurrency(totals.saldoActualDebe)}` 
                    : `Diferencia: ${formatCurrency(Math.abs(totals.saldoActualDebe - totals.saldoActualHaber))}`
                  }
                </span>
              </div>
              <Badge variant={isBalanced ? 'default' : 'destructive'}>
                {filteredData.length} cuentas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabla 6 Columnas */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando balance de comprobación...</div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay datos para el período seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="w-full table-fixed min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead rowSpan={2} className="border font-bold w-[10%]">Código</TableHead>
                    <TableHead rowSpan={2} className="border font-bold w-[28%]">Cuenta</TableHead>
                    <TableHead colSpan={2} className="border text-center font-bold bg-cyan-50 w-[22%]">
                      Saldo Anterior
                    </TableHead>
                    <TableHead colSpan={2} className="border text-center font-bold bg-green-50 w-[22%]">
                      Movimientos del Período
                    </TableHead>
                    <TableHead colSpan={2} className="border text-center font-bold bg-purple-50 w-[22%]">
                      Saldo Actual
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-50">
                    <TableHead className="border text-right font-medium w-[11%]">Debe</TableHead>
                    <TableHead className="border text-right font-medium w-[11%]">Haber</TableHead>
                    <TableHead className="border text-right font-medium w-[11%]">Debe</TableHead>
                    <TableHead className="border text-right font-medium w-[11%]">Haber</TableHead>
                    <TableHead className="border text-right font-medium w-[11%]">Debe</TableHead>
                    <TableHead className="border text-right font-medium w-[11%]">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={index} className={item.nivel === 1 ? 'bg-gray-50 font-medium' : ''}>
                      <TableCell className="border font-mono">{item.code}</TableCell>
                      <TableCell className="border">{item.name}</TableCell>
                      <TableCell className="border text-right">
                        {item.saldoAnteriorDebe > 0 ? formatCurrency(item.saldoAnteriorDebe) : '-'}
                      </TableCell>
                      <TableCell className="border text-right">
                        {item.saldoAnteriorHaber > 0 ? formatCurrency(item.saldoAnteriorHaber) : '-'}
                      </TableCell>
                      <TableCell className="border text-right">
                        {item.movimientosDebe > 0 ? formatCurrency(item.movimientosDebe) : '-'}
                      </TableCell>
                      <TableCell className="border text-right">
                        {item.movimientosHaber > 0 ? formatCurrency(item.movimientosHaber) : '-'}
                      </TableCell>
                      <TableCell className={`border text-right font-medium ${item.saldoActualDebe > 0 ? 'text-cyan-600' : ''}`}>
                        {item.saldoActualDebe > 0 ? formatCurrency(item.saldoActualDebe) : '-'}
                      </TableCell>
                      <TableCell className={`border text-right font-medium ${item.saldoActualHaber > 0 ? 'text-red-600' : ''}`}>
                        {item.saldoActualHaber > 0 ? formatCurrency(item.saldoActualHaber) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Fila de Totales */}
                  <TableRow className="bg-gray-200 font-bold">
                    <TableCell colSpan={2} className="border text-right">TOTALES</TableCell>
                    <TableCell className="border text-right text-cyan-600">
                      {formatCurrency(totals.saldoAnteriorDebe)}
                    </TableCell>
                    <TableCell className="border text-right text-red-600">
                      {formatCurrency(totals.saldoAnteriorHaber)}
                    </TableCell>
                    <TableCell className="border text-right text-cyan-600">
                      {formatCurrency(totals.movimientosDebe)}
                    </TableCell>
                    <TableCell className="border text-right text-red-600">
                      {formatCurrency(totals.movimientosHaber)}
                    </TableCell>
                    <TableCell className={`border text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.saldoActualDebe)}
                    </TableCell>
                    <TableCell className={`border text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.saldoActualHaber)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leyenda */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-cyan-50 border"></div>
                <span>Saldo Anterior (remanente período previo)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-50 border"></div>
                <span>Movimientos del Período (cargos/abonos)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-50 border"></div>
                <span>Saldo Actual (resultado final)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

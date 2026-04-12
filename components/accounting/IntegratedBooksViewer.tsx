'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/lib/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, BarChart3, FileText, RefreshCw } from 'lucide-react';

interface IntegratedBookData {
  [key: string]: any;
}

const IntegratedBooksViewer: React.FC = () => {
  const [bookType, setBookType] = useState<string>('diario');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [data, setData] = useState<IntegratedBookData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);

  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || '1'; // Use actual tenant ID from context

  const fetchBookData = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        bookType,
        tenantId,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(filterType && { filterType })
      });

      const response = await fetch(`/api/accounting/integrated-books?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error fetching data');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const syncBooks = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/accounting/integrated-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ action: 'sync' })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error syncing books');
      }

      // Refrescar datos después de sincronizar
      await fetchBookData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchBookData();
  }, [bookType]);

  const getColumnsForBookType = () => {
    switch (bookType) {
      case 'diario':
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'tipo_comprobante', label: 'Tipo' },
          { key: 'numero_comprobante', label: 'Número' },
          { key: 'descripcion', label: 'Descripción' },
          { key: 'codigo_cuenta', label: 'Cuenta' },
          { key: 'nombre_cuenta', label: 'Nombre Cuenta' },
          { key: 'debe', label: 'Debe' },
          { key: 'haber', label: 'Haber' }
        ];
      
      case 'mayor':
        return [
          { key: 'codigo_cuenta', label: 'Código' },
          { key: 'nombre_cuenta', label: 'Nombre Cuenta' },
          { key: 'tipo_cuenta', label: 'Tipo' },
          { key: 'total_transacciones', label: 'Transacciones' },
          { key: 'total_debe', label: 'Total Debe' },
          { key: 'total_haber', label: 'Total Haber' },
          { key: 'saldo', label: 'Saldo' }
        ];
      
      case 'balance':
        return [
          { key: 'categoria', label: 'Categoría' },
          { key: 'debe', label: 'Debe' },
          { key: 'haber', label: 'Haber' },
          { key: 'saldo', label: 'Saldo' }
        ];
      
      case 'resumen':
        return [
          { key: 'año', label: 'Año' },
          { key: 'mes', label: 'Mes' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'total_transacciones', label: 'Transacciones' },
          { key: 'total_monto', label: 'Monto Total' },
          { key: 'total_debe', label: 'Debe' },
          { key: 'total_haber', label: 'Haber' }
        ];
      
      default:
        return [];
    }
  };

  const getFilterOptions = () => {
    switch (bookType) {
      case 'diario':
        return [
          { value: '', label: 'Todos' },
          { value: 'INGRESO', label: 'Ingresos' },
          { value: 'EGRESO', label: 'Egresos' }
        ];
      
      case 'mayor':
        return [
          { value: '', label: 'Todos' },
          { value: 'ASSET', label: 'Activos' },
          { value: 'LIABILITY', label: 'Pasivos' },
          { value: 'EQUITY', label: 'Patrimonio' },
          { value: 'REVENUE', label: 'Ingresos' },
          { value: 'EXPENSE', label: 'Gastos' }
        ];
      
      default:
        return [{ value: '', label: 'Todos' }];
    }
  };

  const formatValue = (value: any, key: string) => {
    if (key.includes('debe') || key.includes('haber') || key.includes('saldo') || key.includes('monto')) {
      return typeof value === 'number' ? `L. ${value.toFixed(2)}` : value;
    }
    if (key === 'fecha') {
      return value ? new Date(value).toLocaleDateString() : value;
    }
    if (key === 'mes') {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return months[value - 1] || value;
    }
    return value;
  };

  const getBookIcon = (type: string) => {
    switch (type) {
      case 'diario': return <FileText className="h-4 w-4" />;
      case 'mayor': return <BookOpen className="h-4 w-4" />;
      case 'balance': return <BarChart3 className="h-4 w-4" />;
      case 'resumen': return <Calendar className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Libros Contables Integrados
            </CardTitle>
            <Button 
              onClick={syncBooks} 
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={bookType} onValueChange={setBookType} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="diario" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Libro Diario
              </TabsTrigger>
              <TabsTrigger value="mayor" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Libro Mayor
              </TabsTrigger>
              <TabsTrigger value="balance" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Balance
              </TabsTrigger>
              <TabsTrigger value="resumen" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Resumen
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="filterType">Filtro</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar filtro" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilterOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchBookData} disabled={loading} className="w-full">
                    {loading ? 'Cargando...' : 'Actualizar'}
                  </Button>
                </div>
              </div>
            </div>

            <TabsContent value={bookType} className="mt-6">
              {error && (
                <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                  Error: {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {getColumnsForBookType().map((column) => (
                          <TableHead key={column.key}>{column.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={getColumnsForBookType().length} className="text-center py-8">
                            No hay datos disponibles
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.map((row, index) => (
                          <TableRow key={index}>
                            {getColumnsForBookType().map((column) => (
                              <TableCell key={column.key}>
                                {formatValue(row[column.key], column.key)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegratedBooksViewer;

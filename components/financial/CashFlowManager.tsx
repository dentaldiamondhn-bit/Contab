"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface CashFlowManagerProps {
  tenantId: string;
}

interface CashFlowEntry {
  id: string;
  entryDate: string;
  entryType: 'INFLOW' | 'OUTFLOW';
  category: string;
  description: string;
  amount: number;
  account: string;
  reference: string;
  createdAt: string;
}

interface CashFlowSummary {
  period: string;
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  topInflowCategory: string;
  topOutflowCategory: string;
  averageDailyFlow: number;
}

export default function CashFlowManager({ tenantId }: CashFlowManagerProps) {
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryType: 'INFLOW' as 'INFLOW' | 'OUTFLOW',
    category: '',
    description: '',
    amount: 0,
    account: '',
    reference: ''
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadCashFlowEntries();
  }, [tenantId, periodFilter]);

  const loadCashFlowEntries = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Calcular fechas del período
      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Cargar entradas de flujo de efectivo
      const { data, error } = await supabase
        .from('CashFlowEntry')
        .select('*')
        .gte('entryDate', startDate.toISOString().split('T')[0])
        .lte('entryDate', now.toISOString().split('T')[0])
        .order('entryDate', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (error: any) {
      console.error("Error loading cash flow entries:", error);
      alert("Error al cargar las entradas de flujo de efectivo");
    } finally {
      setLoading(false);
    }
  };

  const saveCashFlowEntry = async () => {
    try {
      if (!entryForm.category || !entryForm.description || !entryForm.amount || entryForm.amount <= 0 || !entryForm.account) {
        alert("Por favor complete los campos requeridos");
        return;
      }

      const entryData = {
        tenantId,
        entryDate: entryForm.entryDate,
        entryType: entryForm.entryType,
        category: entryForm.category,
        description: entryForm.description,
        amount: Math.round(entryForm.amount * 100), // Convertir a centavos
        account: entryForm.account,
        reference: entryForm.reference
      };

      // Crear entrada de flujo de efectivo
      const { error } = await supabase
        .from('CashFlowEntry')
        .insert(entryData);

      if (error) throw error;

      alert("Entrada de flujo de efectivo registrada exitosamente");
      
      // Resetear formulario
      setEntryForm({
        entryDate: new Date().toISOString().split('T')[0],
        entryType: 'INFLOW',
        category: '',
        description: '',
        amount: 0,
        account: '',
        reference: ''
      });
      setShowEntryForm(false);
      loadCashFlowEntries();
    } catch (error: any) {
      console.error("Error saving cash flow entry:", error);
      alert("Error al guardar la entrada de flujo de efectivo");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Cuenta', 'Referencia'
    ];
    const rows = entries.map(entry => [
      entry.entryDate,
      entry.entryType === 'INFLOW' ? 'Entrada' : 'Salida',
      entry.category,
      entry.description,
      (entry.amount / 100).toFixed(2),
      entry.account,
      entry.reference || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flujo_efectivo_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateSummary = () => {
    const filteredEntries = entries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.account.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = entryTypeFilter === "all" || entry.entryType === entryTypeFilter;
      
      return matchesSearch && matchesType;
    });

    const totalInflow = filteredEntries
      .filter(entry => entry.entryType === 'INFLOW')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalOutflow = filteredEntries
      .filter(entry => entry.entryType === 'OUTFLOW')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const netFlow = totalInflow - totalOutflow;

    // Calcular categorías principales
    const categoryTotals = filteredEntries.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = { inflow: 0, outflow: 0 };
      }
      
      if (entry.entryType === 'INFLOW') {
        acc[entry.category].inflow += entry.amount;
      } else {
        acc[entry.category].outflow += entry.amount;
      }
      
      return acc;
    }, {} as Record<string, { inflow: number; outflow: number }>);

    const topInflowCategory = Object.entries(categoryTotals)
      .filter(([_, totals]) => totals.inflow > 0)
      .sort(([, a], [, b]) => b.inflow - a.inflow)[0][0];

    const topOutflowCategory = Object.entries(categoryTotals)
      .filter(([_, totals]) => totals.outflow > 0)
      .sort(([, a], [, b]) => b.outflow - a.outflow)[0][0];

    const daysInPeriod = periodFilter === 'month' ? 30 : 
                           periodFilter === 'quarter' ? 90 : 365;

    const averageDailyFlow = netFlow / daysInPeriod;

    return {
      period: periodFilter === 'month' ? 'Mensual' : 
             periodFilter === 'quarter' ? 'Trimestral' : 'Anual',
      totalInflow,
      totalOutflow,
      netFlow,
      topInflowCategory: topInflowCategory || 'N/A',
      topOutflowCategory: topOutflowCategory || 'N/A',
      averageDailyFlow
    };
  };

  const summary = calculateSummary();

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.account.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = entryTypeFilter === "all" || entry.entryType === entryTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case 'INFLOW':
        return <Badge className="bg-green-100 text-green-800">Entrada</Badge>;
      case 'OUTFLOW':
        return <Badge className="bg-red-100 text-red-800">Salida</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando flujo de efectivo...</p>
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
            <DollarSign className="h-6 w-6 mr-2 text-green-600" />
            Flujo de Efectivo
          </h2>
          <p className="text-gray-600">Gestión de entradas y salidas de efectivo</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as 'month' | 'quarter' | 'year')}
                className="w-full p-2 border rounded-md"
              >
                <option value="month">Mensual</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={entryTypeFilter}
                onChange={(e) => setEntryTypeFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="INFLOW">Entradas</option>
                <option value="OUTFLOW">Salidas</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Descripción, categoría, cuenta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredEntries.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.period}
            </div>
            <p className="text-xs text-gray-600">
              Análisis del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {(summary.totalInflow / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Total de entradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {(summary.totalOutflow / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Total de salidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {(summary.netFlow / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Entradas - Salidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              L. {summary.averageDailyFlow.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Por día del período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Nueva Entrada */}
      <div className="flex justify-center">
        <Button onClick={() => setShowEntryForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entrada
        </Button>
      </div>

      {/* Lista de Entradas */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas de Flujo de Efectivo</CardTitle>
          <CardDescription>
            Registro de todas las entradas y salidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron entradas en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {new Date(entry.entryDate).toLocaleDateString('es-HN')}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        {getEntryTypeBadge(entry.entryType)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {entry.category}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {entry.description}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        <span className={entry.entryType === 'INFLOW' ? 'text-green-600' : 'text-red-600'}>
                          L. {(entry.amount / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {entry.account}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {entry.reference || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Entrada */}
      {showEntryForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Entrada de Flujo de Efectivo</CardTitle>
            <CardDescription>
              Registre una nueva entrada o salida de efectivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Fecha *</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={entryForm.entryDate}
                  onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryType">Tipo *</Label>
                <Select value={entryForm.entryType} onValueChange={(value: 'INFLOW' | 'OUTFLOW') => setEntryForm({ ...entryForm, entryType: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFLOW">Entrada</SelectItem>
                    <SelectItem value="OUTFLOW">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Input
                  id="category"
                  value={entryForm.category}
                  onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                  placeholder="Ventas, Gastos, Inversión, etc."
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder="Descripción del movimiento"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="amount">Monto (L.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Cuenta Bancaria *</Label>
                <Input
                  id="account"
                  value={entryForm.account}
                  onChange={(e) => setEntryForm({ ...entryForm, account: e.target.value })}
                  placeholder="Cuenta principal"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={entryForm.reference}
                  onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })}
                  placeholder="Factura, recibo, etc."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEntryForm(false);
                  setEntryForm({
                    entryDate: new Date().toISOString().split('T')[0],
                    entryType: 'INFLOW',
                    category: '',
                    description: '',
                    amount: 0,
                    account: '',
                    reference: ''
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveCashFlowEntry}>
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

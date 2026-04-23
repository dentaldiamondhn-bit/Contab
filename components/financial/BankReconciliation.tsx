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
  CheckCircle,
  AlertTriangle,
  Search,
  Download,
  FileText,
  Calendar,
  Scale
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
interface BankReconciliationProps {
  tenantId: string;
}

interface Reconciliation {
  id: string;
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: 'PENDING' | 'MATCHED' | 'DIFFERENCE';
  notes: string;
  createdAt: string;
  bankAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

export default function BankReconciliation({ tenantId }: BankReconciliationProps) {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showReconciliationForm, setShowReconciliationForm] = useState<string | null>(null);
  const [editingReconciliation, setEditingReconciliation] = useState<Reconciliation | null>(null);
  const [reconciliationForm, setReconciliationForm] = useState({
    bankAccountId: "",
    statementDate: new Date().toISOString().split('T')[0],
    statementBalance: 0,
    bookBalance: 0,
    notes: ""
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadReconciliations();
  }, [tenantId]);

  const loadReconciliations = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar conciliaciones bancarias
      const { data, error } = await supabase
        .from('Reconciliation')
        .select(`
          *,
          BankAccount:bankAccount(id, accountName, accountNumber, bankName)
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setReconciliations(data || []);
    } catch (error: any) {
      console.error("Error loading reconciliations:", error);
      alert("Error al cargar las conciliaciones bancarias");
    } finally {
      setLoading(false);
    }
  };

  const saveReconciliation = async () => {
    try {
      if (!reconciliationForm.bankAccountId || !reconciliationForm.statementDate || !reconciliationForm.statementBalance || !reconciliationForm.bookBalance) {
        alert("Por favor complete todos los campos requeridos");
        return;
      }

      const difference = reconciliationForm.statementBalance - reconciliationForm.bookBalance;
      const status = difference === 0 ? 'MATCHED' : 'DIFFERENCE';

      const reconciliationData = {
        tenantId,
        bankAccountId: reconciliationForm.bankAccountId,
        statementDate: reconciliationForm.statementDate,
        statementBalance: Math.round(reconciliationForm.statementBalance * 100), // Convertir a centavos
        bookBalance: Math.round(reconciliationForm.bookBalance * 100),
        difference: Math.round(difference * 100),
        status,
        notes: reconciliationForm.notes
      };

      if (editingReconciliation) {
        // Actualizar conciliación existente
        const { error } = await (supabase as any)
          .from('Reconciliation')
          .update(reconciliationData)
          .eq('id', editingReconciliation.id);

        if (error) throw error;
        alert("Conciliación actualizada exitosamente");
      } else {
        // Crear nueva conciliación
        const { error } = await (supabase as any)
          .from('Reconciliation')
          .insert(reconciliationData);

        if (error) throw error;
        alert("Conciliación creada exitosamente");
      }

      // Resetear formulario
      setReconciliationForm({
        bankAccountId: "",
        statementDate: new Date().toISOString().split('T')[0],
        statementBalance: 0,
        bookBalance: 0,
        notes: ""
      });
      setEditingReconciliation(null);
      setShowReconciliationForm(null);
      loadReconciliations();
    } catch (error: any) {
      console.error("Error saving reconciliation:", error);
      alert("Error al guardar la conciliación");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Cuenta', 'Banco', 'Fecha de Estado', 'Saldo Estado', 'Saldo Libro', 'Diferencia', 'Estado', 'Notas'
    ];
    const rows = reconciliations.map(rec => [
      rec.bankAccount?.accountName || 'N/A',
      rec.bankAccount?.bankName || 'N/A',
      rec.statementDate,
      (rec.statementBalance / 100).toFixed(2),
      (rec.bookBalance / 100).toFixed(2),
      (rec.difference / 100).toFixed(2),
      rec.status,
      rec.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conciliaciones_bancarias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReconciliations = reconciliations.filter(rec =>
    rec.bankAccount?.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.bankAccount?.accountNumber?.includes(searchTerm) ||
    rec.bankAccount?.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(rec =>
    statusFilter === "all" || rec.status === statusFilter
  );

  const totalReconciliations = filteredReconciliations.length;
  const matchedReconciliations = filteredReconciliations.filter(rec => rec.status === 'MATCHED').length;
  const differenceReconciliations = filteredReconciliations.filter(rec => rec.status === 'DIFFERENCE').length;
  const pendingReconciliations = filteredReconciliations.filter(rec => rec.status === 'PENDING').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'MATCHED':
        return <Badge className="bg-green-100 text-green-800">Cuadrado</Badge>;
      case 'DIFFERENCE':
        return <Badge variant="destructive">Con Diferencia</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando conciliaciones bancarias...</p>
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
            <Scale className="h-6 w-6 mr-2 text-blue-600" />
            Conciliación Bancaria
          </h2>
          <p className="text-gray-600">Comparación de saldos bancarios con registros contables</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cuenta, banco..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="MATCHED">Cuadrado</option>
                <option value="DIFFERENCE">Con Diferencia</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredReconciliations.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conciliaciones</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalReconciliations}
            </div>
            <p className="text-xs text-gray-600">
              Procesadas en total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuadradas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {matchedReconciliations}
            </div>
            <p className="text-xs text-gray-600">
              Sin diferencias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Diferencias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {differenceReconciliations}
            </div>
            <p className="text-xs text-gray-600">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingReconciliations}
            </div>
            <p className="text-xs text-gray-600">
              Por procesar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Nueva Conciliación */}
      <div className="flex justify-center">
        <Button onClick={() => setShowReconciliationForm('new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Conciliación
        </Button>
      </div>

      {/* Lista de Conciliaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Conciliaciones Bancarias</CardTitle>
          <CardDescription>
            Historial de conciliaciones realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta Bancaria
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banco
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Libro
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron conciliaciones
                    </td>
                  </tr>
                ) : (
                  filteredReconciliations.map((rec) => {
                    const isDifference = Math.abs(rec.difference) > 0.01;
                    
                    return (
                      <tr key={rec.id} className={`hover:bg-gray-50 ${isDifference ? 'bg-red-50' : ''}`}>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{rec.bankAccount?.accountName || 'N/A'}</div>
                            <div className="text-gray-500 text-xs">
                              {rec.bankAccount?.accountNumber || 'N/A'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {rec.bankAccount?.bankName || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          {new Date(rec.statementDate).toLocaleDateString('es-HN')}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right">
                          L. {(rec.statementBalance / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right">
                          L. {(rec.bookBalance / 100).toFixed(2)}
                        </td>
                        <td className={`border border-gray-200 px-4 py-3 text-right font-medium ${
                          isDifference ? 'text-red-600' : 'text-green-600'
                        }`}>
                          L. {(rec.difference / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          {getStatusBadge(rec.status)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          <div className="flex space-x-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingReconciliation(rec);
                                setReconciliationForm({
                                  bankAccountId: rec.bankAccountId,
                                  statementDate: rec.statementDate,
                                  statementBalance: rec.statementBalance / 100,
                                  bookBalance: rec.bookBalance / 100,
                                  notes: rec.notes || ''
                                });
                                setShowReconciliationForm(rec.id);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowReconciliationForm(rec.id)}
                            >
                              Detalles
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Conciliación */}
      {showReconciliationForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingReconciliation ? 'Editar Conciliación' : 'Nueva Conciliación'}</CardTitle>
            <CardDescription>
              {editingReconciliation ? 'Modifique los datos de la conciliación' : 'Ingrese los datos para la nueva conciliación'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountId">Cuenta Bancaria *</Label>
                <Select value={reconciliationForm.bankAccountId} onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, bankAccountId: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccione una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {reconciliations.map((rec) => (
                      <SelectItem key={rec.bankAccountId} value={rec.bankAccountId}>
                        {rec.bankAccount?.accountName} - {rec.bankAccount?.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
              <div className="space-y-2">
                <Label htmlFor="statementDate">Fecha de Estado *</Label>
                <Input
                  id="statementDate"
                  type="date"
                  value={reconciliationForm.statementDate}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, statementDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statementBalance">Saldo de Estado (L.) *</Label>
                <Input
                  id="statementBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={reconciliationForm.statementBalance}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, statementBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookBalance">Saldo Libro (L.) *</Label>
                <Input
                  id="bookBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={reconciliationForm.bookBalance}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, bookBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={reconciliationForm.notes}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                  placeholder="Notas adicionales de la conciliación"
                />
              </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReconciliationForm(null);
                  setEditingReconciliation(null);
                  setReconciliationForm({
                    bankAccountId: "",
                    statementDate: new Date().toISOString().split('T')[0],
                    statementBalance: 0,
                    bookBalance: 0,
                    notes: ""
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveReconciliation}>
                {editingReconciliation ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

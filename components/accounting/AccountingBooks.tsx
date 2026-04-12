"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Calendar, Filter, FileText, BookOpen, Scale, ArrowLeft, RefreshCw } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/accounting-utils";
import LibroIngresos from "@/components/components/LibroIngresos";
import LibroEgresos from "@/components/components/LibroEgresos";
import LibroPartidas from "@/components/components/LibroPartidas";

interface TransactionData {
  id: string;
  date: string;
  description: string;
  reference?: string;
  voucher_type: string;
  voucher_number: number;
  total_amount: number;
  currency: string;
  entries: TransactionEntry[];
}

interface TransactionEntry {
  id: string;
  account: {
    code: string;
    name: string;
  };
  amount: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  voucher_type: string;
  voucher_number: number;
  description: string;
  reference?: string;
  total_amount: number;
  currency: string;
  entries: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function AccountingBooks() {
  // Local formatCurrency function for currency amounts (not cents)
  const formatCurrency = (amount: number, currency: string = 'HNL') => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };
  const { currentTenant } = useTenant();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVoucherType, setSelectedVoucherType] = useState("todos");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");
  const [isClient, setIsClient] = useState(false);
  
  // Estados para datos reales
  const [ingresos, setIngresos] = useState<TransactionData[]>([]);
  const [egresos, setEgresos] = useState<TransactionData[]>([]);
  const [diarioEntries, setDiarioEntries] = useState<JournalEntry[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [mayorEntries, setMayorEntries] = useState<TrialBalance[]>([]);
  const [balanceComprobacion, setBalanceComprobacion] = useState<TrialBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cargar datos reales de ingresos y egresos cuando cambian los filtros
  const loadRealData = async () => {
    try {
      setLoading(true);
      // Use '1' as the actual tenant ID since data in DB uses '1', not 'tenant_001'
      const tenantId = '1';
      console.log("📚 Using tenantId:", tenantId, "(currentTenant.id was:", currentTenant?.id, ")");
      
      // Parsear las fechas para obtener startDate y endDate
      let startDate, endDate;
      
      const year = parseInt(selectedYear);
      
      if (selectedMonth === "all") {
        // Todo el año
        startDate = new Date(year, 0, 1); // 1 de enero
        endDate = new Date(year, 11, 31); // 31 de diciembre
      } else if (selectedDay === "all") {
        // Mes específico (todo el mes)
        const month = parseInt(selectedMonth) - 1;
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0); // Último día del mes
      } else {
        // Día específico
        const month = parseInt(selectedMonth) - 1;
        const day = parseInt(selectedDay);
        startDate = new Date(year, month, day);
        endDate = new Date(year, month, day);
      }
      
      // Cargar ingresos con filtros de fecha
      const ingresosUrl = `/api/accounting/ingresos?tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const ingresosResponse = await fetch(ingresosUrl);
      if (ingresosResponse.ok) {
        const ingresosData = await ingresosResponse.json();
        setIngresos(ingresosData || []);
      }
      
      // Cargar egresos con filtros de fecha
      const egresosUrl = `/api/accounting/egresos?tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const egresosResponse = await fetch(egresosUrl);
      if (egresosResponse.ok) {
        const egresosData = await egresosResponse.json();
        setEgresos(egresosData || []);
      }
      
      // Cargar todas las transacciones (partidas de diario)
      const allUrl = `/api/accounting/integrated-books?tenantId=${tenantId}&bookType=diario&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const allResponse = await fetch(allUrl);
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAllTransactions(allData || []);
      }
      
      // Cargar libro diario
      const diarioUrl = `/api/accounting/integrated-books?tenantId=${tenantId}&bookType=diario&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${selectedVoucherType !== 'todos' ? `&filterType=${selectedVoucherType}` : ''}`;
      console.log("📚 Fetching libro diario:", diarioUrl);
      const diarioResponse = await fetch(diarioUrl);
      if (diarioResponse.ok) {
        const diarioData = await diarioResponse.json();
        console.log("📚 Libro diario data received:", diarioData?.length || 0, "entries", diarioData);
        setDiarioEntries(diarioData || []);
      } else {
        console.error("📚 Error fetching libro diario:", diarioResponse.status);
      }
      
      // Cargar libro mayor
      const mayorUrl = `/api/accounting/integrated-books?tenantId=${tenantId}&bookType=mayor&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const mayorResponse = await fetch(mayorUrl);
      if (mayorResponse.ok) {
        const mayorData = await mayorResponse.json();
        setMayorEntries(mayorData || []);
      }
      
      // Cargar balance de comprobación
      const balanceUrl = `/api/accounting/integrated-books?tenantId=${tenantId}&bookType=balance&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const balanceResponse = await fetch(balanceUrl);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalanceComprobacion(balanceData || []);
      }
    } catch (error) {
      console.error("Error cargando datos reales:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar datos cuando cambian los filtros
  useEffect(() => {
    if (isClient) {
      loadRealData();
    }
  }, [selectedYear, selectedMonth, selectedDay, isClient]);

  // Expose refresh function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshAccountingBooks = loadRealData;
      console.log("📚 AccountingBooks: Refresh function exposed as window.refreshAccountingBooks()");
    }
  }, [loadRealData]);

  // Helper function to get days for selected month
  const getDaysForMonth = () => {
    if (selectedMonth === "all") return [];
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Reset day when month changes to invalid day
  React.useEffect(() => {
    if (selectedMonth !== "all" && selectedDay !== "all") {
      const maxDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
      if (parseInt(selectedDay) > maxDay) {
        setSelectedDay("all");
      }
    }
  }, [selectedYear, selectedMonth]);

  // Filtrar datos por búsqueda y tipo de póliza
  const filteredIngresos = React.useMemo(() => {
    return ingresos.filter(ingreso => {
      const matchesSearch = !searchTerm || 
        (ingreso.description && ingreso.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ingreso.reference && ingreso.reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedVoucherType === "todos" || selectedVoucherType === "INGRESO";
      return matchesSearch && matchesType;
    });
  }, [ingresos, searchTerm, selectedVoucherType]);

  const filteredEgresos = React.useMemo(() => {
    return egresos.filter(egreso => {
      const matchesSearch = !searchTerm || 
        (egreso.description && egreso.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (egreso.reference && egreso.reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedVoucherType === "todos" || selectedVoucherType === "EGRESO";
      return matchesSearch && matchesType;
    });
  }, [egresos, searchTerm, selectedVoucherType]);

  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        transaction.entries.some((e: any) => 
          (e.account?.name && e.account.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (e.account?.code && e.account.code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      const matchesType = selectedVoucherType === "todos" || selectedVoucherType === transaction.voucher_type;
      return matchesSearch && matchesType;
    });
  }, [allTransactions, searchTerm, selectedVoucherType]);

  const filteredDiarioEntries = React.useMemo(() => {
    return diarioEntries.filter(entry => {
      const matchesSearch = !searchTerm || 
        (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedVoucherType === "todos" || entry.voucher_type === selectedVoucherType;
      return matchesSearch && matchesType;
    });
  }, [diarioEntries, searchTerm, selectedVoucherType]);

  // Generar Balance de Comprobación (usando datos reales)
  const generateTrialBalance = (): TrialBalance[] => {
    // Si tenemos datos reales del API, usarlos
    if (balanceComprobacion.length > 0) {
      return balanceComprobacion;
    }
    
    // Si no, generar desde los datos del libro diario
    const accountMap = new Map<string, TrialBalance>();

    filteredDiarioEntries.forEach(entry => {
      entry.entries.forEach(line => {
        const existing = accountMap.get(line.account_code);
        if (existing) {
          existing.debit += line.debit;
          existing.credit += line.credit;
          existing.balance = existing.debit - existing.credit;
        } else {
          accountMap.set(line.account_code, {
            account_code: line.account_code,
            account_name: line.account_name,
            account_type: line.account_type,
            debit: line.debit,
            credit: line.credit,
            balance: line.debit - line.credit
          });
        }
      });
    });

    return Array.from(accountMap.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
  };

  const trialBalance = generateTrialBalance();
  const totalDebit = trialBalance.reduce((sum, account) => sum + account.debit, 0);
  const totalCredit = trialBalance.reduce((sum, account) => sum + account.credit, 0);


  const getVoucherTypeColor = (type: string) => {
    const colors = {
      INGRESO: "bg-green-100 text-green-800",
      EGRESO: "bg-red-100 text-red-800",
      DIARIO: "bg-blue-100 text-blue-800",
      AJUSTE: "bg-yellow-100 text-yellow-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Función para exportar a PDF
  const exportToPDF = (reportType: string) => {
    alert(`PDF: ${reportType}`);
  };

  // Función para ver detalles
  const viewDetails = (reportType: string) => {
    alert(`Ver: ${reportType}`);
  };

  // Función para editar transacción (placeholder)
  const handleEditTransaction = (transaction: any) => {
    console.log("Editar transacción:", transaction);
    alert(`Editar transacción: ${transaction.voucher_type}-${transaction.voucher_number}\n\n(Implementar modal de edición)`);
  };

  // Función para eliminar ingreso
  const handleDeleteIngreso = (ingresoId: string) => {
    if (confirm("¿Está seguro de eliminar este ingreso? Esta acción no se puede deshacer.")) {
      console.log("Eliminando ingreso:", ingresoId);
      setIngresos(prev => prev.filter(ing => ing.id !== ingresoId));
      alert("Ingreso eliminado (vista local). Recargue la página para sincronizar con la base de datos.");
    }
  };

  // Función para eliminar egreso
  const handleDeleteEgreso = (egresoId: string) => {
    if (confirm("¿Está seguro de eliminar este egreso? Esta acción no se puede deshacer.")) {
      console.log("Eliminando egreso:", egresoId);
      setEgresos(prev => prev.filter(egr => egr.id !== egresoId));
      alert("Egreso eliminado (vista local). Recargue la página para sincronizar con la base de datos.");
    }
  };

  return (
    <div className="container mx-auto py-6">
      {!isClient ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando libros contables...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Libros Contables</h2>
            <Button
              variant="outline"
              onClick={() => router.push(`/companies/${companyId}/modules`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Menú</span>
            </Button>
          </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </div>
            <div className="text-sm text-gray-500">
              {loading ? "Cargando..." : `${filteredIngresos.length + filteredEgresos.length} resultados (${ingresos.length} ingresos, ${egresos.length} egresos)`}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Año */}
            <div>
              <Label htmlFor="year">Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mes */}
            <div>
              <Label htmlFor="month">Mes</Label>
              <Select value={selectedMonth} onValueChange={(value) => {
                setSelectedMonth(value);
                if (value === "all") setSelectedDay("all");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el año</SelectItem>
                  <SelectItem value="01">Enero</SelectItem>
                  <SelectItem value="02">Febrero</SelectItem>
                  <SelectItem value="03">Marzo</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Mayo</SelectItem>
                  <SelectItem value="06">Junio</SelectItem>
                  <SelectItem value="07">Julio</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Septiembre</SelectItem>
                  <SelectItem value="10">Octubre</SelectItem>
                  <SelectItem value="11">Noviembre</SelectItem>
                  <SelectItem value="12">Diciembre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Día */}
            <div>
              <Label htmlFor="day">Día</Label>
              <Select 
                value={selectedDay} 
                onValueChange={setSelectedDay}
                disabled={selectedMonth === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedMonth === "all" ? "Seleccione mes" : "Todo el mes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el mes</SelectItem>
                  {getDaysForMonth().map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Buscar */}
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Tipo de Póliza */}
            <div>
              <Label htmlFor="voucherType">Tipo</Label>
              <Select value={selectedVoucherType} onValueChange={setSelectedVoucherType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                  <SelectItem value="DIARIO">Diario</SelectItem>
                  <SelectItem value="AJUSTE">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div>
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadRealData()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="diario" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="ingresos" className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span>Libro de Ingresos</span>
          </TabsTrigger>
          <TabsTrigger value="egresos" className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-red-600" />
            <span>Libro de Egresos</span>
          </TabsTrigger>
          <TabsTrigger value="partidas" className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Partidas de Diario</span>
          </TabsTrigger>
          <TabsTrigger value="diario" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Libro Diario</span>
          </TabsTrigger>
          <TabsTrigger value="mayor" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Libro Mayor</span>
          </TabsTrigger>
          <TabsTrigger value="comprobacion" className="flex items-center space-x-2">
            <Scale className="h-4 w-4" />
            <span>Balance de Comprobación</span>
          </TabsTrigger>
          <TabsTrigger value="inventarios" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Inventarios y Balances</span>
          </TabsTrigger>
        </TabsList>

        {/* Libro Diario */}
        <TabsContent value="diario" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">Cargando libro diario...</div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Libro Diario</CardTitle>
                  <CardDescription>
                    Registro cronológico de todas las operaciones (Pólizas)
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => viewDetails("Libro Diario")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" onClick={() => exportToPDF("Libro Diario")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="w-24 font-semibold text-gray-700 text-center">Fecha</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-700 text-center">Póliza</TableHead>
                      <TableHead className="w-[450px] font-semibold text-gray-700">Descripción</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-700 text-center">Referencia</TableHead>
                      <TableHead className="w-40 font-semibold text-gray-700 text-right">Débito</TableHead>
                      <TableHead className="w-40 font-semibold text-gray-700 text-right">Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDiarioEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No se encontraron registros para los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDiarioEntries.map((entry) => (
                        <React.Fragment key={entry.id}>
                          <TableRow className="font-medium bg-gray-100 border-b">
                          <TableCell className="w-24 py-3 px-3 text-center">
                            <div className="text-sm font-semibold text-gray-900">
                              {entry.date}
                            </div>
                          </TableCell>
                          <TableCell className="w-32 py-3 px-3 text-center">
                            <Badge 
                              className="bg-blue-100 text-blue-800 px-3 py-1 text-sm font-medium"
                              variant="secondary"
                            >
                              {entry.voucher_type}-{entry.voucher_number}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-[450px] py-3 px-4">
                            <div className="font-semibold text-gray-900 leading-tight">
                              {entry.description}
                            </div>
                          </TableCell>
                          <TableCell className="w-32 py-3 px-3 text-center">
                            <div className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                              {entry.reference || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="w-40 py-3 px-4 text-right">
                            <div className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded">
                              {formatCurrency(entry.total_amount)}
                            </div>
                          </TableCell>
                          <TableCell className="w-40 py-3 px-4 text-right">
                            <div className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded">
                              {formatCurrency(entry.total_amount)}
                            </div>
                          </TableCell>
                        </TableRow>
                        {entry.entries.map((line) => (
                          <TableRow 
                            key={line.id} 
                            className={`text-sm border-b transition-colors duration-150 ${
                              entry.entries.indexOf(line) % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <TableCell className="w-24 py-3 px-3"></TableCell>
                            <TableCell className="w-32 py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                                  {line.account_code}
                                </span>
                                <Badge 
                                  className={`${getAccountTypeColor(line.account_type)} px-2 py-1 text-xs`}
                                  variant="secondary"
                                >
                                  {getAccountTypeLabel(line.account_type)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="w-[450px] py-3 px-4">
                              <div className="text-gray-900 font-medium">
                                {line.account_name}
                              </div>
                            </TableCell>
                            <TableCell className="w-32 py-3 px-3"></TableCell>
                            <TableCell className="w-40 py-3 px-4 text-right">
                              {line.debit > 0 ? (
                                <div className="text-red-600 font-semibold bg-red-50 px-3 py-1 rounded">
                                  {formatCurrency(line.debit)}
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                            </TableCell>
                            <TableCell className="w-40 py-3 px-4 text-right">
                              {line.credit > 0 ? (
                                <div className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded">
                                  {formatCurrency(line.credit)}
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Libro de Ingresos */}
        <TabsContent value="ingresos" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">Cargando libro de ingresos...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <strong>Debug - Ingresos:</strong> {filteredIngresos.length} de {ingresos.length}
                    {searchTerm && <span> | Buscando: "{searchTerm}"</span>}
                    {selectedVoucherType !== "todos" && <span> | Tipo: {selectedVoucherType}</span>}
                  </div>
                  {filteredIngresos.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Primer resultado: {filteredIngresos[0]?.description} ({filteredIngresos[0]?.voucher_type})
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <LibroIngresos 
                ingresos={filteredIngresos} 
                key={`ingresos-${searchTerm}-${selectedVoucherType}-${selectedYear}-${selectedMonth}-${selectedDay}`}
                onEdit={(ingreso) => handleEditTransaction(ingreso)}
                onDelete={(ingresoId) => handleDeleteIngreso(ingresoId)}
              />
              </div>
            </>
          )}
        </TabsContent>

        {/* Libro de Egresos */}
        <TabsContent value="egresos" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">Cargando libro de egresos...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Debug info */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <strong>Debug - Egresos:</strong> {filteredEgresos.length} de {egresos.length}
                    {searchTerm && <span> | Buscando: "{searchTerm}"</span>}
                    {selectedVoucherType !== "todos" && <span> | Tipo: {selectedVoucherType}</span>}
                  </div>
                  {filteredEgresos.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Primer resultado: {filteredEgresos[0]?.description} ({filteredEgresos[0]?.voucher_type})
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <LibroEgresos 
                egresos={filteredEgresos} 
                key={`egresos-${searchTerm}-${selectedVoucherType}-${selectedYear}-${selectedMonth}-${selectedDay}`}
                onEdit={(egreso) => handleEditTransaction(egreso)}
                onDelete={(egresoId) => handleDeleteEgreso(egresoId)}
              />
            </>
          )}
        </TabsContent>

        {/* Partidas de Diario */}
        <TabsContent value="partidas" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">Cargando partidas de diario...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Debug info */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <strong>Debug - Partidas:</strong> {allTransactions.length} transacciones
                    {searchTerm && <span> | Buscando: "{searchTerm}"</span>}
                    {selectedVoucherType !== "todos" && <span> | Tipo: {selectedVoucherType}</span>}
                  </div>
                  {allTransactions.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Total de partidas individuales: {allTransactions.reduce((sum, t) => sum + (t.entries?.length || 0), 0)}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <LibroPartidas 
                partidas={filteredTransactions} 
                key={`partidas-${searchTerm}-${selectedVoucherType}-${selectedYear}-${selectedMonth}-${selectedDay}`}
                onEditPartida={(partida) => handleEditTransaction(partida)}
                onDeletePartida={(partidaId) => {
                  if (confirm("¿Está seguro de eliminar esta partida? Esta acción no se puede deshacer.")) {
                    console.log("Eliminando partida:", partidaId);
                    setAllTransactions(prev => prev.filter(t => t.id !== partidaId));
                    alert("Partida eliminada (vista local). Recargue la página para sincronizar con la base de datos.");
                  }
                }}
              />
            </>
          )}
        </TabsContent>

        {/* Libro Mayor */}
        <TabsContent value="mayor" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">Cargando libro mayor...</div>
              </CardContent>
            </Card>
          ) : (
            <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Libro Mayor</CardTitle>
                  <CardDescription>
                    Resumen de movimientos por cada cuenta individual
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => viewDetails("Libro Mayor")}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" onClick={() => exportToPDF("Libro Mayor")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mayorEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron movimientos para los filtros seleccionados
                  </div>
                ) : (
                  mayorEntries.map((account, idx) => (
                    <div key={account.account_code || `account-${idx}`} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold">{account.account_code}</span>
                        <span className="font-semibold">{account.account_name}</span>
                        <Badge className={getAccountTypeColor(account.account_type)} variant="secondary">
                          {getAccountTypeLabel(account.account_type)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">Saldo: {formatCurrency(account.balance)}</span>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                          <TableHead className="w-20 font-semibold text-gray-700 text-center">Fecha</TableHead>
                          <TableHead className="w-[400px] font-semibold text-gray-700">Descripción</TableHead>
                          <TableHead className="w-28 font-semibold text-gray-700 text-center">Referencia</TableHead>
                          <TableHead className="w-24 font-semibold text-gray-700 text-center">Tipo</TableHead>
                          <TableHead className="w-36 font-semibold text-gray-700 text-right">Débito</TableHead>
                          <TableHead className="w-36 font-semibold text-gray-700 text-right">Crédito</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDiarioEntries
                          .filter(entry => entry.entries.some(line => line.account_code === account.account_code))
                          .map((entry, index) => {
                            const line = entry.entries.find(l => l.account_code === account.account_code);
                            return line ? (
                              <TableRow 
                                key={`${entry.id}-${line.id}`} 
                                className={`border-b transition-colors duration-150 ${
                                  index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                                }`}
                              >
                                <TableCell className="w-20 py-3 px-2 text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {entry.date}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[400px] py-3 px-4">
                                  <div>
                                    <div className="font-medium text-gray-900 leading-tight">
                                      {entry.description}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {entry.voucher_type} #{entry.voucher_number}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="w-28 py-3 px-2 text-center">
                                  <div className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                                    {entry.reference || "-"}
                                  </div>
                                </TableCell>
                                <TableCell className="w-24 py-3 px-2 text-center">
                                  <Badge 
                                    className={`${getVoucherTypeColor(entry.voucher_type)} px-3 py-1 text-xs font-medium`}
                                    variant="secondary"
                                  >
                                    {entry.voucher_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="w-36 py-3 px-4 text-right">
                                  {line.debit > 0 ? (
                                    <div className="text-red-600 font-semibold text-sm bg-red-50 px-3 py-1 rounded">
                                      {formatCurrency(line.debit)}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">-</div>
                                  )}
                                </TableCell>
                                <TableCell className="w-36 py-3 px-4 text-right">
                                  {line.credit > 0 ? (
                                    <div className="text-green-600 font-semibold text-sm bg-green-50 px-3 py-1 rounded">
                                      {formatCurrency(line.credit)}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">-</div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ) : null;
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )))}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Balance de Comprobación */}
        <TabsContent value="comprobacion" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Balance de Comprobación</CardTitle>
                  <CardDescription>
                    Resumen de saldos de todas las cuentas al {selectedMonth === "all" ? selectedYear : `${selectedMonth}/${selectedYear}`}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => viewDetails("Balance de Comprobación")}>
                    <Scale className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" onClick={() => exportToPDF("Balance de Comprobación")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="w-24 font-semibold text-gray-700 text-center">Código</TableHead>
                      <TableHead className="w-[400px] font-semibold text-gray-700">Nombre de Cuenta</TableHead>
                      <TableHead className="w-28 font-semibold text-gray-700 text-center">Tipo</TableHead>
                      <TableHead className="w-36 font-semibold text-gray-700 text-right">Sumas Débito</TableHead>
                      <TableHead className="w-36 font-semibold text-gray-700 text-right">Sumas Crédito</TableHead>
                      <TableHead className="w-36 font-semibold text-gray-700 text-right">Saldo Deudor</TableHead>
                      <TableHead className="w-36 font-semibold text-gray-700 text-right">Saldo Acreedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.map((account, index) => (
                      <TableRow 
                        key={account.account_code || `account-${index}`}
                        className={`border-b transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                        }`}
                      >
                        <TableCell className="w-24 py-3 px-3 text-center">
                          <div className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {account.account_code}
                          </div>
                        </TableCell>
                        <TableCell className="w-[400px] py-3 px-4">
                          <div className="font-medium text-gray-900 leading-tight">
                            {account.account_name}
                          </div>
                        </TableCell>
                        <TableCell className="w-28 py-3 px-3 text-center">
                          <Badge 
                            className={`${getAccountTypeColor(account.account_type)} px-3 py-1 text-xs font-medium`}
                            variant="secondary"
                          >
                            {getAccountTypeLabel(account.account_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-36 py-3 px-4 text-right">
                          {account.debit > 0 ? (
                            <div className="text-red-600 font-semibold bg-red-50 px-3 py-1 rounded">
                              {formatCurrency(account.debit)}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </TableCell>
                        <TableCell className="w-36 py-3 px-4 text-right">
                          {account.credit > 0 ? (
                            <div className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded">
                              {formatCurrency(account.credit)}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </TableCell>
                        <TableCell className="w-36 py-3 px-4 text-right">
                          {account.balance > 0 ? (
                            <div className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded">
                              {formatCurrency(account.balance)}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </TableCell>
                        <TableCell className="w-36 py-3 px-4 text-right">
                          {account.balance < 0 ? (
                            <div className="text-purple-600 font-semibold bg-purple-50 px-3 py-1 rounded">
                              {formatCurrency(Math.abs(account.balance))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-gray-100 border-b-2 border-gray-300">
                      <TableCell className="w-24 py-4 px-3 text-center">
                        <div className="text-lg font-bold text-gray-900">TOTALES</div>
                      </TableCell>
                      <TableCell className="w-[400px] py-4 px-4">
                        <div className="text-lg font-bold text-gray-900">Resumen General</div>
                      </TableCell>
                      <TableCell className="w-28 py-4 px-3"></TableCell>
                      <TableCell className="w-36 py-4 px-4 text-right">
                        <div className="text-lg font-bold text-red-600 bg-red-100 px-3 py-2 rounded">
                          {formatCurrency(totalDebit)}
                        </div>
                      </TableCell>
                      <TableCell className="w-36 py-4 px-4 text-right">
                        <div className="text-lg font-bold text-green-600 bg-green-100 px-3 py-2 rounded">
                          {formatCurrency(totalCredit)}
                        </div>
                      </TableCell>
                      <TableCell className="w-36 py-4 px-4 text-right">
                        <div className="text-lg font-bold text-blue-600 bg-blue-100 px-3 py-2 rounded">
                          {formatCurrency(trialBalance.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0))}
                        </div>
                      </TableCell>
                      <TableCell className="w-36 py-4 px-4 text-right">
                        <div className="text-lg font-bold text-purple-600 bg-purple-100 px-3 py-2 rounded">
                          {formatCurrency(trialBalance.reduce((sum, acc) => sum + Math.max(0, -acc.balance), 0))}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Verificación de Balance</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Sumas Débito = Sumas Crédito:</span>
                    <span className="ml-2 font-bold">
                      {totalDebit === totalCredit ? "✓ Correcto" : "✗ Error"}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Suma Saldos Deudores = Suma Saldos Acreedores:</span>
                    <span className="ml-2 font-bold">
                      {totalDebit === totalCredit ? "✓ Correcto" : "✗ Error"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventarios y Balances */}
        <TabsContent value="inventarios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Inventarios y Balances</CardTitle>
                  <CardDescription>
                    Balance General y Estado de Resultados
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => viewDetails("Inventarios y Balances")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" onClick={() => exportToPDF("Inventarios y Balances")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Balance General */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Balance General</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Sección ACTIVO */}
                    <div>
                      <h4 className="font-medium mb-3">ACTIVO</h4>
                      <div className="space-y-2">
                        {trialBalance
                          .filter(acc => acc.account_type === "ASSET")
                          .map(acc => (
                            <div key={acc.account_code} className="flex justify-between">
                              <span>{acc.account_name}</span>
                              <span className="font-medium">{formatCurrency(acc.balance)}</span>
                            </div>
                          ))}
                        <div className="border-t pt-2 font-medium">
                          <div className="flex justify-between">
                            <span>TOTAL ACTIVO</span>
                            <span>
                              {formatCurrency(
                                trialBalance
                                  .filter(acc => acc.account_type === "ASSET")
                                  .reduce((sum, acc) => sum + acc.balance, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sección PASIVO Y PATRIMONIO */}
                    <div>
                      <h4 className="font-medium mb-3">PASIVO Y PATRIMONIO</h4>
                      <div className="space-y-2">
                        <div>
                          <h5 className="font-medium text-sm text-gray-600 mb-2">PASIVO</h5>
                          {trialBalance
                            .filter(acc => acc.account_type === "LIABILITY")
                            .map(acc => (
                              <div key={acc.account_code} className="flex justify-between ml-4">
                                <span>{acc.account_name}</span>
                                <span className="font-medium">{formatCurrency(Math.abs(acc.balance))}</span>
                              </div>
                            ))}
                          <div className="border-t pt-2 font-medium">
                            <div className="flex justify-between">
                              <span>TOTAL PASIVO</span>
                              <span>
                                {formatCurrency(
                                  trialBalance
                                    .filter(acc => acc.account_type === "LIABILITY")
                                    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h5 className="font-medium text-sm text-gray-600 mb-2">PATRIMONIO</h5>
                          {trialBalance
                            .filter(acc => ["EQUITY", "REVENUE", "EXPENSE"].includes(acc.account_type))
                            .map(acc => (
                              <div key={acc.account_code} className="flex justify-between ml-4">
                                <span>{acc.account_name}</span>
                                <span className="font-medium">
                                  {formatCurrency(acc.account_type === "EXPENSE" ? -acc.balance : Math.abs(acc.balance))}
                                </span>
                              </div>
                            ))}
                          <div className="border-t pt-2 font-medium">
                            <div className="flex justify-between">
                              <span>TOTAL PATRIMONIO</span>
                              <span>
                                {formatCurrency(
                                  trialBalance
                                    .filter(acc => ["EQUITY", "REVENUE", "EXPENSE"].includes(acc.account_type))
                                    .reduce((sum, acc) => sum + (acc.account_type === "EXPENSE" ? -acc.balance : Math.abs(acc.balance)), 0)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-2 font-bold mt-4">
                          <div className="flex justify-between">
                            <span>TOTAL PASIVO Y PATRIMONIO</span>
                            <span>
                              {formatCurrency(
                                trialBalance
                                  .filter(acc => ["LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(acc.account_type))
                                  .reduce((sum, acc) => sum + (acc.account_type === "EXPENSE" ? -acc.balance : Math.abs(acc.balance)), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}

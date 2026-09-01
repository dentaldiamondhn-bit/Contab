'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Calendar, Filter, FileText, BookOpen, Scale, ArrowLeft, RefreshCw, Calculator, Edit, Save } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/accounting-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Componentes locales
import LibroIngresos from "@/components/components/LibroIngresos";
import LibroEgresos from "@/components/components/LibroEgresos";
import LibroPartidas from "@/components/components/LibroPartidas";
import SARForm221 from "./SARForm221";

// Tipado de datos
interface TransactionData {
  id: string;
  date: string;
  description: string;
  reference?: string;
  voucher_type: string;
  voucher_number: number;
  total_amount: number;
  currency: string;
  entries: any[];
}

interface JournalEntry {
  id: string;
  date: string;
  voucher_type: string;
  voucher_number: number;
  description: string;
  reference?: string;
  total_amount: number;
  entries: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
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
  const { currentTenant } = useTenant();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVoucherType, setSelectedVoucherType] = useState("todos");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");
  
  // Estados de datos
  const [ingresos, setIngresos] = useState<TransactionData[]>([]);
  const [egresos, setEgresos] = useState<TransactionData[]>([]);
  const [diarioEntries, setDiarioEntries] = useState<JournalEntry[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [mayorEntries, setMayorEntries] = useState<TrialBalance[]>([]);
  const [balanceComprobacion, setBalanceComprobacion] = useState<TrialBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "diario";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState({ description: "", date: "", totalAmount: 0 });

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["diario","mayor","comprobacion","ingresos","egresos","partidas","inventarios","sar221"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const openEdit = (entry:any) => {
    setEditingEntry(entry);
    // Diario viene de get_libro_diario_integrado con total_amount = suma debe+haber (doble), en HNL ya
    // Transaction viene en centavos (287500 = 2875 HNL)
    let raw = entry.total_amount ?? entry.totalAmount ?? entry.total_amount ?? 0;
    // Si es del diario y tiene entries, total_amount es doble (debe+haber)
    const isDiario = Array.isArray(entry.entries) && entry.entries.length > 0;
    let display: number;
    if (isDiario) {
      // raw ya está en HNL y es doble (ej 5750 para 2875 real)
      display = raw / 2;
    } else {
      // Transaction en centavos
      display = raw > 1000 ? raw/100 : raw;
    }
    console.log("[openEdit] raw", raw, "isDiario", isDiario, "display", display, "entry", entry);
    setEditForm({
      description: entry.description || entry.descripcion || "",
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : "",
      totalAmount: display,
    });
  };

  const saveEdit = async () => {
    if (!editingEntry || !currentTenant?.id) return;
    try {
      const res = await fetch(`/api/accounting/transactions?tenantId=${currentTenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEntry.id,
          description: editForm.description,
          date: editForm.date,
          totalAmount: Math.round(Number(editForm.totalAmount)*100) || editingEntry.total_amount || editingEntry.totalAmount,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
      setEditingEntry(null);
      loadRealData();
    } catch (e:any) { alert(e.message); }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const loadRealData = useCallback(async () => {
    if (!currentTenant?.id) return;
    
    try {
      setLoading(true);
      const tenantId = currentTenant.id;
      
      // Construcción de rango de fechas
      const year = parseInt(selectedYear);
      let startDate, endDate;

      if (selectedMonth === "all") {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      } else {
        const month = parseInt(selectedMonth) - 1;
        if (selectedDay === "all") {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0, 23, 59, 59);
        } else {
          const day = parseInt(selectedDay);
          startDate = new Date(year, month, day);
          endDate = new Date(year, month, day, 23, 59, 59);
        }
      }

      const queryParams = `tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      // Fetch paralelo para optimizar velocidad
      const [resIngresos, resEgresos, resDiario, resMayor, resBalance] = await Promise.all([
        fetch(`/api/accounting/ingresos?${queryParams}`),
        fetch(`/api/accounting/egresos?${queryParams}`),
        fetch(`/api/accounting/integrated-books?bookType=diario&${queryParams}${selectedVoucherType !== 'todos' ? `&filterType=${selectedVoucherType}` : ''}`),
        fetch(`/api/accounting/integrated-books?bookType=mayor&${queryParams}`),
        fetch(`/api/accounting/integrated-books?bookType=balance&${queryParams}`)
      ]);

      if (resIngresos.ok) setIngresos(await resIngresos.json() || []);
      if (resEgresos.ok) setEgresos(await resEgresos.json() || []);
      if (resDiario.ok) setDiarioEntries(await resDiario.json() || []);
      if (resMayor.ok) setMayorEntries(await resMayor.json() || []);
      if (resBalance.ok) setBalanceComprobacion(await resBalance.json() || []);
      
      // Para la pestaña de partidas (todas combinadas)
      const resAll = await fetch(`/api/accounting/integrated-books?bookType=diario&${queryParams}`);
      if (resAll.ok) setAllTransactions(await resAll.json() || []);

    } catch (error) {
      console.error("Error en carga de libros:", error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, selectedYear, selectedMonth, selectedDay, selectedVoucherType]);

  useEffect(() => {
    if (isClient) loadRealData();
  }, [loadRealData, isClient]);

  // Memorización de datos filtrados para evitar re-renders costosos
  const filteredDiarioEntries = useMemo(() => {
    return diarioEntries.filter(entry => 
      !searchTerm || entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [diarioEntries, searchTerm]);

  const trialBalanceData = useMemo(() => {
    if (balanceComprobacion.length > 0) return balanceComprobacion;
    
    // Fallback local: Generar balance desde el diario si el API falla o está vacío
    const accountMap = new Map<string, TrialBalance>();
    diarioEntries.forEach(entry => {
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
  }, [balanceComprobacion, diarioEntries]);

  // Totales del Balance
  const totalSums = useMemo(() => {
    return trialBalanceData.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit,
      debtor: acc.debtor + (curr.balance > 0 ? curr.balance : 0),
      creditor: acc.creditor + (curr.balance < 0 ? Math.abs(curr.balance) : 0)
    }), { debit: 0, credit: 0, debtor: 0, creditor: 0 });
  }, [trialBalanceData]);

  if (!isClient) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Libros Contables</h2>
          <p className="text-muted-foreground">Periodo Fiscal {selectedYear}</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/accounting`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
        </Button>
      </div>

      {/* Panel de Filtros Globales */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anual</SelectItem>
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                    <SelectItem key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('es', {month: 'long'})}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Póliza</Label>
              <Select value={selectedVoucherType} onValueChange={setSelectedVoucherType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                  <SelectItem value="DIARIO">Diario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Búsqueda rápida</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por descripción o referencia..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={loadRealData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto flex-wrap">
          <TabsTrigger value="diario">Libro Diario</TabsTrigger>
          <TabsTrigger value="mayor">Libro Mayor</TabsTrigger>
          <TabsTrigger value="comprobacion">Balance</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
          <TabsTrigger value="partidas">Partidas</TabsTrigger>
          <TabsTrigger value="inventarios">Balance Gral.</TabsTrigger>
          <TabsTrigger value="sar221" className="bg-indigo-50 text-indigo-700">SAR 221</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Libro Diario</CardTitle>
                <CardDescription>Registro cronológico detallado de pólizas.</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> PDF</Button>
            </CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[18%] whitespace-nowrap">Fecha / Póliza</TableHead>
                    <TableHead className="w-[42%]">Cuenta y Concepto</TableHead>
                    <TableHead className="w-[15%] text-right whitespace-nowrap">Débito</TableHead>
                    <TableHead className="w-[15%] text-right whitespace-nowrap">Crédito</TableHead>
                    <TableHead className="w-[10%] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={5} className="text-center py-10">Cargando movimientos...</TableCell></TableRow> : 
                    filteredDiarioEntries.map(entry => (
                      <React.Fragment key={entry.id}>
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell className="whitespace-nowrap align-middle text-left">
                            {new Date(entry.date).toLocaleDateString('es-HN')}
                            <Badge variant="outline" className="ml-2 whitespace-nowrap">{entry.voucher_type}-{entry.voucher_number}</Badge>
                          </TableCell>
                          <TableCell className="align-middle text-left">{entry.description}</TableCell>
                          <TableCell className="text-right whitespace-nowrap align-middle"></TableCell>
                          <TableCell className="text-right whitespace-nowrap align-middle"></TableCell>
                          <TableCell className="align-middle text-center">
                            <div className="flex justify-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>openEdit(entry)}><Edit className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {entry.entries.map(line => (
                          <TableRow key={line.id} className="text-sm">
                            <TableCell className="text-muted-foreground font-mono whitespace-nowrap align-middle">{line.account_code}</TableCell>
                            <TableCell className={`align-middle ${line.credit > 0 ? "pl-8" : ""}`}>{line.account_name}</TableCell>
                            <TableCell className="text-right whitespace-nowrap align-middle">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</TableCell>
                            <TableCell className="text-right whitespace-nowrap align-middle">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</TableCell>
                            <TableCell className="align-middle"></TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprobacion">
          <Card>
            <CardHeader><CardTitle>Balance de Comprobación de Sumas y Saldos</CardTitle></CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="w-[36%]">Cuenta</TableHead>
                    <TableHead className="w-[16%] text-right whitespace-nowrap">Sumas Débito</TableHead>
                    <TableHead className="w-[16%] text-right whitespace-nowrap">Sumas Crédito</TableHead>
                    <TableHead className="w-[16%] text-right whitespace-nowrap">Saldo Deudor</TableHead>
                    <TableHead className="w-[16%] text-right whitespace-nowrap">Saldo Acreedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalanceData.map(acc => (
                    <TableRow key={acc.account_code}>
                      <TableCell>
                        <div className="font-medium">{acc.account_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{acc.account_code}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.debit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.credit)}</TableCell>
                      <TableCell className="text-right text-blue-700">{acc.balance > 0 ? formatCurrency(acc.balance) : '-'}</TableCell>
                      <TableCell className="text-right text-purple-700">{acc.balance < 0 ? formatCurrency(Math.abs(acc.balance)) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/80 font-bold border-t-2">
                    <TableCell>TOTALES</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSums.debit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSums.credit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSums.debtor)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSums.creditor)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="mt-6 p-4 border rounded-lg bg-green-50/50 flex justify-around items-center">
                 <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Diferencia Sumas</p>
                    <p className="font-bold">{formatCurrency(totalSums.debit - totalSums.credit)}</p>
                 </div>
                 <div className="h-8 w-px bg-green-200" />
                 <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Diferencia Saldos</p>
                    <p className="font-bold">{formatCurrency(totalSums.debtor - totalSums.creditor)}</p>
                 </div>
                 {Math.abs(totalSums.debit - totalSums.credit) < 0.01 ? 
                  <Badge className="bg-green-600">CUADRADO</Badge> : 
                  <Badge variant="destructive">DESCUADRADO</Badge>
                 }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mayor">
          <Card>
            <CardHeader><CardTitle>Libro Mayor</CardTitle><CardDescription>Saldo por cuenta contable.</CardDescription></CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader><TableRow><TableHead className="w-[40%]">Cuenta</TableHead><TableHead className="w-[20%] text-right whitespace-nowrap">Débito</TableHead><TableHead className="w-[20%] text-right whitespace-nowrap">Crédito</TableHead><TableHead className="w-[20%] text-right whitespace-nowrap">Saldo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mayorEntries.length===0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay datos en Libro Mayor</TableCell></TableRow> :
                    mayorEntries.map((m:any)=> (
                      <TableRow key={m.account_code || m.codigo_cuenta}>
                        <TableCell><div className="font-mono text-xs">{m.account_code || m.codigo_cuenta}</div><div className="text-sm">{m.account_name || m.nombre_cuenta}</div></TableCell>
                        <TableCell className="text-right">{formatCurrency(m.debit ?? m.total_debe ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.credit ?? m.total_haber ?? 0)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(m.balance ?? m.saldo ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingresos">
          <Card>
            <CardHeader><CardTitle>Libro de Ingresos</CardTitle><CardDescription>{ingresos.length} pólizas de ingreso</CardDescription></CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader><TableRow><TableHead className="w-[15%] whitespace-nowrap">Fecha</TableHead><TableHead className="w-[15%] whitespace-nowrap">Póliza</TableHead><TableHead className="w-[45%]">Descripción</TableHead><TableHead className="w-[15%] text-right whitespace-nowrap">Monto</TableHead><TableHead className="w-[10%] text-center">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ingresos.length===0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay ingresos para el periodo</TableCell></TableRow> :
                    ingresos.map((it:any)=> (
                      <TableRow key={it.id}>
                        <TableCell className="align-middle">{it.date ? new Date(it.date).toLocaleDateString('es-HN') : it.fecha ? new Date(it.fecha).toLocaleDateString('es-HN') : '-'}</TableCell>
                        <TableCell className="align-middle"><Badge variant="outline">{it.voucher_type || it.voucherType}-{it.voucher_number || it.voucherNumber}</Badge></TableCell>
                        <TableCell className="align-middle">{it.description || it.descripcion}</TableCell>
                        <TableCell className="text-right font-bold text-green-700 align-middle">{formatCurrency(it.total_amount || it.totalAmount || 0)}</TableCell>
                        <TableCell className="text-center align-middle"><div className="flex justify-center"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>openEdit(it)}><Edit className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="egresos">
          <Card>
            <CardHeader><CardTitle>Libro de Egresos</CardTitle><CardDescription>{egresos.length} pólizas de egreso</CardDescription></CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader><TableRow><TableHead className="w-[15%] whitespace-nowrap">Fecha</TableHead><TableHead className="w-[15%] whitespace-nowrap">Póliza</TableHead><TableHead className="w-[45%]">Descripción</TableHead><TableHead className="w-[15%] text-right whitespace-nowrap">Monto</TableHead><TableHead className="w-[10%] text-center">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {egresos.length===0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay egresos para el periodo</TableCell></TableRow> :
                    egresos.map((it:any)=> (
                      <TableRow key={it.id}>
                        <TableCell className="align-middle">{it.date ? new Date(it.date).toLocaleDateString('es-HN') : '-'}</TableCell>
                        <TableCell className="align-middle"><Badge variant="outline">{it.voucher_type || it.voucherType}-{it.voucher_number || it.voucherNumber}</Badge></TableCell>
                        <TableCell className="align-middle">{it.description}</TableCell>
                        <TableCell className="text-right font-bold text-red-700 align-middle">{formatCurrency(it.total_amount || it.totalAmount || 0)}</TableCell>
                        <TableCell className="text-center align-middle"><div className="flex justify-center"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>openEdit(it)}><Edit className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partidas">
          <Card>
            <CardHeader><CardTitle>Partidas Contables</CardTitle><CardDescription>Todas las pólizas del periodo</CardDescription></CardHeader>
            <CardContent>
              <Table className="w-full table-fixed">
                <TableHeader><TableRow><TableHead className="w-[15%] whitespace-nowrap">Fecha</TableHead><TableHead className="w-[15%] whitespace-nowrap">Tipo</TableHead><TableHead className="w-[50%]">Descripción</TableHead><TableHead className="w-[20%] text-right whitespace-nowrap">Monto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {allTransactions.length===0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay partidas</TableCell></TableRow> :
                    allTransactions.map((it:any)=> (
                      <TableRow key={it.id}>
                        <TableCell>{it.date ? new Date(it.date).toLocaleDateString('es-HN') : '-'}</TableCell>
                        <TableCell><Badge>{it.voucher_type || it.voucherType}</Badge></TableCell>
                        <TableCell>{it.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.total_amount || it.totalAmount || 0)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventarios">
          <Card>
            <CardHeader><CardTitle>Balance General</CardTitle><CardDescription>Resumen patrimonial</CardDescription></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Balance General se genera desde el Balance de Comprobación. Revisa la pestaña Balance.</p>
              <div className="mt-4 p-4 border rounded-lg bg-blue-50 flex justify-between">
                <span className="font-bold">Ver Balance de Comprobación</span>
                <Button size="sm" onClick={()=>setActiveTab("comprobacion")}>Ir a Balance</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sar221">
           <SARForm221 
              ingresos={ingresos} 
              egresos={egresos} 
              period={selectedMonth === "all" ? selectedYear : `${selectedYear}-${selectedMonth}`} 
           />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingEntry} onOpenChange={(o)=> !o && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar póliza</DialogTitle>
            <DialogDescription>Modifica la información y guarda para actualizar los libros y estados financieros.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={editForm.date} onChange={e=>setEditForm({...editForm, date: e.target.value})} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={editForm.description} onChange={e=>setEditForm({...editForm, description: e.target.value})} />
            </div>
            <div>
              <Label>Monto (HNL)</Label>
              <Input type="number" value={editForm.totalAmount as any} onChange={e=>setEditForm({...editForm, totalAmount: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditingEntry(null)}>Cancelar</Button>
            <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
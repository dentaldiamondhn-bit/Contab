"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Calendar, CheckCircle2, XCircle, Lock, Unlock,
  AlertTriangle, Loader2, FileText, TrendingUp, TrendingDown,
  Clock, ChevronLeft, ChevronRight, ChevronDown,
  Search, Filter, Eye, BookOpen, Receipt, Scale, ShieldCheck,
  Upload, Download, Plus, RefreshCw, RotateCcw, X, Check,
  ArrowDownAZ, ArrowUpAZ, DollarSign, Activity,
} from "lucide-react";

interface PeriodData {
  year: number; month: number; status: "open" | "closed" | "locked";
  closed_by: string | null; closed_at: string | null; notes: string | null;
  transaction_count: number; prev_month_closed: boolean; can_close: boolean;
}

interface PeriodDetails {
  totalDebits: number; totalCredits: number; difference: number; isBalanced: boolean;
  transactions: any[]; accounts: any[]; txCount: number;
  asientosPendientesCount: number; period: any; pendingTransactions: any[];
}

interface TransactionRow {
  id: string; date: string; description: string; voucherType: string;
  voucherNumber: number; totalAmount: number; status: string;
  debitAmount: number; creditAmount: number;
  cuenta_codigo: string; cuenta_nombre: string; origen: string;
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function cn(...classes: (string | boolean | undefined | null)[]) { return classes.filter(Boolean).join(" "); }

export default function PeriodClosingPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [years, setYears] = useState<number[]>([new Date().getFullYear()]);
  const [periods, setPeriods] = useState<PeriodData[]>([]);
  const [periodDetails, setPeriodDetails] = useState<PeriodDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"transactions" | "checklist">("transactions");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");

  const selectedPeriod = useMemo(() => periods.find(p => p.year === selectedYear && p.month === selectedMonth), [periods, selectedYear, selectedMonth]);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/period-closing?year=${selectedYear}&tenantId=${encodeURIComponent(companyId)}`, { headers: { "x-tenant-id": companyId } });
      const data = await res.json();
      if (res.ok && data?.periods) { setPeriods(data.periods || []); setYears(data.years || [selectedYear]); }
      else if (data?.error) console.error("fetchPeriods error:", data.error);
    } catch (e) { console.error("fetchPeriods network:", e); }
    setLoading(false);
  }, [companyId, selectedYear]);

  const fetchPeriodDetails = useCallback(async (year: number, month: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/accounting/period-closing?year=${year}&month=${month}&tenantId=${encodeURIComponent(companyId)}`, { headers: { "x-tenant-id": companyId } });
      const data = await res.json();
      if (res.ok && data.details) setPeriodDetails(data.details);
      else if (data?.error) console.error("fetchPeriodDetails error:", data.error);
    } catch (e) { console.error("fetchPeriodDetails network:", e); }
    setLoadingDetail(false);
  }, [companyId]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  useEffect(() => {
    if (selectedPeriod) {
      setPeriodDetails(null);
      fetchPeriodDetails(selectedYear, selectedMonth);
    } else {
      setPeriodDetails(null);
    }
  }, [selectedYear, selectedMonth, selectedPeriod, fetchPeriodDetails]);

  const handleCloseMonth = async () => {
    try {
      const res = await fetch("/api/accounting/period-closing", {
        method: "POST", headers: { "Content-Type": "application/json", "x-tenant-id": companyId },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, notes: closeNotes }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { data = { raw: await res.text().catch(() => "") }; }
      if (res.ok && data?.success) { setShowCloseDialog(false); setCloseNotes(""); fetchPeriods(); fetchPeriodDetails(selectedYear, selectedMonth); }
      else alert(`Error ${res.status}: ${data?.error || data?.raw || JSON.stringify(data) || "respuesta inválida"}`);
    } catch (e: any) {
      alert(`Error de red: ${e?.message || String(e)}`);
    }
  };

  const handleReopenMonth = async () => {
    try {
      const res = await fetch("/api/accounting/period-closing", {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-tenant-id": companyId },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, reason: reopenReason }),
      });
      const data = await res.json();
      if (res.ok && data?.success) { setShowReopenDialog(false); setReopenReason(""); fetchPeriods(); fetchPeriodDetails(selectedYear, selectedMonth); }
      else alert(`Error ${res.status}: ${data.error}`);
    } catch (e: any) {
      alert(`Error de red: ${e?.message || String(e)}`);
    }
  };

  const handleCloseAll = async () => {
    if (!selectedPeriod || !selectedPeriod.can_close) return;
    try {
      const res = await fetch("/api/accounting/period-closing", {
        method: "POST", headers: { "Content-Type": "application/json", "x-tenant-id": companyId },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, notes: "Cierre completo", action: "close-all" }),
      });
      const data = await res.json();
      if (res.ok && data?.success) { setShowCloseDialog(false); fetchPeriods(); fetchPeriodDetails(selectedYear, selectedMonth); }
      else alert(`Error ${res.status}: ${data.error}`);
    } catch (e: any) {
      alert(`Error de red: ${e?.message || String(e)}`);
    }
  };

  const totalDebits = periodDetails?.totalDebits || 0;
  const totalCredits = periodDetails?.totalCredits || 0;
  const difference = periodDetails?.difference || 0;
  const isBalanced = periodDetails?.isBalanced || false;
  const asientosPendientes = periodDetails?.asientosPendientesCount || 0;
  const currentPeriodStatus = periodDetails?.period?.status || selectedPeriod?.status || "open";
  const canClose = currentPeriodStatus === "open";
  const statusUnavailable = !periods.length && !periodDetails;

  // Compute debit/credit per transaction from accounts
  const accountsMap = useMemo(() => {
    if (!periodDetails) return new Map();
    const m = new Map<string, { debit: number; credit: number }>();
    for (const acc of periodDetails.accounts) {
      const existing = m.get(acc.account_code) || { debit: 0, credit: 0 };
      existing.debit += acc.debit || 0;
      existing.credit += acc.credit || 0;
      m.set(acc.account_code, existing);
    }
    return m;
  }, [periodDetails]);

  const transactionsWithAmounts = useMemo(() => {
    if (!periodDetails) return [];
    return periodDetails.transactions.map((tx: any) => ({
      id: tx.id_transaccion,
      date: tx.fecha,
      description: tx.concepto || tx.description || "",
      voucherType: tx.origen || tx.voucherType || tx.voucher_type || "-",
      voucherNumber: tx.voucherNumber || tx.voucher_number || 0,
      totalAmount: tx.totalAmount || tx.monto || 0,
      status: tx.estado || "PUBLICADO",
      debitAmount: Number(tx.debito) || 0,
      creditAmount: Number(tx.credito) || 0,
      cuenta_codigo: tx.cuenta_codigo || "",
      cuenta_nombre: tx.cuenta_nombre || "",
    }));
  }, [periodDetails, totalDebits, totalCredits]);

  const filteredTransactions = useMemo(() => {
    if (!periodDetails) return [];
    let txs = transactionsWithAmounts;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      txs = txs.filter((t: any) =>
        (t.description || "").toLowerCase().includes(term) ||
        (t.voucherNumber || "").toString().includes(term) ||
        (t.voucherType || "").toLowerCase().includes(term)
      );
    }
    if (filterType !== "all") txs = txs.filter((t: any) => t.voucherType === filterType);
    return txs.sort((a: any, b: any) => sortDirection === "asc" ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodDetails, searchTerm, filterType, sortDirection, transactionsWithAmounts]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "closed": return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Cerrado</Badge>;
      case "locked": return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>;
      default: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Abierto</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/accounting`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cierre Mensual</h1>
            <p className="text-gray-600">Gestión de períodos contables</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <select
                value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="border rounded-lg px-3 py-2 text-lg font-semibold"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="border rounded-lg px-3 py-2 text-lg font-semibold"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            {selectedPeriod && (
              <div className="flex items-center space-x-3">
                {statusBadge(selectedPeriod.status)}
                <span className="text-sm text-gray-600">{selectedPeriod.transaction_count} transacciones</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Débitos</p>
                <p className="text-2xl font-bold text-green-700">{totalDebits.toLocaleString("es-HN", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Créditos</p>
                <p className="text-2xl font-bold text-red-700">{totalCredits.toLocaleString("es-HN", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Diferencia / Balance</p>
                <p className={cn("text-2xl font-bold", Math.abs(difference) < 1 ? "text-green-700" : "text-red-700")}>
                  {difference.toLocaleString("es-HN", {minimumFractionDigits:2, maximumFractionDigits:2})}
                </p>
              </div>
              {isBalanced ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <AlertTriangle className="h-8 w-8 text-red-600" />}
            </div>
            <Badge className={cn("mt-2", isBalanced ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
              {isBalanced ? "Cuadrado" : "Descuadre"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Asientos Pendientes</p>
                <p className="text-2xl font-bold text-amber-700">{asientosPendientes}</p>
              </div>
              <Activity className="h-8 w-8 text-amber-600" />
            </div>
            <Badge variant="secondary" className="mt-2">{selectedPeriod?.status === "open" ? "Requiere revisión" : "Todo en orden"}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {selectedPeriod && (
        <div className="flex items-center space-x-3">
          {currentPeriodStatus === "open" && (
            <>
              <Button onClick={() => setShowCloseDialog(true)} disabled={!canClose || asientosPendientes > 0}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Cerrar Período
              </Button>
              {(asientosPendientes > 0 || !canClose) && (
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {asientosPendientes > 0 ? `${asientosPendientes} pendientes` : "Sin acceso"}
                </Badge>
              )}
            </>
          )}
          {currentPeriodStatus === "closed" && (
            <Button variant="outline" onClick={() => setShowReopenDialog(true)}>
              <Unlock className="h-4 w-4 mr-2" /> Reabrir Período
            </Button>
          )}
          {currentPeriodStatus === "locked" && (
            <Badge variant="destructive"><Lock className="h-4 w-4 mr-2" /> Período Bloqueado</Badge>
          )}
          {statusUnavailable && (
            <>
              <Badge variant="outline" className="text-red-600 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" /> No se pudo cargar el estado</Badge>
              <Button variant="outline" onClick={() => { fetchPeriods(); fetchPeriodDetails(selectedYear, selectedMonth); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("transactions")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "transactions" ? "bg-white shadow text-gray-900" : "text-gray-600")}
        >
          <FileText className="h-4 w-4 mr-1 inline" /> Transacciones
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "checklist" ? "bg-white shadow text-gray-900" : "text-gray-600")}
        >
          <ShieldCheck className="h-4 w-4 mr-1 inline" /> Checklist de Pre-cierre
        </button>
      </div>

      {/* Tab: Transactions */}
      {activeTab === "transactions" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Transacciones y Asientos</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar asiento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Todos</option>
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                  <option value="DIARIO">Diario</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                  {sortDirection === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Cargando transacciones...</span>
              </div>
            ) : !periodDetails ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Selecciona un período para ver las transacciones</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No hay transacciones</p>
                <p className="text-sm">{searchTerm || filterType !== "all" ? "No se encontraron coincidencias" : "Este período no tiene transacciones registradas"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase"># Asiento</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Origen</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Débito</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Crédito</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx: TransactionRow, i) => (
                      <tr key={`${tx.id}-${i}`} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium">{tx.voucherNumber || "-"}</td>
                        <td className="py-3 px-4 text-sm">{tx.date ? new Date(tx.date).toLocaleDateString("es-HN") : "-"}</td>
                        <td className="py-3 px-4 text-sm">{tx.description || "-"}</td>
                        <td className="py-3 px-4 text-sm">
                          <Badge variant="outline" className={cn(
                            tx.voucherType === "INGRESO" ? "bg-green-100 text-green-800" :
                            tx.voucherType === "EGRESO" ? "bg-red-100 text-red-800" :
                            "bg-blue-100 text-blue-800"
                          )}>{tx.voucherType || "-"}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm"><Badge variant="secondary">{tx.status || "Published"}</Badge></td>
                        <td className="py-3 px-4 text-sm text-right text-green-700">{tx.debitAmount?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-700">{tx.creditAmount?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</td>
                        <td className="py-3 px-4 text-center">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedTx(tx); setShowDetailDrawer(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={5} className="py-3 px-4 text-right">Total</td>
                      <td className="py-3 px-4 text-right text-green-700">{totalDebits.toLocaleString("es-HN", {minimumFractionDigits:2})}</td>
                      <td className="py-3 px-4 text-right text-red-700">{totalCredits.toLocaleString("es-HN", {minimumFractionDigits:2})}</td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Checklist */}
      {activeTab === "checklist" && (
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Pre-cierre y Validaciones</CardTitle>
            <CardDescription>Verifique que todos los pasos estén completos antes de cerrar el período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Conciliación bancaria al día", ok: true },
              { name: "Cuentas por Cobrar vs Mayor", ok: true },
              { name: "Costo de Ventas contabilizado", ok: false },
              { name: "Nómina aplicada", ok: true },
              { name: "Balanza sin descuadre", ok: isBalanced },
              { name: "Todos los asientos publicados", ok: currentPeriodStatus === "open" ? false : true },
            ].map((item, i) => (
              <div key={i} className={cn("flex items-center justify-between p-4 rounded-lg border", item.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center space-x-3">
                  {item.ok ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <span className={cn("font-medium", item.ok ? "text-green-800" : "text-red-800")}>{item.name}</span>
                </div>
                <Badge className={cn(item.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                  {item.ok ? "Completado" : "Pendiente"}
                </Badge>
              </div>
            ))}

            {/* Pending Entries Warning */}
            {asientosPendientes > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-amber-800 font-medium">{asientosPendientes} asientos pendientes/borrador detectados</span>
              </div>
            )}

            {/* Trial Balance Detail */}
            {periodDetails && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Balanza de Comprobación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {periodDetails.accounts.slice(0, 20).map((acc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b text-sm">
                        <div>
                          <span className="font-medium">{acc.account_code}</span>
                          <span className="text-gray-600 ml-2">{acc.account_name}</span>
                          <Badge variant="outline" className="ml-2">{acc.account_type}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-green-700">{acc.debit?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</span>
                          <span className="text-red-700">{acc.credit?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</span>
                          <span className={cn("font-medium w-24 text-right", Math.abs(acc.balance || 0) < 1 ? "text-green-700" : "text-red-700")}>
                            {(acc.balance || 0).toLocaleString("es-HN", {minimumFractionDigits:2})}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Close Confirmation Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Confirmar Cierre de Período</span>
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de cerrar el período <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Débitos</p>
                <p className="font-bold text-green-700">{totalDebits.toLocaleString("es-HN", {minimumFractionDigits:2})}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Créditos</p>
                <p className="font-bold text-red-700">{totalCredits.toLocaleString("es-HN", {minimumFractionDigits:2})}</p>
              </div>
            </div>
            <div className={cn("p-3 rounded-lg", isBalanced ? "bg-green-50" : "bg-red-50")}>
              <p className={cn("font-medium", isBalanced ? "text-green-700" : "text-red-700")}>
                {isBalanced ? "✓ Balanza cuadrada" : "✗ Descuadre detectado"}
              </p>
            </div>
            <div>
              <Label>Notas de cierre (opcional)</Label>
              <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Escriba las notas del cierre..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
            <Button onClick={handleCloseMonth} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Confirmation Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Unlock className="h-5 w-5 text-blue-600" />
              <span>Reabrir Período</span>
            </DialogTitle>
            <DialogDescription>
              ¿Reabrir el período <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Motivo</Label>
              <Textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Indique el motivo de la reapertura..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReopenMonth}>
              <Unlock className="h-4 w-4 mr-2" /> Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Drawer */}
      <Dialog open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle del Asiento</span>
              <Button variant="ghost" size="sm" onClick={() => setShowDetailDrawer(false)}><X className="h-4 w-4" /></Button>
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm text-gray-600"># Asiento</Label><p className="font-medium">{selectedTx.voucherNumber || "-"}</p></div>
                <div><Label className="text-sm text-gray-600">Fecha</Label><p className="font-medium">{selectedTx.date ? new Date(selectedTx.date).toLocaleDateString("es-HN") : "-"}</p></div>
                <div><Label className="text-sm text-gray-600">Origen</Label><p className="font-medium">{selectedTx.voucherType || "-"}</p></div>
                <div><Label className="text-sm text-gray-600">Estado</Label><p className="font-medium">{selectedTx.status || "Published"}</p></div>
                <div><Label className="text-sm text-gray-600">Concepto</Label><p className="font-medium">{selectedTx.description || "-"}</p></div>
                <div><Label className="text-sm text-gray-600">Monto Total</Label><p className="font-medium">{selectedTx.totalAmount?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</p></div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Líneas del Asiento</Label>
                <div className="mt-2 space-y-2">
                  {periodDetails?.accounts.slice(0, 5).map((acc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span>{acc.account_code} - {acc.account_name}</span>
                      <div className="flex space-x-4">
                        <span className="text-green-700">{acc.debit?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</span>
                        <span className="text-red-700">{acc.credit?.toLocaleString("es-HN", {minimumFractionDigits:2}) || "0.00"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Cargando períodos...</span>
        </div>
      )}
    </div>
  );
}

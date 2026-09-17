"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RefreshCw,
  FilePenLine,
  FilePlus2,
  Eye,
  CheckCircle2,
  Ban,
  Search,
  Filter,
  FileText,
  TrendingDown,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { CreditNoteForm, DebitNoteForm } from "@/components/billing/NoteForm";
import NotePreview from "@/components/billing/NotePreview";

interface Note {
  id: string;
  tenantId: string;
  originalInvoiceId: string | null;
  noteType: "CREDIT" | "DEBIT";
  noteNumber: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPLIED" | "CANCELLED";
  appliedDate: string | null;
  createdAt: string;
  invoice: {
    invoiceNumber?: string | null;
    customerName?: string | null;
    customerRTN?: string | null;
    issueDate?: string | null;
    cai?: string | null;
  } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-yellow-100 text-yellow-800" },
  APPLIED: { label: "Aplicada", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Anulada", cls: "bg-red-100 text-red-800" },
};

export default function BillingNotesPage() {
  const router = useRouter();
  const { currentTenant } = useTenant();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [creating, setCreating] = useState<"CREDIT" | "DEBIT" | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!currentTenant) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ tenantId: currentTenant.id });
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/billing/notes?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al cargar las notas");
      }
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err: any) {
      console.error("Error cargando notas:", err);
      setError(err.message || "Error al cargar las notas");
    } finally {
      setLoading(false);
    }
  }, [currentTenant, typeFilter, statusFilter]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const changeStatus = async (note: Note, status: string) => {
    try {
      setActingId(note.id);
      const response = await fetch(`/api/billing/notes/${note.id}?tenantId=${currentTenant?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar la nota");
      }
      await loadNotes();
    } catch (err: any) {
      console.error("Error actualizando nota:", err);
      setError(err.message || "Error al actualizar la nota");
    } finally {
      setActingId(null);
    }
  };

  const filtered = notes.filter((n) =>
    (n.reason || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const creditNotes = notes.filter((n) => n.noteType === "CREDIT" && n.status !== "CANCELLED");
  const debitNotes = notes.filter((n) => n.noteType === "DEBIT" && n.status !== "CANCELLED");
  const totalCredit = creditNotes.reduce((s, n) => s + n.amount, 0);
  const totalDebit = debitNotes.reduce((s, n) => s + n.amount, 0);
  const pendingCount = notes.filter((n) => n.status === "PENDING").length;

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No hay empresa seleccionada
              </h2>
              <Button onClick={() => router.push("/dashboard")} className="mt-4">
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/billing")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver a Facturación
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notas de Crédito/Débito
              </h1>
              <p className="text-gray-600 mt-1">
                Documentos de ajuste sobre facturas emitidas — {currentTenant.businessName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadNotes}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button
                onClick={() => setCreating("CREDIT")}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <FilePenLine className="w-4 h-4" />
                Nota de Crédito
              </Button>
              <Button
                onClick={() => setCreating("DEBIT")}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <FilePlus2 className="w-4 h-4" />
                Nota de Débito
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Notas</p>
                  <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                  <p className="text-xs text-gray-500">{pendingCount} pendientes</p>
                </div>
                <FileText className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Créditos</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(totalCredit)}</p>
                  <p className="text-xs text-gray-500">{creditNotes.length} activas</p>
                </div>
                <TrendingDown className="w-8 h-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Débitos</p>
                  <p className="text-lg font-bold text-orange-600">{fmt(totalDebit)}</p>
                  <p className="text-xs text-gray-500">{debitNotes.length} activas</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Efecto Neto ISV</p>
                  <p className="text-lg font-bold text-gray-900">
                    {fmt(totalDebit - totalCredit)}
                  </p>
                  <p className="text-xs text-gray-500">débitos − créditos</p>
                </div>
                <FilePenLine className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos los tipos</option>
                  <option value="CREDIT">Nota de Crédito</option>
                  <option value="DEBIT">Nota de Débito</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="APPLIED">Aplicada</option>
                  <option value="CANCELLED">Anulada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registro de Notas
              <span className="text-sm font-normal text-gray-500">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando notas...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No hay notas de crédito/débito registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Número</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Cliente</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Factura</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Motivo</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Monto</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((note) => {
                      const statusCfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.PENDING;
                      const isCredit = note.noteType === "CREDIT";
                      return (
                        <tr key={note.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm text-gray-900">{note.noteNumber}</td>
                          <td className="py-3 px-4">
                            <Badge className={isCredit ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}>
                              {isCredit ? "Crédito" : "Débito"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {note.appliedDate ? new Date(note.appliedDate).toLocaleDateString("es-HN") : "—"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {note.invoice?.customerName || "Consumidor Final"}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-gray-600">
                            {note.invoice?.invoiceNumber || "—"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-[220px] truncate" title={note.reason}>
                            {note.reason}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900">
                            {fmt(note.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={statusCfg.cls}>{statusCfg.label}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setPreviewNote(note)} title="Ver documento">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {note.status === "PENDING" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => changeStatus(note, "APPLIED")}
                                  disabled={actingId === note.id}
                                  title="Marcar como aplicada"
                                  className="text-green-600"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              {note.status !== "CANCELLED" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`¿Anular la nota ${note.noteNumber}? Esta acción es permanente.`)) {
                                      changeStatus(note, "CANCELLED");
                                    }
                                  }}
                                  disabled={actingId === note.id}
                                  title="Anular nota"
                                  className="text-red-600"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {creating === "CREDIT" && (
        <CreditNoteForm
          onCancel={() => setCreating(null)}
          onSuccess={() => {
            setCreating(null);
            setTimeout(loadNotes, 400);
          }}
        />
      )}
      {creating === "DEBIT" && (
        <DebitNoteForm
          onCancel={() => setCreating(null)}
          onSuccess={() => {
            setCreating(null);
            setTimeout(loadNotes, 400);
          }}
        />
      )}
      {previewNote && (
        <NotePreview note={previewNote} tenant={currentTenant} onClose={() => setPreviewNote(null)} />
      )}
    </div>
  );
}
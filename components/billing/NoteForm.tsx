"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTenant } from "@/lib/contexts/TenantContext";

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  issueDate: string | null;
}

export interface NoteFormProps {
  mode: "CREDIT" | "DEBIT";
  onSuccess?: (note: any) => void;
  onCancel?: () => void;
}

export default function NoteForm({ mode, onSuccess, onCancel }: NoteFormProps) {
  const { currentTenant } = useTenant();
  const isCredit = mode === "CREDIT";

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (currentTenant) {
      loadInvoices();
    }
  }, [currentTenant]);

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await fetch(
        `/api/admin/billing/invoices?tenantId=${currentTenant?.id || ""}&type=CUSTOMER&limit=100`
      );
      if (!response.ok) return;
      const data = await response.json();
      const list = (data.invoices || []).filter((inv: any) => inv.total > 0);
      setInvoices(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedInvoiceId(first.id);
        if (isCredit) setAmount(String(first.total));
      }
    } catch (err) {
      console.error("Error cargando facturas:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv && isCredit) {
      setAmount(String(inv.total));
    }
    if (!id) {
      setAmount("");
    }
  };

  const amountValue = parseFloat(amount) || 0;
  const subtotalPreview = amountValue > 0 ? amountValue / 1.15 : 0;
  const taxPreview = amountValue > 0 ? amountValue - subtotalPreview : 0;

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!currentTenant) {
      setError("No hay empresa seleccionada");
      return;
    }
    if (!reason.trim()) {
      setError("Debe escribir el motivo de la nota");
      return;
    }
    if (amountValue <= 0) {
      setError("Debe ingresar un monto mayor a cero");
      return;
    }
    if (!isCredit && selectedInvoice && amountValue > selectedInvoice.total) {
      setError(
        "El monto de la nota de débito no puede exceder el total de la factura"
      );
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/billing/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          noteType: mode,
          date,
          originalInvoiceId: selectedInvoice?.id || null,
          invoiceNumber: selectedInvoice?.invoiceNumber || null,
          customerName: selectedInvoice?.customerName || "Consumidor Final",
          reason: reason.trim(),
          amount: amountValue,
          paymentMethod,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Error al crear la nota");
      }

      setSuccess(
        `Nota de ${isCredit ? "crédito" : "débito"} ${data.note?.noteNumber} emitida exitosamente`
      );
      if (onSuccess) onSuccess(data.note);
    } catch (err: any) {
      console.error("Error creando nota:", err);
      setError(err.message || "Error al crear la nota");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className={isCredit ? "text-emerald-700" : "text-orange-700"}>
            Nueva Nota de {isCredit ? "Crédito" : "Débito"}
          </DialogTitle>
          <DialogDescription>
            {isCredit
              ? "Restituye el monto al cliente por devoluciones, descuentos o anulaciones de venta."
              : "Cobra un monto adicional al cliente sobre la factura emitida."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          <div>
            <Label htmlFor="invoice">Factura original (opcional)</Label>
            <select
              id="invoice"
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
            >
              <option value="">Sin factura (nota independiente)</option>
              {loadingInvoices && (
                <option value="">Cargando facturas...</option>
              )}
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerName} (L {inv.total.toFixed(2)})
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <p className="mt-1 text-xs text-gray-500">
                Cliente: {selectedInvoice.customerName} • Emisión:{" "}
                {selectedInvoice.issueDate || "—"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <Label htmlFor="amount">Monto (L)</Label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          {amountValue > 0 && (
            <div className="flex justify-end text-sm">
              <div className="w-1/2 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>L {subtotalPreview.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ISV (15%):</span>
                  <span>L {taxPreview.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t pt-1">
                  <span>Total:</span>
                  <span>L {amountValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="payment">Contra cuenta en asiento</Label>
            <select
              id="payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
            >
              <option value="credit">Clientes (crédito)</option>
              <option value="cash">Caja (efectivo)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="reason">Motivo *</Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                isCredit
                  ? "Ej: Devolución de mercancía, ajuste de precio, anulación parcial de venta..."
                  : "Ej: Ajuste por intereses, diferencia de precio, recargo adicional..."
              }
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={
              isCredit
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-orange-600 hover:bg-orange-700"
            }
          >
            {submitting ? "Emitiendo..." : "Emitir Nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreditNoteForm(props: Omit<NoteFormProps, "mode">) {
  return <NoteForm mode="CREDIT" {...props} />;
}

export function DebitNoteForm(props: Omit<NoteFormProps, "mode">) {
  return <NoteForm mode="DEBIT" {...props} />;
}
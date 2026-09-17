"use client";

import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface InvoiceLike {
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerRTN?: string | null;
  issueDate?: string | null;
  total?: number | null;
  cai?: string | null;
}

interface NoteLike {
  id: string;
  noteType: string;
  noteNumber: string;
  reason: string;
  amount: number;
  status: string;
  appliedDate: string | null;
  createdAt: string;
  invoice?: InvoiceLike | null;
}

interface TenantLike {
  businessName?: string;
  businessRTN?: string;
  businessAddress?: string;
}

interface NotePreviewProps {
  note: NoteLike;
  tenant?: TenantLike | null;
  onClose?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-HN") : "—";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPLIED: "Aplicada",
  CANCELLED: "Anulada",
};

export default function NotePreview({ note, tenant, onClose }: NotePreviewProps) {
  const isCredit = note.noteType === "CREDIT";
  const invoice = note.invoice;

  const print = () => {
    const content = document.getElementById("note-preview-doc");
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(
      `<html><head><title>${note.noteNumber}</title><style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
        .center { text-align: center; } .right { text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
        .mv-1 { margin: 4px 0; } .bold { font-weight: bold; }
        .box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; margin: 12px 0; }
        .border-b { border-bottom: 2px solid #000; padding-bottom: 8px; }
      </style></head><body>${content.innerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl mt-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Documento Fiscal</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isCredit
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {isCredit ? "Nota de Crédito" : "Nota de Débito"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={print} className="flex items-center gap-1">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div id="note-preview-doc" className="border rounded-lg p-6">
            <div className="center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {tenant?.businessName || "Mi Empresa"}
              </h2>
              <p className="text-sm text-gray-600">RTN: {tenant?.businessRTN || "CF"}</p>
              <p className="text-sm text-gray-600">{tenant?.businessAddress || ""}</p>
              <h3
                className={`inline-block mt-4 px-6 pb-1 border-b-2 font-bold text-lg ${
                  isCredit ? "text-emerald-700 border-emerald-700" : "text-orange-700 border-orange-700"
                }`}
              >
                {isCredit ? "NOTA DE CRÉDITO" : "NOTA DE DÉBITO"}
              </h3>
              <p className="text-sm mt-1 text-gray-600">Documento fiscal electrónico</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div>
                <span className="font-semibold text-gray-600">No.: </span>
                <span className="font-mono text-gray-900">{note.noteNumber}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Fecha: </span>
                <span className="text-gray-900">{fmtDate(note.appliedDate)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Estado: </span>
                <span className="text-gray-900">{STATUS_LABELS[note.status] || note.status}</span>
              </div>
            </div>

            <div className="box">
              <div className="text-sm mb-2">
                <span className="font-semibold text-gray-600">Cliente: </span>
                <span>{invoice?.customerName || "Consumidor Final"}</span>
              </div>
              <div className="text-sm mb-2">
                <span className="font-semibold text-gray-600">RTN: </span>
                <span>{invoice?.customerRTN || "CF"}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-600">Factura original: </span>
                <span className="font-mono">{invoice?.invoiceNumber || "—"}</span>
              </div>
              {invoice?.cai && (
                <div className="text-xs text-gray-500 mt-2 break-all">
                  <span className="font-semibold">CAI de la factura original: </span>
                  {invoice.cai}
                </div>
              )}
            </div>

            <div className="box">
              <div className="text-sm font-semibold text-gray-600 mb-1">Motivo:</div>
              <p className="text-sm text-gray-900">{note.reason}</p>
            </div>

            <div className="flex justify-end mt-4">
              <div className="w-1/2 border rounded-lg p-3">
                <div className="flex justify-between py-1 text-sm text-gray-600">
                  <span>Monto total:</span>
                  <span className="font-bold text-gray-900">{fmt(note.amount)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm border-t">
                  <span className="font-semibold">
                    {isCredit ? "Monto a restituir:" : "Monto a cobrar:"}
                  </span>
                  <span className="font-bold text-gray-900">{fmt(note.amount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 center text-xs text-gray-500 border-t pt-3">
              <p>Original: Cliente | Copia: Obligado Tributario Emisor</p>
              <p>Sistema de Facturación: ContabHN</p>
              <p className="mt-1">
                {isCredit
                  ? "Nota de crédito sin CAI propio, referencia CAI de la factura original según normativa SAR-HN."
                  : "Nota de débito sin CAI propio, referencia CAI de la factura original según normativa SAR-HN."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
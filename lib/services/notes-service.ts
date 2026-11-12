import { supabase } from "@/lib/supabase-db";
import { resolveAccountId, ACCOUNT_PREFIXES } from "@/lib/accounting/resolve-account";

export type NoteType = "CREDIT" | "DEBIT";
export type NoteStatus = "PENDING" | "APPLIED" | "CANCELLED";

export interface InvoiceRef {
  id: string;
  invoiceNumber: string;
  issueDate: string | null;
  customerName: string | null;
  customerRTN: string | null;
  total: number | null;
  cai: string | null;
}

export interface NoteRecord {
  id: string;
  tenantId: string;
  originalInvoiceId: string | null;
  noteType: NoteType;
  noteNumber: string;
  reason: string;
  amount: number;
  status: NoteStatus;
  appliedDate: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface NoteWithInvoice extends NoteRecord {
  invoice: InvoiceRef | null;
}

export interface NoteInput {
  noteType: NoteType;
  date: string;
  originalInvoiceId?: string | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  reason: string;
  amount: number;
  paymentMethod?: string;
  createdBy?: string | null;
}

const roundCents = (n: number) => Math.round(n * 100);

// Resolver tenant: header/query explícito primero, luego auth del usuario, luego fallback "1"
export async function resolveTenantId(opts: {
  header?: string | null;
  query?: string | null;
  body?: string | null;
} = {}): Promise<string> {
  if (opts.header && opts.header.trim()) return opts.header.trim();
  if (opts.query && opts.query.trim()) return opts.query.trim();
  if (opts.body && opts.body.trim()) return opts.body.trim();
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: u } = await client
        .from("User")
        .select("tenantid")
        .eq("authid", userId)
        .maybeSingle();
      if (u?.tenantid) return u.tenantid;
      const { data: u2 } = await client
        .from("users")
        .select("tenant_id")
        .eq("auth_id", userId)
        .maybeSingle();
      if ((u2 as any)?.tenant_id) return (u2 as any).tenant_id;
    }
  } catch {}
  return "1";
}

// Número consecutivo por tipo de nota: NC-XXXXXXXX / ND-XXXXXXXX
export async function nextNoteNumber(
  tenantId: string,
  noteType: NoteType
): Promise<string> {
  const prefix = noteType === "CREDIT" ? "NC" : "ND";
  let max = 0;
  try {
    const { data } = await (supabase as any)
      .from("InvoiceNote")
      .select("noteNumber")
      .eq("tenantId", tenantId)
      .ilike("noteNumber", `${prefix}-%`);
    for (const row of data || []) {
      const m = String(row.noteNumber || "").match(
        new RegExp(`^${prefix}-(\\d+)$`)
      );
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  } catch {
    // ante fallos del contador, seguir con la secuencia base
  }
  return `${prefix}-${String(max + 1).padStart(8, "0")}`;
}

export async function getNote(
  tenantId: string,
  id: string
): Promise<NoteWithInvoice | null> {
  const { data } = await (supabase as any)
    .from("InvoiceNote")
    .select("*")
    .eq("id", id)
    .eq("tenantId", tenantId)
    .maybeSingle();
  if (!data) return null;
  const invoice = await loadInvoiceRef(
    (data as any).originalInvoiceId as string | null
  );
  return { ...mapNote(data), invoice };
}

export async function listNotes(
  tenantId: string,
  opts: {
    noteType?: string | null;
    status?: string | null;
    from?: string | null;
    to?: string | null;
  } = {}
): Promise<NoteWithInvoice[]> {
  let query: any = (supabase as any)
    .from("InvoiceNote")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });

  if (opts.noteType && (opts.noteType === "CREDIT" || opts.noteType === "DEBIT")) {
    query = query.eq("noteType", opts.noteType);
  }
  if (opts.status && ["PENDING", "APPLIED", "CANCELLED"].includes(opts.status)) {
    query = query.eq("status", opts.status);
  }
  if (opts.from) query = query.gte("appliedDate", opts.from);
  if (opts.to) query = query.lte("appliedDate", opts.to);

  const { data } = await query;
  const rows: any[] = data || [];

  const invoiceIds = Array.from(
    new Set(
      rows
        .map((r: any) => r.originalInvoiceId)
        .filter((id: any): id is string => !!id)
    )
  );

  const invoiceMap = new Map<string, InvoiceRef>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await (supabase as any)
      .from("Invoice")
      .select("id, invoiceNumber, issueDate, customerName, customerRTN, total, cai")
      .in("id", invoiceIds);
    for (const inv of (invoices as any[]) || []) {
      invoiceMap.set(inv.id, {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || "",
        issueDate: inv.issueDate || null,
        customerName: inv.customerName || null,
        customerRTN: inv.customerRTN || null,
        total: Number(inv.total) || 0,
        cai: inv.cai || null,
      });
    }
  }

  return rows.map((r) => ({
    ...mapNote(r),
    invoice: r.originalInvoiceId ? invoiceMap.get(r.originalInvoiceId) || null : null,
  }));
}

function mapNote(row: any): NoteRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    originalInvoiceId: row.originalInvoiceId || null,
    noteType: row.noteType,
    noteNumber: row.noteNumber,
    reason: row.reason,
    amount: Number(row.amount) || 0,
    status: row.status,
    appliedDate: row.appliedDate || null,
    createdAt: row.createdAt,
    createdBy: row.createdBy || null,
  };
}

async function loadInvoiceRef(
  invoiceId: string | null
): Promise<InvoiceRef | null> {
  if (!invoiceId) return null;
  const { data } = await (supabase as any)
    .from("Invoice")
    .select("id, invoiceNumber, issueDate, customerName, customerRTN, total, cai")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    invoiceNumber: data.invoiceNumber || "",
    issueDate: data.issueDate || null,
    customerName: data.customerName || null,
    customerRTN: data.customerRTN || null,
    total: Number(data.total) || 0,
    cai: data.cai || null,
  };
}

export interface CreateNoteResult {
  data?: NoteWithInvoice;
  error?: string;
}

export async function createNote(
  tenantId: string,
  input: NoteInput
): Promise<CreateNoteResult> {
  if (!input.reason || !input.reason.trim()) {
    return { error: "El motivo de la nota es obligatorio" };
  }
  const amount = Number(input.amount) || 0;
  if (amount <= 0) {
    return { error: "El monto de la nota debe ser mayor a cero" };
  }
  const noteType: NoteType = input.noteType === "DEBIT" ? "DEBIT" : "CREDIT";
  const date = input.date || new Date().toISOString().split("T")[0];

  // Si se referencia una factura inexistente, se omite el vínculo (evita violación de FK)
  let originalInvoiceId: string | null = null;
  let invoiceRef: InvoiceRef | null = null;
  if (input.originalInvoiceId) {
    const { data: inv } = await (supabase as any)
      .from("Invoice")
      .select("id, invoiceNumber, issueDate, customerName, customerRTN, subtotal, tax, total, cai")
      .eq("id", input.originalInvoiceId)
      .maybeSingle();
    if (inv) {
      originalInvoiceId = inv.id;
      invoiceRef = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || "",
        issueDate: inv.issueDate || null,
        customerName: inv.customerName || null,
        customerRTN: inv.customerRTN || null,
        total: Number(inv.total) || 0,
        cai: inv.cai || null,
      };
    }
  }

  const noteNumber = await nextNoteNumber(tenantId, noteType);

  const { data, error } = await (supabase as any)
    .from("InvoiceNote")
    .insert({
      tenantId,
      originalInvoiceId,
      noteType,
      noteNumber,
      reason: input.reason.trim(),
      amount,
      status: "PENDING",
      appliedDate: date,
      createdBy: input.createdBy || null,
    })
    .select()
    .single();

  if (error || !data) {
    return {
      error: error?.message || "Error interno al crear la nota",
    };
  }

  const note: NoteWithInvoice = {
    ...mapNote(data),
    invoice: invoiceRef,
  };

  // Asiento contable (best effort, no bloquea la emisión de la nota)
  try {
    await postNoteJournal(tenantId, {
      note,
      customerName: input.customerName || null,
      invoiceNumber: input.invoiceNumber || null,
      paymentMethod: input.paymentMethod || "credit",
    });
  } catch (e) {
    console.error("Error creando asiento contable de la nota:", e);
  }

  return { data: note };
}

async function postNoteJournal(
  tenantId: string,
  opts: {
    note: NoteWithInvoice;
    customerName?: string | null;
    invoiceNumber?: string | null;
    paymentMethod?: string;
  }
) {
  const { note } = opts;
  const amountCents = roundCents(Math.max(0, note.amount));
  const counterPrefixes = opts.paymentMethod === "cash" ? ACCOUNT_PREFIXES.cash : ACCOUNT_PREFIXES.receivable;

  const [counterAccountId, salesAccountId, taxAccountId] = await Promise.all([
    resolveAccountId(tenantId, counterPrefixes),
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.sales),
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.isv),
  ]);

  if (!counterAccountId || !salesAccountId) {
    console.warn(
      `[notes-service] Cuentas contables no encontradas para tenant ${tenantId} (counter=${counterPrefixes[0]}, sales=${ACCOUNT_PREFIXES.sales[0]}). Asiento de nota omitido.`
    );
    return;
  }

  // División ISV 15% incluido: subTotal = monto / 1.15, impuesto = monto - subTotal
  const subCents = roundCents(note.amount / 1.15);
  const taxCents = amountCents - subCents;
  // Si no hay cuenta de ISV, el impuesto se acumula en Ventas para mantener el cuadre
  const salesWithTax = !taxAccountId ? subCents + taxCents : subCents;

  const entries: { accountId: string; amount: number; isDebit: boolean }[] = [];
  const push = (accountId: string, amount: number) => {
    if (amount === 0) return;
    entries.push({ accountId, amount, isDebit: amount > 0 });
  };

  if (note.noteType === "CREDIT") {
    push(salesAccountId, salesWithTax);
    if (taxAccountId) push(taxAccountId, taxCents);
    push(counterAccountId, -amountCents);
  } else {
    push(counterAccountId, amountCents);
    push(salesAccountId, -salesWithTax);
    if (taxAccountId) push(taxAccountId, -taxCents);
  }

  const balance = entries.reduce((sum, e) => sum + e.amount, 0);
  if (balance !== 0) {
    console.warn(`[notes-service] Asiento de nota desbalanceado (${balance}); se omite.`);
    return;
  }

  const date = note.appliedDate || new Date().toISOString().split("T")[0];
  const tipo = note.noteType === "CREDIT" ? "Crédito" : "Débito";
  const ref = opts.invoiceNumber || note.invoice?.invoiceNumber || "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/accounting/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    },
    body: JSON.stringify({
      description: `Nota de ${tipo} ${note.noteNumber}${
        ref ? ` - Factura ${ref}` : ""
      }`,
      currency: "HNL",
      date,
      voucherType: "AJUSTE",
      entries,
    }),
  });

  if (!response.ok) {
    console.error("Error creando asiento contable de la nota:", await response.text());
  }
}

export interface UpdateNoteResult {
  data?: NoteWithInvoice;
  error?: string;
}

export async function updateNoteStatus(
  tenantId: string,
  id: string,
  status: NoteStatus
): Promise<UpdateNoteResult> {
  if (!["PENDING", "APPLIED", "CANCELLED"].includes(status)) {
    return { error: "Estado inválido" };
  }
  const patch: any = { status };
  if (status === "APPLIED") {
    patch.appliedDate = new Date().toISOString().split("T")[0];
  }
  const { data, error } = await (supabase as any)
    .from("InvoiceNote")
    .update(patch)
    .eq("id", id)
    .eq("tenantId", tenantId)
    .select()
    .single();
  if (error || !data) {
    return { error: error?.message || "Error al actualizar la nota" };
  }
  const invoice = await loadInvoiceRef(data.originalInvoiceId as string | null);
  return { data: { ...mapNote(data), invoice } };
}
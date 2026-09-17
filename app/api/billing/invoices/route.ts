import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { resolveAccountId, ACCOUNT_PREFIXES } from "@/lib/accounting/resolve-account";

const LEGACY_STATUS: Record<string, string> = {
  PAID: "PAGADA",
  PENDING: "PENDIENTE",
  CANCELLED: "ANULADA",
  OVERDUE: "VENCIDA",
};

const CANONICAL_STATUS: Record<string, string> = {
  PAGADA: "PAID",
  PENDIENTE: "PENDING",
  ANULADA: "CANCELLED",
  VENCIDA: "OVERDUE",
};

async function getAuthTenantId(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const { data } = await (supabaseService as any)
      .from("User")
      .select("tenantid")
      .eq("authid", userId)
      .maybeSingle();
    if (data?.tenantid) return data.tenantid;
    const { data: u2 } = await (supabaseService as any)
      .from("users")
      .select("tenant_id")
      .eq("auth_id", userId)
      .maybeSingle();
    return (u2 as any)?.tenant_id || null;
  } catch {
    return null;
  }
}

async function postSalesJournal(params: {
  tenantId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}) {
  const { tenantId, invoiceNumber, date, customerName, paymentMethod, subtotalCents, taxCents, totalCents } = params;

  const counterPrefixes = paymentMethod === "cash" ? ACCOUNT_PREFIXES.cash : ACCOUNT_PREFIXES.receivable;
  const [counter, sales, tax] = await Promise.all([
    resolveAccountId(tenantId, counterPrefixes),
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.sales),
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.isv),
  ]);

  if (!counter || !sales) {
    console.warn(
      `[billing/invoices] Cuentas contables no encontradas para tenant ${tenantId} (counter=${counterPrefixes[0]}, sales=${ACCOUNT_PREFIXES.sales[0]}). Asiento omitido.`
    );
    return;
  }

  const entries: Array<{ accountId: string; amount: number; isDebit: boolean }> = [
    { accountId: counter, amount: totalCents, isDebit: true },
  ];

  if (taxCents !== 0 && tax) {
    entries.push({ accountId: tax, amount: -taxCents, isDebit: false });
    entries.push({ accountId: sales, amount: -subtotalCents, isDebit: false });
  } else {
    entries.push({ accountId: sales, amount: -(subtotalCents + taxCents), isDebit: false });
  }

  const balance = entries.reduce((sum, e) => sum + e.amount, 0);
  if (balance !== 0) {
    console.warn(`[billing/invoices] Asiento desbalanceado (${balance}); se omite.`);
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/accounting/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({
        description: `Factura ${invoiceNumber} - ${customerName}`,
        currency: "HNL",
        date,
        voucherType: "INGRESO",
        entries,
      }),
    });
    if (!response.ok) {
      console.error("[billing/invoices] Error asiento contable:", await response.text());
    }
  } catch (error: any) {
    console.error("[billing/invoices] Error de red en asiento contable:", error?.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json();

    let tenantId: string | null = invoiceData.tenantId || null;
    if (!tenantId) tenantId = await getAuthTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido", details: "No se pudo determinar el tenant de la factura" },
        { status: 400 }
      );
    }

    const { data: tenant } = await (supabaseService as any)
      .from("Tenant")
      .select("businessname,businessrtn,businessaddress")
      .eq("id", tenantId)
      .maybeSingle();

    // Número de factura: si ya existe (global unique), generar el siguiente de la serie
    let invoiceNumber: string = invoiceData.invoiceNumber || `FAC-${Date.now()}`;
    const { data: existing } = await (supabaseService as any)
      .from("Invoice")
      .select("id")
      .eq("invoiceNumber", invoiceNumber)
      .maybeSingle();
    if (existing) {
      const parts = invoiceNumber.split("-");
      const base = parts.slice(0, 3).join("-");
      const { data: maxRows } = await (supabaseService as any)
        .from("Invoice")
        .select("invoiceNumber")
        .ilike("invoiceNumber", `${base}-%`)
        .order("invoiceNumber", { ascending: false })
        .limit(1);
      const last = maxRows?.[0]?.invoiceNumber as string | undefined;
      let nextSeq = 1;
      if (last) {
        nextSeq = parseInt(last.split("-")[3] || "0", 10) + 1;
      }
      invoiceNumber = `${base}-${String(nextSeq).padStart(8, "0")}`;
    }

    const now = new Date();
    const issueDate = (invoiceData.date ? new Date(invoiceData.date) : now).toISOString().slice(0, 10);
    const subtotal = Number(invoiceData.totals?.subtotal || 0);
    const tax = Number(invoiceData.totals?.tax15 || 0) + Number(invoiceData.totals?.tax18 || 0);
    const total = Number(invoiceData.totals?.total || 0);
    const id = randomUUID();

    const { data: invoice, error: invoiceError } = await (supabaseService as any)
      .from("Invoice")
      .insert({
        id,
        tenantId,
        invoiceNumber,
        invoiceType: "CUSTOMER",
        status: "PAID",
        customerName: invoiceData.customer?.name || "Consumidor Final",
        customerRTN: String(invoiceData.customer?.rtn || "").slice(0, 20),
        customerEmail: null,
        customerAddress: null,
        issuerName: tenant?.businessname || "Emisor",
        issuerRTN: String(tenant?.businessrtn || "").slice(0, 20),
        issuerAddress: tenant?.businessaddress || null,
        issueDate,
        dueDate: issueDate,
        cai: invoiceData.cai || null,
        subtotal,
        tax,
        total,
        currency: "HNL",
        taxRate: 15,
        notes: invoiceData.paymentReference || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { error: "Error creating invoice", details: invoiceError.message, code: invoiceError.code, hint: invoiceError.hint },
        { status: 500 }
      );
    }

    const itemsPayload = (invoiceData.items || [])
      .filter((item: any) => item && (item.name || item.code))
      .map((item: any) => ({
        id: randomUUID(),
        invoiceId: id,
        description: item.name || item.code || "Item",
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        taxRate: Number(item.taxRate ?? 15),
        taxAmount: Number(item.taxAmount || 0),
        isTaxable: (item.taxRate ?? 15) > 0,
        productCode: item.code || null,
        serviceCode: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));

    if (itemsPayload.length > 0) {
      const { error: itemsError } = await (supabaseService as any).from("InvoiceItem").insert(itemsPayload);
      if (itemsError) {
        console.error("Error creating invoice items:", itemsError);
        await (supabaseService as any).from("Invoice").delete().eq("id", id);
        return NextResponse.json(
          { error: "Error creating invoice items", details: itemsError.message, code: itemsError.code, hint: itemsError.hint },
          { status: 500 }
        );
      }
    }

    // Actualizar el correlativo del CAI (por tenant)
    if (invoiceData.cai) {
      const nextNumber = parseInt(invoiceNumber.split("-")[3] || "0", 10) + 1;
      await (supabaseService as any)
        .from("cai")
        .update({ current_number: nextNumber })
        .eq("cai", invoiceData.cai)
        .eq("tenant_id", tenantId);
    }

    // Asiento contable automático (best-effort, no bloquea la emisión)
    await postSalesJournal({
      tenantId,
      invoiceNumber,
      date: issueDate,
      customerName: invoiceData.customer?.name || "Consumidor Final",
      paymentMethod: invoiceData.paymentMethod || "cash",
      subtotalCents: Math.round(subtotal * 100),
      taxCents: Math.round(tax * 100),
      totalCents: Math.round(total * 100),
    });

    return NextResponse.json({ success: true, invoice, message: "Factura emitida exitosamente" });
  } catch (error: any) {
    console.error("=== ERROR IN INVOICE POST ===", error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const limitParam = searchParams.get("limit");

    const tenantId = searchParams.get("tenantId") || (await getAuthTenantId());
    if (!tenantId) return NextResponse.json([]);

    let query = (supabaseService as any)
      .from("Invoice")
      .select("*")
      .eq("tenantId", tenantId)
      .order("issueDate", { ascending: false });

    if (typeParam) query = query.eq("invoiceType", typeParam);
    if (startDate) query = query.gte("issueDate", startDate);
    if (endDate) query = query.lte("issueDate", endDate);
    if (statusParam) query = query.eq("status", CANONICAL_STATUS[statusParam] || statusParam);
    if (limitParam) query = query.limit(parseInt(limitParam, 10));

    const { data: invoices, error } = await query;
    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json([]);
    }

    const ids = (invoices || []).map((i: any) => i.id);
    let items: any[] = [];
    if (ids.length > 0) {
      const { data: itemsData } = await (supabaseService as any)
        .from("InvoiceItem")
        .select("*")
        .in("invoiceId", ids);
      items = itemsData || [];
    }

    const formatted = (invoices || []).map((inv: any) => {
      const invoiceItems = items
        .filter((it) => it.invoiceId === inv.id)
        .map((it) => ({
          ...it,
          product_code: it.productCode,
          product_name: it.description,
          unit_price: it.unitPrice,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          subtotal: it.total,
        }));

      const status =
        inv.invoiceType === "CUSTOMER"
          ? LEGACY_STATUS[inv.status] || inv.status
          : inv.status;

      return {
        ...inv,
        invoice_number: inv.invoiceNumber,
        customer_name: inv.customerName,
        customer_rtn: inv.customerRTN,
        customer_email: inv.customerEmail,
        date: inv.issueDate,
        due_date: inv.dueDate,
        tax_15: inv.tax,
        tax_18: 0,
        status_code: inv.status,
        status,
        InvoiceItem: invoiceItems,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error in invoice GET route:", error);
    return NextResponse.json([]);
  }
}

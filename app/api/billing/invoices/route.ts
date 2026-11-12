import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { resolveAccountId, ACCOUNT_PREFIXES } from "@/lib/accounting/resolve-account";
import {
  reserveInvoiceNumber,
  isInvoiceNumberTaken,
  ExhaustedCaiError,
} from "@/lib/billing/invoice-number";
import { checkSaleStock, applySaleStock } from "@/lib/services/stock-sale";

// Intentos de emision cuando el numero pedido choca con uno existente. Sin CAI
// no hay fila que reservar, asi que el unico candado es el UNIQUE de la BD: cuando
// dos cajas emiten a la vez, la que pierde reintenta esperando a que la factura
// de la otra sea visible.
const MAX_INTENTOS_NUMERO = 8;
const ESPERA_REINTENTO_MS = 50;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    // Validar lineas ANTES de crear la factura. El POS filtra distinto
    // ("name && total > 0") que esta ruta ("name || code"), asi que se podia
    // emitir una factura con totales y cero lineas: la 001-01-01-00000007 tiene
    // subtotal 40 y ningun InvoiceItem.
    const rawItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const validItems = rawItems.filter(
      (item: any) => item && (item.name || item.code) && Number(item.total || 0) > 0
    );
    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "La factura no tiene lineas validas. Agrega al menos un producto o servicio con monto mayor a cero." },
        { status: 400 }
      );
    }

    // Inventario: se comprueba ANTES de crear la factura. Si falta stock se
    // responde 400 y no queda nada que revertir.
    const saleLines = validItems.map((item: any) => ({
      productId: item.productId || null,
      description: String(item.name || item.code || "Item"),
      code: item.code || null,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));
    const shortages = await checkSaleStock(tenantId, saleLines);
    if (shortages.length > 0) {
      return NextResponse.json(
        {
          error: "No hay stock suficiente para emitir la factura",
          shortages: shortages.map((s) => `${s.code} ${s.name}: pide ${s.requested}, hay ${s.available}`),
        },
        { status: 400 }
      );
    }

    const { data: tenant } = await (supabaseService as any)
      .from("Tenant")
      .select("businessname,businessrtn,businessaddress")
      .eq("id", tenantId)
      .maybeSingle();

    // El correlativo lo decide el servidor: el POS mandaba el suyo, derivado de
    // un CAI que sin fila nunca avanzaba, asi que una empresa con facturas
    // 00000006..00000008 emitia 00000001 una y otra vez. La busqueda tambien
    // era global, no por empresa. Ver lib/billing/invoice-number.ts.
    //
    // `Invoice_invoiceNumber_key` es UNIQUE **global** (no por empresa), asi que
    // el numero tambien puede estar ocupado por otra companyia. Por eso el
    // insert va en reintentos: si la BD lo rechaza con 23505 se pide el
    // siguiente correlativo en vez de fallar la emision.
    const now = new Date();
    const issueDate = (invoiceData.date ? new Date(invoiceData.date) : now).toISOString().slice(0, 10);
    const subtotal = Number(invoiceData.totals?.subtotal || 0);
    const tax = Number(invoiceData.totals?.tax15 || 0) + Number(invoiceData.totals?.tax18 || 0);
    const total = Number(invoiceData.totals?.total || 0);

    let invoice: any = null;
    let invoiceNumber = "";
    let reservado: Awaited<ReturnType<typeof reserveInvoiceNumber>> | null = null;
    // Suelo del correlativo: si el numero choca con el UNIQUE global lo sube
    // para no volver a proponer el mismo. Ver reserveInvoiceNumber.
    let suelo = 0;

    for (let intento = 1; intento <= MAX_INTENTOS_NUMERO; intento++) {
      try {
        reservado = await reserveInvoiceNumber(tenantId, { suelo });
      } catch (error: any) {
        if (error instanceof ExhaustedCaiError) {
          return NextResponse.json({ error: error.message, code: "CAI_AGOTADO" }, { status: 400 });
        }
        throw error;
      }
      invoiceNumber = reservado.invoiceNumber;

      if (invoiceData.invoiceNumber && intento === 1 && invoiceData.invoiceNumber !== invoiceNumber) {
        console.warn(
          `[billing/invoices] El cliente propuso ${invoiceData.invoiceNumber}; se usa el correlativo del servidor ${invoiceNumber}.`
        );
      }

      // Si esta empresa ya tiene ese numero no es un conflicto de la serie: el
      // numero lo elige el servidor, asi que solo puede ser otra emision que
      // se llevo este correlativo a la vez. Se reintenta con el siguiente.
      if (await isInvoiceNumberTaken(tenantId, invoiceNumber)) {
        console.warn(
          `[billing/invoices] ${invoiceNumber} ya fue emitido por esta empresa; se reintenta con el siguiente (intento ${intento}).`
        );
        suelo = Math.max(suelo, reservado.correlativo + 1);
        await sleep(ESPERA_REINTENTO_MS);
        continue;
      }

      const { data, error } = await (supabaseService as any)
        .from("Invoice")
        .insert({
          id: randomUUID(),
          tenantId,
          invoiceNumber,
          invoiceType: "CUSTOMER",
          status: "PAID",
          customerName: invoiceData.customer?.name || "Consumidor Final",
          customerRTN: String(invoiceData.customer?.rtn || "").slice(0, 20),
          customerEmail: (() => {
            const e = String(invoiceData.customer?.email || "").trim();
            return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
          })(),
          customerAddress: null,
          issuerName: tenant?.businessname || "Emisor",
          issuerRTN: String(tenant?.businessrtn || "").slice(0, 20),
          issuerAddress: tenant?.businessaddress || null,
          issueDate,
          dueDate: issueDate,
          // El CAI lo elige el servidor junto con el correlativo; antes se
          // guardaba el que propuso el cliente, que podia no ser el vigente.
          cai: reservado.caiCode || null,
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

      if (!error) {
        invoice = data;
        break;
      }

      // 23505 = el numero ya existe (otra empresa o emision simultanea). Se pide
      // el siguiente; cualquier otro error es real y se propaga. El `suelo` es
      // imprescindible cuando el choque es con OTRA empresa: la serie propia
      // (que solo mira las facturas de este tenant) volveria a proponer el
      // mismo numero indefinidamente.
      if (error.code === "23505") {
        console.warn(
          `[billing/invoices] ${invoiceNumber} ya existe; se reintenta con el siguiente correlativo (intento ${intento}).`
        );
        suelo = Math.max(suelo, reservado.correlativo + 1);
        await sleep(ESPERA_REINTENTO_MS);
        continue;
      }

      console.error("Error creating invoice:", error);
      return NextResponse.json(
        { error: "Error creating invoice", details: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        {
          error:
            "No se pudo asignar un numero de factura libre tras varios intentos. Reintenta la emision.",
        },
        { status: 409 }
      );
    }


    const itemsPayload = validItems.map((item: any) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const taxRate = Number(item.taxRate ?? 15);
      // El POS no manda taxAmount, asi que antes se guardaba siempre 0 aunque
      // la factura si cobrara el impuesto.
      const taxAmount = Number(item.taxAmount ?? 0) || (taxRate > 0 ? unitPrice * quantity * (taxRate / 100) : 0);
      return {
        id: randomUUID(),
        // `invoice.id`, no el `id` local: en un reintento por colision de
        // numero la factura se inserto con otro id.
        invoiceId: invoice.id,
        description: item.name || item.code || "Item",
        quantity,
        unitPrice,
        total: Number(item.total || 0),
        taxRate,
        taxAmount,
        isTaxable: taxRate > 0,
        // Vinculo real con el inventario (columna de 021_invoiceitem_product_id.sql).
        product_id: item.productId || null,
        productCode: item.code || null,
        serviceCode: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    });

    {
      let { error: itemsError } = await (supabaseService as any).from("InvoiceItem").insert(itemsPayload);
      // Si la migracion 021 todavia no se aplico, PostgREST rechaza la columna.
      // Se reintenta sin product_id para no bloquear la emision.
      if (itemsError && /product_id|column|schema/i.test(itemsError.message || "")) {
        console.warn("[billing/invoices] product_id no disponible, reintentando sin la columna:", itemsError.message);
        ({ error: itemsError } = await (supabaseService as any)
          .from("InvoiceItem")
          .insert(itemsPayload.map(({ product_id, ...rest }: Record<string, unknown>) => rest)));
      }
      if (itemsError) {
        console.error("Error creating invoice items:", itemsError);
        await (supabaseService as any).from("Invoice").delete().eq("id", invoice.id);
        return NextResponse.json(
          { error: "Error creating invoice items", details: itemsError.message, code: itemsError.code, hint: itemsError.hint },
          { status: 500 }
        );
      }
    }

    // Inventario: descuento con movimientos. Si falla, se revierte (dentro de
    // applySaleStock) y se borra la factura, para no dejar stock descontado
    // sin venta.
    const stockResult = await applySaleStock({
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber,
      lines: saleLines,
    });
    if (stockResult.shortages.length > 0 || stockResult.errors.length > 0) {
      console.error("[billing/invoices] No se pudo descontar inventario:", {
        invoiceNumber,
        shortages: stockResult.shortages,
        errors: stockResult.errors,
      });
      await (supabaseService as any).from("InvoiceItem").delete().eq("invoiceId", invoice.id);
      await (supabaseService as any).from("Invoice").delete().eq("id", invoice.id);
      return NextResponse.json(
        {
          error: "No se pudo descontar el inventario; la factura no se emitio",
          shortages: stockResult.shortages.map(
            (s) => `${s.code} ${s.name}: pide ${s.requested}, hay ${s.available}`
          ),
          details: stockResult.errors,
        },
        { status: stockResult.shortages.length > 0 ? 400 : 500 }
      );
    }

    // El correlativo del CAI ya lo reservo `reserveInvoiceNumber` antes de
    // insertar. Este bloque solo decia `cai.current_number` leyendo el numero
    // que mandaba el cliente, lo que hacia retroceder el contador cuando el
    // POS iba atras.

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

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant as resolveTenantDelRequest } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { resolveAccountId, ACCOUNT_PREFIXES } from "@/lib/accounting/resolve-account";

export const dynamic = "force-dynamic";

// La tabla real es `paymentlink` (no `PaymentLink`) y su columna de empresa es
// `tenant_id`. `paymentlink.invoice_id` es un UUID sin FK a `Invoice`, asi que
// no hay embed posible: la factura se busca aparte. `Invoice` es la tabla de
// Prisma, en camelCase (`invoiceNumber`, `customerName`, `tenantId`).
// El tenant sale del header de sesion (`x-tenant-id`, lo inyecta middleware.ts),
// NO de `?companyId`: ese parametro lo manda el cliente y antes ganaba al header,
// asi que cualquier usuario autenticado podia leer y escribir los datos de otra
// empresa con `?companyId=ANGELOH7`. Ademas `?companyId` es un companies.id, no el
// tenant_id que guardan las tablas, y sin traducir daba cero filas.
// Ver lib/tenant-resolver.ts.
async function resolveTenant(request: NextRequest): Promise<string | null> {
  return resolveTenantDelRequest(request);
}

/**
 * Asiento de cobro: debito caja, credito cuentas por cobrar. Es best-effort
 * (mismo criterio que `app/api/billing/invoices/route.ts`): si el catalogo de
 * cuentas del tenant no tiene 1101/1103 se omite y se avisa, sin tumbar la
 * subida del comprobante.
 */
async function postPaymentJournal(
  tenantId: string,
  invoiceNumber: string,
  customerName: string,
  total: number
) {
  const [cash, receivable] = await Promise.all([
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.cash),
    resolveAccountId(tenantId, ACCOUNT_PREFIXES.receivable),
  ]);
  if (!cash || !receivable) {
    console.warn(
      `[billing/payment-receipts] Cuentas 1101/1103 no encontradas para ${tenantId}; asiento de cobro omitido.`
    );
    return;
  }
  if (!(total > 0)) return;

  // El servicio espera importes con signo (debeito positivo, credito negativo).
  const entries = [
    { accountId: cash, amount: total, isDebit: true },
    { accountId: receivable, amount: -total, isDebit: false },
  ];
  if (entries.reduce((sum, e) => sum + e.amount, 0) !== 0) {
    console.warn(`[billing/payment-receipts] Asiento de cobro desbalanceado; se omite.`);
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const response = await fetch(
      `${baseUrl}/api/accounting/transactions?tenantId=${encodeURIComponent(tenantId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          description: `Cobro de factura ${invoiceNumber} - ${customerName}`,
          currency: "HNL",
          date: new Date().toISOString().split("T")[0],
          voucherType: "INGRESO",
          entries,
        }),
      }
    );
    if (!response.ok) {
      console.error("[billing/payment-receipts] Error asiento de cobro:", await response.text());
    }
  } catch (error: any) {
    console.error("[billing/payment-receipts] Error de red en asiento de cobro:", error?.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const receipt = formData.get("receipt") as File;
    const paymentLinkId = formData.get("paymentLinkId") as string;

    if (!receipt || !paymentLinkId) {
      return NextResponse.json(
        { error: "Missing receipt file or payment link ID" },
        { status: 400 }
      );
    }

    const tenantId = await resolveTenant(request) || (formData.get("companyId") as string | null);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // El enlace se filtra por id **y** por tenant: antes el update era solo por
    // id, asi que una empresa podia completar el enlace de pago de otra.
    const { data: link, error: linkError } = await (supabase as any)
      .from("paymentlink")
      .select("id, invoice_id, invoice_number, tenant_id")
      .eq("id", paymentLinkId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (linkError) {
      console.error("Error reading payment link:", linkError);
      return NextResponse.json(
        { error: "Error reading payment link" },
        { status: 500 }
      );
    }
    if (!link) {
      return NextResponse.json(
        { error: "Enlace de pago no encontrado" },
        { status: 404 }
      );
    }

    // Se sube despues de validar el enlace para no dejar archivos huerfanos
    // cuando el id no pertenece a la empresa. El prefijo por tenant mantiene
    // el bucket separado igual que company-logos.
    const ext = receipt.name.split(".").pop() || "bin";
    const fileName = `${tenantId}/receipt-${paymentLinkId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(fileName, receipt);

    if (uploadError) {
      console.error("Error uploading receipt:", uploadError);
      return NextResponse.json(
        { error: "Error uploading receipt" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("payment-receipts")
      .getPublicUrl(fileName);

    const { error: updateError } = await (supabase as any)
      .from("paymentlink")
      .update({
        status: "completed",
        receipt_url: urlData.publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", paymentLinkId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("Error updating payment link:", updateError);
      return NextResponse.json(
        { error: "Error updating payment link" },
        { status: 500 }
      );
    }

    // La factura se busca por `invoice_id` (sin FK, sin embed) y solo si es de
    // esta misma empresa. `PAGADA` no existe: el vocabulario real es
    // PAID/PENDING/CANCELLED/OVERDUE.
    let invoice: any = null;
    if (link.invoice_id) {
      const { data: found } = await (supabase as any)
        .from("Invoice")
        .select("id, invoiceNumber, customerName, total, status, tenantId")
        .eq("id", link.invoice_id)
        .eq("tenantId", tenantId)
        .maybeSingle();

      if (found) {
        invoice = found;
        if (found.status !== "PAID") {
          await (supabase as any)
            .from("Invoice")
            .update({ status: "PAID", updatedAt: new Date().toISOString() })
            .eq("id", found.id)
            .eq("tenantId", tenantId);
        }
      } else {
        console.warn(
          `[billing/payment-receipts] La factura ${link.invoice_id} no pertenece al tenant ${tenantId}; no se toca.`
        );
      }
    }

    if (invoice) {
      await postPaymentJournal(tenantId, invoice.invoiceNumber, invoice.customerName, Number(invoice.total));
    }

    return NextResponse.json({
      success: true,
      receiptUrl: urlData.publicUrl,
      paymentStatus: "completed",
    });
  } catch (error) {
    console.error("Error in payment receipts POST route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentLinkId = searchParams.get("paymentLinkId");

    const tenantId = await resolveTenant(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // `paymentlink` no tiene relacion declarada con `bankaccount`, asi que el
    // embed se resuelve con una segunda consulta.
    let query = (supabase as any)
      .from("paymentlink")
      .select("*")
      .eq("tenant_id", tenantId);

    if (paymentLinkId) {
      query = query.eq("id", paymentLinkId);
    }

    const { data: links, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment receipts:", error);
      return NextResponse.json({ error: "Error fetching payment receipts" }, { status: 500 });
    }

    const bankIds = [...new Set((links || []).map((l: any) => l.bank_account_id).filter(Boolean))];
    let bankById: Record<string, any> = {};
    if (bankIds.length > 0) {
      const { data: banks } = await (supabase as any)
        .from("bankaccount")
        .select("id, bank_name, account_number, account_type, account_holder, currency")
        .in("id", bankIds)
        .eq("tenant_id", tenantId);
      for (const b of banks || []) bankById[b.id] = b;
    }

    const receipts = (links || []).map((l: any) => ({
      ...l,
      BankAccount: l.bank_account_id ? bankById[l.bank_account_id] || null : null,
    }));

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Error in payment receipts GET route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

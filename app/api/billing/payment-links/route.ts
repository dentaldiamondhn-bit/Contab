import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// La tabla real es `paymentlink` (PostgREST no encuentra `PaymentLink`) y tiene
// `company_id` (migracion 023). La empresa sale del contexto validado
// (`contextoDeEmpresa`: `?companyId` o el header `x-company-id`), NUNCA solo del
// tenant: `TEST1DS` tiene dos empresas y filtrar por `tenant_id` las mezclaba.
// Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.

// Estados canonicos de Invoice (ver app/api/billing/invoices/route.ts):
// PAID / PENDING / CANCELLED / OVERDUE. 'PENDING_PAYMENT' no existe.
const CLOSED_STATUSES = ["PAID", "CANCELLED"];

export async function POST(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { invoiceId, invoiceNumber, amount, currency, bankAccountId, paymentUrl, qrCode } =
      await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Falta la factura" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // La factura tiene que ser de esta empresa: antes se aceptaba cualquier
    // invoiceId y ademas el update de la factura no filtraba por empresa.
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from("Invoice")
      .select("id, invoiceNumber, tenantId, status, total")
      .eq("id", invoiceId)
      .eq("company_id", empresa.companyId)
      .maybeSingle();

    if (invoiceError) {
      console.error("Error reading invoice:", invoiceError);
      return NextResponse.json({ error: "Error reading invoice" }, { status: 500 });
    }
    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    // Los montos van en lempiras, igual que Invoice.total. El *100 de antes
    // guardaba 100x y el GET lo dividia, lo que rompia cualquier otro consumidor.
    const { data: paymentLink, error } = await (supabase as any)
      .from("paymentlink")
      .insert({
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId,
        invoice_id: invoiceId,
        invoice_number: invoiceNumber || invoice.invoiceNumber,
        amount: Number(amount ?? invoice.total ?? 0),
        currency: currency || "HNL",
        bank_account_id: bankAccountId || null,
        payment_url: paymentUrl || null,
        qr_code: qrCode || null,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating payment link:", error);
      return NextResponse.json(
        { error: "Error creating payment link" },
        { status: 500 }
      );
    }

    // La factura pasa a PENDIENTE, salvo que ya este cerrada. El POS marca
    // todo como PAID al emitir, y rebajar una factura cobrada a "pendiente"
    // falsearia los ingresos; por eso se respeta el estado previo.
    if (!CLOSED_STATUSES.includes(invoice.status)) {
      await (supabase as any)
        .from("Invoice")
        .update({ status: "PENDING", updatedAt: new Date().toISOString() })
        .eq("id", invoiceId)
        .eq("company_id", empresa.companyId);
    } else {
      console.warn(
        `[billing/payment-links] Factura ${invoice.invoiceNumber} en estado ${invoice.status}; se deja como esta.`
      );
    }

    let bankAccount = null;
    if (paymentLink.bank_account_id) {
      const { data: bank } = await (supabase as any)
        .from("bankaccount")
        .select("id, bank_name, account_number, account_type, account_holder, currency")
        .eq("id", paymentLink.bank_account_id)
        .eq("company_id", empresa.companyId)
        .maybeSingle();
      bankAccount = bank || null;
    }

    return NextResponse.json({
      id: paymentLink.id,
      invoiceNumber: paymentLink.invoice_number,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      bankAccount,
      paymentUrl: paymentLink.payment_url,
      qrCode: paymentLink.qr_code,
      status: paymentLink.status,
      createdAt: paymentLink.created_at,
      expiresAt: paymentLink.expires_at,
    });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in payment links POST route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    const supabase = getSupabaseServer();

    // `paymentlink` no tiene relacion declarada con `bankaccount`, asi que el
    // embed se resuelve con una segunda consulta en vez del select anidado.
    let query = (supabase as any)
      .from("paymentlink")
      .select("*")
      .eq("company_id", empresa.companyId);

    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }

    const { data: paymentLinks, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment links:", error);
      return NextResponse.json(
        { error: "Error fetching payment links" },
        { status: 500 }
      );
    }

    const bankIds = [
      ...new Set((paymentLinks || []).map((l: any) => l.bank_account_id).filter(Boolean)),
    ];
    let bankById: Record<string, any> = {};
    if (bankIds.length > 0) {
      const { data: banks } = await (supabase as any)
        .from("bankaccount")
        .select("id, bank_name, account_number, account_type, account_holder, currency")
        .in("id", bankIds)
        .eq("company_id", empresa.companyId);
      for (const b of banks || []) bankById[b.id] = b;
    }

    const links = (paymentLinks || []).map((link: any) => ({
      ...link,
      amount: link.amount,
      BankAccount: link.bank_account_id ? bankById[link.bank_account_id] || null : null,
    }));

    return NextResponse.json(links);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in payment links GET route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

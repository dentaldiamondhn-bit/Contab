import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

// `journal_entry_reversals` no tiene `company_id` (es hija por padre, ver 038):
// solo se aisla por tenant. `Transaction` y `JournalEntry` si tienen
// `company_id`, asi que se filtran por empresa. El contexto se valida contra la
// sesion para que `?tenantId` ya no permita tocar otra empresa.
async function contextoDeReversiones(request: NextRequest) {
  const empresa = await contextoDeEmpresa(request);
  if (!empresa.tenantId) throw new Error("La empresa no tiene tenant asociado");
  return {
    tenantId: empresa.tenantId as string,
    scope: filtroEmpresaOCompany(empresa),
    companyId: empresa.companyId,
  };
}

// GET - Listar reversiones
export async function GET(request: NextRequest) {
  try {
    const { tenantId, scope } = await contextoDeReversiones(request);

    const { data, error } = await supabaseService
      .from("journal_entry_reversals")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enriquecer con datos de la transacción original (acotado a empresa)
    const enriched = await Promise.all(
      (data || []).map(async (rev: any) => {
        const { data: originalTx } = await supabaseService
          .from("Transaction")
          .select("id, description, date, voucherType, voucherNumber, totalAmount")
          .eq("id", rev.original_transaction_id)
          .match(scope)
          .single();

        let reversalTx = null;
        if (rev.reversal_transaction_id) {
          const { data: rtx } = await supabaseService
            .from("Transaction")
            .select("id, description, date, voucherType, voucherNumber, totalAmount")
            .eq("id", rev.reversal_transaction_id)
            .match(scope)
            .single();
          reversalTx = rtx;
        }

        return { ...rev, originalTransaction: originalTx, reversalTransaction: reversalTx };
      })
    );

    return NextResponse.json(enriched);
  } catch (e: any) {
    const respuesta = respuestaDeErrorDeEmpresa(e);
    if (respuesta) return respuesta;
    console.error("GET reversals error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - Crear reversión
export async function POST(request: NextRequest) {
  try {
    const { tenantId, scope, companyId } = await contextoDeReversiones(request);

    const body = await request.json();
    const { transactionId, reason, reversedBy, notes } = body;

    if (!transactionId || !reason || !reversedBy) {
      return NextResponse.json({ error: "transactionId, reason y reversedBy son requeridos" }, { status: 400 });
    }

    // Verificar que la transacción existe Y es de esta empresa (antes era IDOR:
    // se podia revertir la transaccion de otra empresa adivinando su id).
    const { data: originalTx, error: txError } = await supabaseService
      .from("Transaction")
      .select("*, JournalEntry(*)")
      .eq("id", transactionId)
      .match(scope)
      .single();

    if (txError || !originalTx) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    // Verificar que no esté ya revertida
    const { data: existingReversal } = await supabaseService
      .from("journal_entry_reversals")
      .select("id")
      .eq("original_transaction_id", transactionId)
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .maybeSingle();

    if (existingReversal) {
      return NextResponse.json({ error: "Esta transacción ya fue revertida" }, { status: 400 });
    }

    const entries = originalTx.JournalEntry || originalTx.journal_entry || [];

    // Crear transacción de reversión (signos invertidos)
    const reversalEntries = entries.map((e: any) => ({
      accountId: e.accountId || e.account_id,
      amount: -Number(e.amount),
      isDebit: Number(e.amount) < 0,
      description: `Reversión: ${e.description || originalTx.description}`,
    }));

    const today = new Date().toISOString().split("T")[0];

    const reversalTxId = crypto.randomUUID();

    // Obtener siguiente número de comprobante (acotado a empresa/tenant)
    const { data: lastVoucher } = await supabaseService
      .from("Transaction")
      .select("voucherNumber")
      .match(scope)
      .eq("voucherType", originalTx.voucherType || originalTx.voucher_type || "EGRESO")
      .order("voucherNumber", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVoucherNumber = ((lastVoucher as any)?.voucherNumber || 0) + 1;

    const { data: reversalTx, error: revTxError } = await supabaseService
      .from("Transaction")
      .insert({
        id: reversalTxId,
        voucherNumber: nextVoucherNumber,
        description: `REVERSIÓN: ${originalTx.description || originalTx.voucherNumber}`,
        date: today,
        voucherType: originalTx.voucherType || originalTx.voucher_type,
        tenantId: tenantId,
        company_id: companyId,
        currency: originalTx.currency || "HNL",
        exchangeRate: originalTx.exchangeRate || 24.7,
        totalAmount: originalTx.totalAmount ? -Number(originalTx.totalAmount) : 0,
        functionalAmount: originalTx.totalAmount ? -Number(originalTx.totalAmount) : 0,
        originalTotal: originalTx.totalAmount ? -Number(originalTx.totalAmount) : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (revTxError) throw revTxError;

    // Crear JournalEntry invertidos
    for (const entry of reversalEntries) {
      await supabaseService.from("JournalEntry").insert({
        id: crypto.randomUUID(),
        transactionId: reversalTx.id,
        accountId: entry.accountId,
        tenantId: tenantId,
        company_id: companyId,
        amount: entry.amount,
        originalAmount: Math.abs(entry.amount),
        currency: originalTx.currency || "HNL",
        exchangeRate: originalTx.exchangeRate || 24.7,
        description: entry.description,
      });
    }

    // Registrar la reversión
    const { data: reversal, error: revError } = await supabaseService
      .from("journal_entry_reversals")
      .insert({
        tenant_id: tenantId,
        original_transaction_id: transactionId,
        reversal_transaction_id: reversalTx.id,
        reason,
        reversed_by: reversedBy,
        status: "completed",
        notes,
      })
      .select()
      .single();

    if (revError) throw revError;

    return NextResponse.json(reversal, { status: 201 });
  } catch (e: any) {
    const respuesta = respuestaDeErrorDeEmpresa(e);
    if (respuesta) return respuesta;
    console.error("POST reversal error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Actualizar estado de reversión
export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await contextoDeReversiones(request);

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { data, error } = await supabaseService
      .from("journal_entry_reversals")
      .update({ status, notes })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    const respuesta = respuestaDeErrorDeEmpresa(e);
    if (respuesta) return respuesta;
    console.error("PUT reversal error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

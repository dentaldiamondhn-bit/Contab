import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") ||
    new URL(request.url).searchParams.get("tenantId");
}

// GET - Listar reversiones
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const { data, error } = await supabaseService
      .from("journal_entry_reversals")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enriquecer con datos de la transacción original
    const enriched = await Promise.all(
      (data || []).map(async (rev: any) => {
        const { data: originalTx } = await supabaseService
          .from("Transaction")
          .select("id, description, date, voucherType, voucherNumber, totalAmount")
          .eq("id", rev.original_transaction_id)
          .single();

        let reversalTx = null;
        if (rev.reversal_transaction_id) {
          const { data: rtx } = await supabaseService
            .from("Transaction")
            .select("id, description, date, voucherType, voucherNumber, totalAmount")
            .eq("id", rev.reversal_transaction_id)
            .single();
          reversalTx = rtx;
        }

        return { ...rev, originalTransaction: originalTx, reversalTransaction: reversalTx };
      })
    );

    return NextResponse.json(enriched);
  } catch (e: any) {
    console.error("GET reversals error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - Crear reversión
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const { transactionId, reason, reversedBy, notes } = body;

    if (!transactionId || !reason || !reversedBy) {
      return NextResponse.json({ error: "transactionId, reason y reversedBy son requeridos" }, { status: 400 });
    }

    // Verificar que la transacción existe
    const { data: originalTx, error: txError } = await supabaseService
      .from("Transaction")
      .select("*, JournalEntry(*)")
      .eq("id", transactionId)
      .single();

    if (txError || !originalTx) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    // Verificar que no esté ya revertida
    const { data: existingReversal } = await supabaseService
      .from("journal_entry_reversals")
      .select("id")
      .eq("original_transaction_id", transactionId)
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

    // Obtener siguiente número de comprobante
    const { data: lastVoucher } = await supabaseService
      .from("Transaction")
      .select("voucherNumber")
      .eq("tenantId", tenantId)
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
    console.error("POST reversal error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Actualizar estado de reversión
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

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
    console.error("PUT reversal error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

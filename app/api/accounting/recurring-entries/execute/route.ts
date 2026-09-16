import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

// POST - Ejecutar un asiento recurrente manualmente
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
      new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "recurring_entry id requerido" }, { status: 400 });

    // Obtener el asiento recurrente
    const { data: recurring, error: recError } = await supabaseService
      .from("recurring_entries")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (recError || !recurring) {
      return NextResponse.json({ error: "Asiento recurrente no encontrado" }, { status: 404 });
    }

    const entries = recurring.entries || [];

    // Resolve account_code -> Account UUID
    const accountCodes = entries.map((e: any) => e.account_code).filter(Boolean);
    const { data: accounts } = await supabaseService
      .from("Account")
      .select("id, code")
      .eq("tenantId", tenantId)
      .in("code", accountCodes);

    const codeToId = new Map<string, string>();
    (accounts || []).forEach((a: any) => codeToId.set(a.code, a.id));

    // Also try with tenant_id if none found with tenantId
    if (codeToId.size === 0) {
      const { data: accounts2 } = await supabaseService
        .from("Account")
        .select("id, code")
        .eq("tenant_id", tenantId)
        .in("code", accountCodes);
      (accounts2 || []).forEach((a: any) => codeToId.set(a.code, a.id));
    }

    // Calculate totalAmount from entries (in centavos)
    let totalAmount = 0;
    for (const entry of entries) {
      if (entry.default_amount) {
        totalAmount += Math.round(entry.default_amount * 100);
      }
    }

    const txId = crypto.randomUUID();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Get next voucher number
    const { data: lastVoucher } = await supabaseService
      .from("Transaction")
      .select("voucherNumber")
      .eq("tenantId", tenantId)
      .eq("voucherType", recurring.voucher_type || "DIARIO")
      .order("voucherNumber", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVoucherNumber = ((lastVoucher as any)?.voucherNumber || 0) + 1;

    // Crear la transacción
    const { data: tx, error: txError } = await supabaseService
      .from("Transaction")
      .insert({
        id: txId,
        description: `[Recurrente] ${recurring.name}`,
        date: today,
        voucherType: recurring.voucher_type,
        voucherNumber: nextVoucherNumber,
        tenantId: tenantId,
        currency: "HNL",
        exchangeRate: 24.7,
        totalAmount: totalAmount,
        functionalAmount: totalAmount,
        originalTotal: totalAmount,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Crear JournalEntry
    for (const entry of entries) {
      if (!entry.account_code || (!entry.debit_enabled && !entry.credit_enabled)) continue;

      // Use account_id directly if available, otherwise resolve from code
      const accountId = entry.account_id || codeToId.get(entry.account_code);
      if (!accountId) {
        console.error(`Account not found for code: ${entry.account_code}`);
        continue;
      }

      const amountInCents = Math.round((entry.default_amount || 0) * 100);
      const amount = entry.debit_enabled ? amountInCents : -amountInCents;

      await supabaseService.from("JournalEntry").insert({
        id: crypto.randomUUID(),
        transactionId: tx.id,
        accountId: accountId,
        tenantId: tenantId,
        amount: amount,
        originalAmount: Math.abs(amount),
        currency: "HNL",
        exchangeRate: 24.7,
        description: entry.account_name,
      });
    }

    // Registrar ejecución
    await supabaseService.from("recurring_entry_executions").insert({
      id: crypto.randomUUID(),
      recurring_entry_id: id,
      transaction_id: tx.id,
      status: "completed",
    });

    // Calcular próxima ejecución
    const nextDate = getNextExecutionDate(recurring.next_execution, recurring.frequency);

    // Actualizar el asiento recurrente
    await supabaseService
      .from("recurring_entries")
      .update({
        last_execution: today,
        next_execution: nextDate,
        updated_at: now,
      })
      .eq("id", id);

    return NextResponse.json({ success: true, transactionId: tx.id, nextExecution: nextDate });
  } catch (e: any) {
    console.error("POST execute recurring entry error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function getNextExecutionDate(current: string, frequency: string): string {
  const date = new Date(current);
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split("T")[0];
}

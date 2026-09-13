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

    // Crear la transacción
    const { data: tx, error: txError } = await supabaseService
      .from("Transaction")
      .insert({
        description: `[Recurrente] ${recurring.name}`,
        date: new Date().toISOString().split("T")[0],
        voucherType: recurring.voucher_type,
        tenantId: tenantId,
        currency: "HNL",
        exchangeRate: 24.7,
        totalAmount: 0,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Crear JournalEntry
    for (const entry of entries) {
      await supabaseService.from("JournalEntry").insert({
        transactionId: tx.id,
        accountId: entry.account_code,
        tenantId: tenantId,
        amount: entry.debit_enabled ? (entry.default_amount || 0) : -(entry.default_amount || 0),
        originalAmount: entry.default_amount || 0,
        currency: "HNL",
        exchangeRate: 24.7,
        description: entry.account_name,
      });
    }

    // Registrar ejecución
    await supabaseService.from("recurring_entry_executions").insert({
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
        last_execution: new Date().toISOString().split("T")[0],
        next_execution: nextDate,
        updated_at: new Date().toISOString(),
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

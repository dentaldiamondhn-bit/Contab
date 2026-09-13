import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

// GET: Obtener cuentas con saldos de apertura
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || 
                     new URL(request.url).searchParams.get("tenantId");
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    // Intentar chart_of_accounts primero
    let { data, error } = await supabaseService
      .from("chart_of_accounts")
      .select("id, code, name, type, nature, level, is_selectable, is_active, opening_balance, opening_balance_date, balance")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("code", { ascending: true });

    // Si chart_of_accounts no tiene datos o falla, usar tabla Account (Prisma)
    if (error || !data || data.length === 0) {
      console.warn("chart_of_accounts vacío, intentando tabla Account...");
      const acctRes = await supabaseService
        .from("Account")
        .select("id, code, name, type, is_active")
        .eq("tenant_id", tenantId)
        .order("code", { ascending: true });

      if (!acctRes.error && acctRes.data && acctRes.data.length > 0) {
        // Mapear Account al formato esperado
        data = acctRes.data.map((a: any) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          nature: ['ASSET', 'EXPENSE'].includes(a.type) ? 'DEBIT' : 'CREDIT',
          level: a.code.length <= 2 ? 1 : a.code.length <= 4 ? 2 : 3,
          is_selectable: true,
          is_active: a.is_active ?? true,
          opening_balance: 0,
          opening_balance_date: null,
          balance: 0,
        }));
        error = null;
      }
    }

    // Si aún no hay datos, intentar global
    if (!data || data.length === 0) {
      const global = await supabaseService
        .from("Account")
        .select("id, code, name, type, is_active")
        .order("code", { ascending: true })
        .limit(100);
      
      if (!global.error && global.data && global.data.length > 0) {
        data = global.data.map((a: any) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          nature: ['ASSET', 'EXPENSE'].includes(a.type) ? 'DEBIT' : 'CREDIT',
          level: a.code.length <= 2 ? 1 : a.code.length <= 4 ? 2 : 3,
          is_selectable: true,
          is_active: a.is_active ?? true,
          opening_balance: 0,
          opening_balance_date: null,
          balance: 0,
        }));
      }
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (error) {
    console.error("Error in opening-balances GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT: Actualizar saldos de apertura (masivo)
export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || 
                     new URL(request.url).searchParams.get("tenantId");
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { balances } = body;

    if (!Array.isArray(balances)) {
      return NextResponse.json({ error: "balances debe ser un array" }, { status: 400 });
    }

    let updated = 0;
    const auditLogs: any[] = [];

    for (const item of balances) {
      // Obtener valor anterior para auditoría
      const { data: currentAccount } = await supabaseService
        .from("chart_of_accounts")
        .select("id, code, name, opening_balance, opening_balance_date")
        .eq("id", item.account_id)
        .single();

      const oldValue = currentAccount?.opening_balance || 0;
      const newValue = item.opening_balance || 0;

      const { error } = await supabaseService
        .from("chart_of_accounts")
        .update({
          opening_balance: newValue,
          opening_balance_date: item.opening_balance_date || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.account_id);
      
      if (!error) {
        updated++;
        // Registrar en auditoría
        auditLogs.push({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          account_id: item.account_id,
          account_code: currentAccount?.code || '',
          action: 'OPENING_BALANCE_UPDATE',
          old_values: { opening_balance: oldValue, opening_balance_date: currentAccount?.opening_balance_date },
          new_values: { opening_balance: newValue, opening_balance_date: item.opening_balance_date },
          performed_by: request.headers.get("x-user-id") || request.headers.get("x-user-email") || 'system',
          performed_at: new Date().toISOString()
        });
      }
    }

    // Si no se actualizó nada en chart_of_accounts, intentar Account table
    if (updated === 0) {
      for (const item of balances) {
        const { error } = await supabaseService
          .from("Account")
          .update({
            description: `opening_balance:${item.opening_balance}|date:${item.opening_balance_date || ''}`
          })
          .eq("id", item.account_id);
        
        if (!error) updated++;
      }
    }

    // Insertar logs de auditoría en batch
    if (auditLogs.length > 0) {
      await supabaseService.from("account_audit_log").insert(auditLogs);
    }

    return NextResponse.json({ success: true, updated, auditLogged: auditLogs.length });
  } catch (error) {
    console.error("Error in opening-balances PUT:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

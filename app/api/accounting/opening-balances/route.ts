import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

// GET: Obtener cuentas con saldos de apertura
export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);
    const tenantId = empresa.tenantId;

    // Intentar chart_of_accounts primero, SIEMPRE acotado a la empresa/tenant.
    let { data, error } = await supabaseService
      .from("chart_of_accounts")
      .select("id, code, name, type, nature, level, is_selectable, is_active, opening_balance, opening_balance_date, balance")
      .match(scope)
      .eq("is_active", true)
      .order("code", { ascending: true });

    // Si chart_of_accounts no tiene datos o falla, usar tabla Account (Prisma),
    // con el mismo ámbito. Nunca se amplía a global.
    if (error || !data || data.length === 0) {
      console.warn("chart_of_accounts vacío, intentando tabla Account...");
      const acctRes = await supabaseService
        .from("Account")
        .select("id, code, name, type, is_active")
        .match(scope)
        .order("code", { ascending: true });

      if (!acctRes.error && acctRes.data && acctRes.data.length > 0) {
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
      }
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in opening-balances GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT: Actualizar saldos de apertura (masivo)
export async function PUT(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);
    const tenantId = empresa.tenantId;

    const body = await request.json();
    const { balances } = body;

    if (!Array.isArray(balances)) {
      return NextResponse.json({ error: "balances debe ser un array" }, { status: 400 });
    }

    let updated = 0;
    const auditLogs: any[] = [];

    for (const item of balances) {
      // Obtener valor anterior para auditoría, acotado a la empresa/tenant.
      const { data: currentAccount } = await supabaseService
        .from("chart_of_accounts")
        .select("id, code, name, opening_balance, opening_balance_date")
        .match(scope)
        .eq("id", item.account_id)
        .single();

      if (!currentAccount) continue; // no pertenece al ámbito: no se toca

      const oldValue = currentAccount?.opening_balance || 0;
      const newValue = item.opening_balance || 0;

      const { error } = await supabaseService
        .from("chart_of_accounts")
        .update({
          opening_balance: newValue,
          opening_balance_date: item.opening_balance_date || null,
          updated_at: new Date().toISOString()
        })
        .match(scope)
        .eq("id", item.account_id);

      if (!error) {
        updated++;
        // Registrar en auditoría
        auditLogs.push({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          company_id: empresa.companyId,
          account_id: item.account_id,
          account_code: currentAccount?.code || item.account_code || '',
          action: 'OPENING_BALANCE_UPDATE',
          old_values: { opening_balance: oldValue, opening_balance_date: currentAccount?.opening_balance_date },
          new_values: { opening_balance: newValue, opening_balance_date: item.opening_balance_date },
          performed_by: request.headers.get("x-user-id") || request.headers.get("x-user-email") || 'system',
          performed_at: new Date().toISOString()
        });
      }
    }

    // Si no se actualizó nada en chart_of_accounts, intentar Account table.
    // El UPDATE va acotado: antes actualizaba por id a secas (IDOR).
    if (updated === 0) {
      for (const item of balances) {
        const oldValue = 0;

        const { data: owned } = await supabaseService
          .from("Account")
          .select("id")
          .match(scope)
          .eq("id", item.account_id)
          .single();

        if (!owned) continue;

        const { error } = await supabaseService
          .from("Account")
          .update({
            description: `opening_balance:${item.opening_balance}|date:${item.opening_balance_date || ''}`
          })
          .match(scope)
          .eq("id", item.account_id);

        if (!error) {
          updated++;
          auditLogs.push({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            company_id: empresa.companyId,
            account_id: item.account_id,
            account_code: item.account_code || '',
            action: 'OPENING_BALANCE_UPDATE',
            old_values: { opening_balance: oldValue, opening_balance_date: null },
            new_values: { opening_balance: item.opening_balance || 0, opening_balance_date: item.opening_balance_date || null },
            performed_by: request.headers.get("x-user-id") || request.headers.get("x-user-email") || 'system',
            performed_at: new Date().toISOString()
          });
        }
      }
    }

    // Insertar logs de auditoría en batch
    if (auditLogs.length > 0) {
      await supabaseService.from("account_audit_log").insert(auditLogs);
    }

    return NextResponse.json({ success: true, updated, auditLogged: auditLogs.length });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in opening-balances PUT:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TABLE = "chart_of_accounts";

async function getBalance(supabase: any, accountId: string): Promise<number> {
  try {
    const { data: je } = await supabase
      .from("JournalEntry")
      .select("amount, type")
      .or(`account_id.eq.${accountId},accountId.eq.${accountId}`);
    if (!je || je.length === 0) return 0;
    let debits = 0, credits = 0;
    for (const entry of je) {
      if (entry.type === "DEBIT") debits += Number(entry.amount);
      else credits += Number(entry.amount);
    }
    return debits - credits;
  } catch { return 0; }
}

async function insertAuditLog(supabase: any, data: {
  tenant_id: string; account_id: string; account_code: string;
  action: string; old_values?: any; new_values?: any; performed_by?: string;
}) {
  try {
    await supabase.from("account_audit_log").insert({
      tenant_id: data.tenant_id, account_id: data.account_id, account_code: data.account_code,
      action: data.action, old_values: data.old_values || {}, new_values: data.new_values || {},
      performed_by: data.performed_by || "system",
    });
  } catch {}
}

function isColumnMissingError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("not found") || msg.includes("schema"));
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const supabase = createServiceRoleClient();
    let { data: accounts, error } = await supabase
      .from(TABLE).select("*").eq("tenant_id", tenantId).order("code");

    if (error || !accounts || accounts.length === 0) {
      const result = await supabase
        .from("Account").select("*").eq("tenant_id", tenantId).order("code");
      if (result.data && result.data.length > 0) accounts = result.data;
      else return NextResponse.json([]);
    }
    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Error fetching accounts" }, { status: 500 });
  }
}

async function tryInsert(supabase: any, data: Record<string, any>) {
  const { data: result, error } = await supabase.from(TABLE).insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const body = await request.json();
    const supabase = createServiceRoleClient();

    const TYPE_NATURE: Record<string, string> = {
      ASSET: "DEBIT", EXPENSE: "DEBIT",
      LIABILITY: "CREDIT", EQUITY: "CREDIT", REVENUE: "CREDIT",
    };
    const nature = body.nature || TYPE_NATURE[body.type] || "DEBIT";
    const level = body.code.length <= 2 ? 1 : body.code.length <= 4 ? 2 : body.code.length <= 6 ? 3 : 4;
    const isSelectable = body.isSelectable ?? (body.code.length >= 6);

    // Try with all columns first (after migration)
    const fullData: Record<string, any> = {
      code: body.code, name: body.name, type: body.type, nature, level,
      is_selectable: isSelectable, description: body.description || "",
      parent_id: body.parentId || null, tenant_id: tenantId, company_id: tenantId,
      is_active: true, currency: body.currency || "HNL", fiscal_code: body.fiscalCode || "",
    };

    let result;
    try {
      result = await tryInsert(supabase, fullData);
    } catch (err: any) {
      if (isColumnMissingError(err)) {
        // Fallback: only basic columns
        const basicData: Record<string, any> = {
          code: body.code, name: body.name, type: body.type,
          parent_code: body.parentId || null, tenant_id: tenantId, company_id: tenantId, is_active: true,
        };
        try {
          result = await tryInsert(supabase, basicData);
        } catch (err2: any) {
          return NextResponse.json({ error: err2.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    await insertAuditLog(supabase, {
      tenant_id: tenantId, account_id: result.id, account_code: body.code,
      action: "CREATE", new_values: fullData, performed_by: body.performedBy || "system",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Error creating account" }, { status: 500 });
  }
}

async function tryUpdate(supabase: any, id: string, data: Record<string, any>) {
  const { data: result, error } = await supabase.from(TABLE).update(data).eq("id", id).select().single();
  if (error) throw error;
  return result;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Account id required" }, { status: 400 });

    const supabase = createServiceRoleClient();

    const { data: current } = await supabase.from(TABLE).select("*").eq("id", body.id).single();

    if (body.isActive === false && current?.is_active === true) {
      const balance = await getBalance(supabase, body.id);
      if (Math.abs(balance) > 0.01) {
        return NextResponse.json({ error: "No se puede desactivar una cuenta con saldo diferente de cero. Saldo: " + balance.toFixed(2) }, { status: 400 });
      }
    }

    const fullData: Record<string, any> = {
      name: body.name, description: body.description || "",
      parent_id: body.parentId || null, is_selectable: body.isSelectable ?? true,
      is_active: body.isActive ?? true, currency: body.currency || "HNL",
      fiscal_code: body.fiscalCode || "", updated_at: new Date().toISOString(),
    };
    if (body.nature) fullData.nature = body.nature;
    if (body.type) fullData.type = body.type;
    if (body.code) fullData.code = body.code;

    let result;
    try {
      result = await tryUpdate(supabase, body.id, fullData);
    } catch (err: any) {
      if (isColumnMissingError(err)) {
        const basicData: Record<string, any> = { name: body.name, is_active: body.isActive ?? true };
        try { result = await tryUpdate(supabase, body.id, basicData); }
        catch (err2: any) { return NextResponse.json({ error: err2.message }, { status: 500 }); }
      } else {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (current) {
      await insertAuditLog(supabase, {
        tenant_id: current.tenant_id, account_id: body.id, account_code: current.code,
        action: "UPDATE", old_values: current, new_values: fullData,
        performed_by: body.performedBy || "system",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json({ error: "Error updating account" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Account id required" }, { status: 400 });

    const supabase = createServiceRoleClient();

    const { count } = await supabase
      .from("JournalEntry").select("*", { count: "exact", head: true })
      .or(`account_id.eq.${id},accountId.eq.${id}`);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "No se puede eliminar una cuenta con partidas contables. Use Inactivar." }, { status: 400 });
    }

    const { data: account } = await supabase.from(TABLE).select("*").eq("id", id).single();

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (account) {
      await insertAuditLog(supabase, {
        tenant_id: account.tenant_id, account_id: id, account_code: account.code,
        action: "DELETE", old_values: account,
        performed_by: request.nextUrl.searchParams.get("performedBy") || "system",
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Error deleting account" }, { status: 500 });
  }
}

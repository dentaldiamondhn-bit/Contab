import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

async function getTenantFromRequest(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") ||
    new URL(request.url).searchParams.get("tenantId");
  if (!tenantId) return null;
  return { id: tenantId };
}

// GET
export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const { data, error } = await supabaseService
      .from("Account")
      .select("*")
      .eq("tenantId", tenant.id)
      .order("code", { ascending: true });

    if (error || !data || data.length === 0) {
      const alt = await supabaseService
        .from("Account")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("code", { ascending: true });
      if (!alt.error && alt.data && alt.data.length > 0) {
        return NextResponse.json(alt.data);
      }
      if (!data || data.length === 0) {
        const global = await supabaseService
          .from("Account")
          .select("*")
          .order("code", { ascending: true })
          .limit(100);
        return NextResponse.json(global.data || []);
      }
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Error fetching accounts" }, { status: 500 });
  }
}

// POST - Crear cuenta
export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabaseService
      .from("Account")
      .insert({
        id,
        code: body.code,
        name: body.name,
        type: body.type || "ASSET",
        description: body.description || "",
        parentId: body.parentId || null,
        tenantId: tenant.id,
        tenant_id: tenant.id,
        is_active: body.isActive ?? true,
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar cuenta + cascada
export async function PUT(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const { id, code, name, type, nature, description, parentId, isSelectable, isActive, currency, fiscalCode } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Get current account data to detect changes
    const { data: current } = await supabaseService
      .from("Account")
      .select("code, name")
      .eq("id", id)
      .single();

    const oldCode = current?.code;
    const oldName = current?.name;
    const codeChanged = oldCode && code && oldCode !== code;
    const nameChanged = oldName && name && oldName !== name;

    const now = new Date().toISOString();
    const { error } = await supabaseService
      .from("Account")
      .update({
        code, name, type, description: description || "",
        parentId: parentId || null,
        is_active: isActive ?? true,
        updatedAt: now,
        updated_at: now,
      })
      .eq("id", id);

    if (error) throw error;

    // Cascade: update code/name in journal_entry_template_lines
    if (codeChanged || nameChanged) {
      console.log(`Cascading account change: ${oldCode} -> ${code}, ${oldName} -> ${name}`);

      // 1. Update journal_entry_template_lines
      if (codeChanged) {
        await supabaseService
          .from("journal_entry_template_lines")
          .update({ account_code: code, account_name: name })
          .eq("account_code", oldCode);
      } else if (nameChanged) {
        await supabaseService
          .from("journal_entry_template_lines")
          .update({ account_name: name })
          .eq("account_code", code);
      }

      // 2. Update recurring_entries JSONB entries
      if (codeChanged || nameChanged) {
        const { data: recurringEntries } = await supabaseService
          .from("recurring_entries")
          .select("id, entries")
          .eq("tenant_id", tenant.id);

        for (const re of recurringEntries || []) {
          const entries = re.entries || [];
          let changed = false;
          const updated = entries.map((e: any) => {
            if (codeChanged && e.account_code === oldCode) {
              changed = true;
              return { ...e, account_code: code, account_name: name };
            }
            if (nameChanged && e.account_code === code && e.account_name === oldName) {
              changed = true;
              return { ...e, account_name: name };
            }
            return e;
          });
          if (changed) {
            await supabaseService
              .from("recurring_entries")
              .update({ entries: updated, updated_at: now })
              .eq("id", re.id);
          }
        }
      }

      // 3. Update account_audit_log
      await supabaseService.from("account_audit_log").insert({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        account_id: id,
        account_code: code,
        action: "update",
        old_values: { code: oldCode, name: oldName },
        new_values: { code, name },
        performed_by: "system",
        performed_at: now,
      }).then(() => {}).catch(() => {});
    }

    return NextResponse.json({ success: true, id, codeChanged, nameChanged });
  } catch (error: any) {
    console.error("Error updating account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabaseService
      .from("Account")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

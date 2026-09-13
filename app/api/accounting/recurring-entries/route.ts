import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") ||
    new URL(request.url).searchParams.get("tenantId");
}

// GET - Listar asientos recurrentes
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const { data, error } = await supabaseService
      .from("recurring_entries")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error("GET recurring entries error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - Crear asiento recurrente
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const { name, description, voucher_type, frequency, next_execution, entries } = body;

    if (!name || !entries || entries.length < 2) {
      return NextResponse.json({ error: "name y al menos 2 entries son requeridos" }, { status: 400 });
    }

    const { data, error } = await supabaseService
      .from("recurring_entries")
      .insert({
        tenant_id: tenantId,
        name,
        description: description || "",
        voucher_type: voucher_type || "DIARIO",
        frequency: frequency || "monthly",
        next_execution: next_execution || new Date().toISOString().split("T")[0],
        entries: entries,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("POST recurring entry error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Actualizar asiento recurrente
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.voucher_type !== undefined) updateData.voucher_type = updates.voucher_type;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.next_execution !== undefined) updateData.next_execution = updates.next_execution;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.entries !== undefined) updateData.entries = updates.entries;

    const { data, error } = await supabaseService
      .from("recurring_entries")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("PUT recurring entry error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Eliminar asiento recurrente
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabaseService
      .from("recurring_entries")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE recurring entry error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

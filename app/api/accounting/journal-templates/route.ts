import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

// GET: Listar plantillas del tenant
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const { data: templates, error } = await supabaseService
      .from("journal_entry_templates")
      .select("*, journal_entry_template_lines(*)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalizar líneas
    const result = (templates || []).map((t: any) => ({
      ...t,
      lines: (t.journal_entry_template_lines || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in journal-templates GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Crear plantilla
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, voucher_type, lines } = body;

    if (!name || !lines || lines.length < 2) {
      return NextResponse.json(
        { error: "Nombre y al menos 2 líneas requeridas" },
        { status: 400 }
      );
    }

    // Crear template
    const { data: template, error: tplErr } = await supabaseService
      .from("journal_entry_templates")
      .insert({
        tenant_id: tenantId,
        name,
        description: description || null,
        voucher_type: voucher_type || "DIARIO",
      })
      .select()
      .single();

    if (tplErr) {
      console.error("Error creating template:", tplErr);
      return NextResponse.json({ error: tplErr.message }, { status: 500 });
    }

    // Crear líneas
    const linesInsert = lines.map((line: any, idx: number) => ({
      template_id: template.id,
      account_code: line.account_code,
      account_name: line.account_name,
      debit_enabled: line.debit_enabled !== false,
      credit_enabled: line.credit_enabled !== false,
      default_amount: Math.round(Number(line.default_amount) || 0),
      sort_order: idx,
    }));

    const { error: linesErr } = await supabaseService
      .from("journal_entry_template_lines")
      .insert(linesInsert);

    if (linesErr) {
      console.error("Error creating template lines:", linesErr);
      // Cleanup template
      await supabaseService.from("journal_entry_templates").delete().eq("id", template.id);
      return NextResponse.json({ error: linesErr.message }, { status: 500 });
    }

    return NextResponse.json({ ...template, lines: linesInsert });
  } catch (error) {
    console.error("Error in journal-templates POST:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT: Actualizar plantilla
export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, description, voucher_type, is_active, lines } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Actualizar template
    const { error: tplErr } = await supabaseService
      .from("journal_entry_templates")
      .update({
        name,
        description,
        voucher_type,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (tplErr) {
      return NextResponse.json({ error: tplErr.message }, { status: 500 });
    }

    // Si vienen líneas, reemplazar
    if (Array.isArray(lines)) {
      await supabaseService
        .from("journal_entry_template_lines")
        .delete()
        .eq("template_id", id);

      const linesInsert = lines.map((line: any, idx: number) => ({
        template_id: id,
        account_code: line.account_code,
        account_name: line.account_name,
        debit_enabled: line.debit_enabled !== false,
        credit_enabled: line.credit_enabled !== false,
        default_amount: Math.round(Number(line.default_amount) || 0),
        sort_order: idx,
      }));

      await supabaseService
        .from("journal_entry_template_lines")
        .insert(linesInsert);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in journal-templates PUT:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: Eliminar plantilla
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!tenantId || !id) {
      return NextResponse.json({ error: "Tenant ID e ID requeridos" }, { status: 400 });
    }

    const { error } = await supabaseService
      .from("journal_entry_templates")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in journal-templates DELETE:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

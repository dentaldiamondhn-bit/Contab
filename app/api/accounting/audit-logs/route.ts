import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const action = searchParams.get("action") || undefined;
    const accountCode = searchParams.get("accountCode") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    let query = supabaseService
      .from("account_audit_log")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("performed_at", { ascending: false });

    if (action) {
      query = query.eq("action", action);
    }
    if (accountCode) {
      query = query.ilike("account_code", `%${accountCode}%`);
    }
    if (from) {
      query = query.gte("performed_at", from);
    }
    if (to) {
      query = query.lte("performed_at", to);
    }

    const { data: logs, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enrichedLogs = await Promise.all(
      (logs || []).map(async (log) => {
        if (!log.account_id) return log;
        const { data: acct } = await supabaseService
          .from("Account")
          .select("code, name")
          .eq("id", log.account_id)
          .single();
        return {
          ...log,
          account_code: log.account_code || acct?.code || '',
          account_name: acct?.name || '',
        };
      })
    );

    return NextResponse.json({
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error("Error in audit-logs GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

export async function GET(request: NextRequest) {
  try {
    // Contexto validado (antes aceptaba `?tenantId` sin comprobar pertenencia).
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const action = searchParams.get("action") || undefined;
    const accountCode = searchParams.get("accountCode") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const format = searchParams.get("format") || 'json';

    let query = supabaseService
      .from("account_audit_log")
      .select("*", { count: "exact" })
      .match(scope)
      .order("performed_at", { ascending: false });

    if (action) {
      // Filtro múltiple si viene "JOURNAL_CREATE,OPENING_BALANCE_UPDATE"
      if (action.includes(',')) {
        query = query.in('action', action.split(',').map((s) => s.trim()).filter(Boolean));
      } else {
        query = query.eq("action", action);
      }
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
          .match(scope)
          .single();
        return {
          ...log,
          account_code: log.account_code || acct?.code || '',
          account_name: acct?.name || '',
        };
      })
    );

    if (format === 'csv' || format === 'excel') {
      return NextResponse.json({ data: enrichedLogs, format, message: 'Use client-side export or ?format=json for full data' });
    }

    return NextResponse.json({
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in audit-logs GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

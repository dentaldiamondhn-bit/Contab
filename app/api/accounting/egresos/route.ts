import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Contexto validado (antes aceptaba `?tenantId` sin comprobar pertenencia).
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);

    // Usar service_role para bypass RLS y soportar ANGELOH7 real
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    let query = supabaseService
      .from("Transaction")
      .select(`
        *,
        JournalEntry (
          *,
          Account (
            code,
            name
          )
        )
      `)
      .eq("voucherType", "EGRESO")
      .match(scope)

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }

    let { data: egresos, error } = await query.order("date", { ascending: true }) as { data: any[], error: any };
    if ((!egresos || egresos.length === 0) && !error) {
      const alt = await supabaseService.from("Transaction").select(`*, JournalEntry (*, Account (code, name))`).eq("voucher_type", "EGRESO").match(scope).order("date", { ascending: true }) as any;
      if (!alt.error && alt.data && alt.data.length > 0) { egresos = alt.data; error = null; }
    }

    if (error) {
      console.error("Error fetching egresos:", error);
      return NextResponse.json(
        { error: "Error fetching egresos" },
        { status: 500 }
      );
    }

    // Transform the data to match what LibroEgresos expects
    const transformedEgresos = egresos?.map(egreso => {
      // Only include transactions that have valid JournalEntry records with Account data
      const validEntries = egreso.JournalEntry?.filter((entry: any) =>
        entry &&
        entry.Account &&
        entry.Account.code &&
        entry.Account.name
      ).map((entry: any) => ({
        ...entry,
        account: entry.Account // Flatten the Account relation
      })) || [];

      return {
        ...egreso,
        voucher_number: egreso.voucherNumber, // Convert camelCase to snake_case
        entries: validEntries
      };
    }).filter(egreso => egreso.entries.length > 0) || []; // Filter out transactions with no valid entries

    return NextResponse.json(transformedEgresos);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching egresos:", error);
    return NextResponse.json(
      { error: "Error fetching egresos" },
      { status: 500 }
    );
  }
}

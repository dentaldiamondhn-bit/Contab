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

    // Usar service_role para bypass RLS
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    // Intentar camelCase (real) luego snakeCase por compatibilidad, SIEMPRE con
    // el ámbito de empresa/tenant.
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
      .eq("voucherType", "INGRESO")
      .match(scope)

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }

    let { data: ingresos, error } = await query.order("date", { ascending: true }) as { data: any[], error: any };

    // Fallback snake_case si no hay datos (compatibilidad)
    if ((!ingresos || ingresos.length === 0) && !error) {
      const alt = await supabaseService.from("Transaction").select(`*, JournalEntry (*, Account (code, name))`).eq("voucher_type", "INGRESO").match(scope).order("date", { ascending: true }) as any;
      if (!alt.error && alt.data && alt.data.length > 0) { ingresos = alt.data; error = null; }
    }

    if (error) {
      console.error("Error fetching ingresos:", error);
      return NextResponse.json(
        { error: "Error fetching ingresos" },
        { status: 500 }
      );
    }

    // Transform the data to match what LibroIngresos expects
    const transformedIngresos = ingresos?.map(ingreso => {
      // Only include transactions that have valid JournalEntry records with Account data
      const validEntries = ingreso.JournalEntry?.filter((entry: any) =>
        entry &&
        entry.Account &&
        entry.Account.code &&
        entry.Account.name
      ).map((entry: any) => ({
        ...entry,
        account: entry.Account // Flatten the Account relation
      })) || [];

      return {
        ...ingreso,
        voucher_number: ingreso.voucherNumber, // Convert camelCase to snake_case
        entries: validEntries
      };
    }).filter(ingreso => ingreso.entries.length > 0) || []; // Filter out transactions with no valid entries

    return NextResponse.json(transformedIngresos);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching ingresos:", error);
    return NextResponse.json(
      { error: "Error fetching ingresos" },
      { status: 500 }
    );
  }
}

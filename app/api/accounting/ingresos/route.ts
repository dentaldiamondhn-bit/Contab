import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

// Helper para obtener tenantId del request
async function getTenantFromRequest(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") || 
                   new URL(request.url).searchParams.get("tenantId");
  
  if (!tenantId) {
    return null;
  }

  return { id: tenantId };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Obtener tenantId del request
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }
    
    // Crear cliente Supabase
    const supabase = createSupabaseClient();
    
    // Obtener ingresos directamente de la tabla Transaction
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    
    let query = supabase
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
      .in("tenantId", [tenant.id, tenant.id === '1' ? 'tenant_001' : '1']); // Handle both tenant ID formats
    
    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }
    
    const { data: ingresos, error } = await query.order("date", { ascending: true }) as { data: any[], error: any };
    
    console.log("🔍 DEBUG - Ingresos query result:", { 
      count: ingresos?.length || 0, 
      error: error?.message,
      tenantId: tenant.id,
      sample: ingresos?.[0] 
    });
    
    if (error) {
      console.error("Error fetching ingresos:", error);
      return NextResponse.json(
        { error: "Error fetching ingresos" },
        { status: 500 }
      );
    }
    
    // Transform the data to match what LibroIngresos expects
    const transformedIngresos = ingresos?.map(ingreso => {
      console.log("🔍 DEBUG - Processing ingreso:", {
        id: ingreso.id,
        voucherType: ingreso.voucherType,
        voucherNumber: ingreso.voucherNumber,
        journalEntries: ingreso.JournalEntry?.length || 0
      });
      
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
    
    console.log("🔍 DEBUG - Final transformed ingresos:", {
      count: transformedIngresos.length,
      firstEntry: transformedIngresos[0]
    });
    
    return NextResponse.json(transformedIngresos);
  } catch (error) {
    console.error("Error fetching ingresos:", error);
    return NextResponse.json(
      { error: "Error fetching ingresos" },
      { status: 500 }
    );
  }
}

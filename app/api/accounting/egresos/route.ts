import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

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
      .eq("tenantId", tenant.id)
    
    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }
    
    let { data: egresos, error } = await query.order("date", { ascending: true }) as { data: any[], error: any };
    if ((!egresos || egresos.length === 0) && !error) {
      const alt = await supabaseService.from("Transaction").select(`*, JournalEntry (*, Account (code, name))`).eq("voucher_type", "EGRESO").eq("tenant_id", tenant.id).order("date", { ascending: true }) as any;
      if (!alt.error && alt.data && alt.data.length > 0) { egresos = alt.data; error = null; }
    }
    
    console.log("🔍 DEBUG - Egresos query result:", { 
      count: egresos?.length || 0, 
      error: error?.message,
      tenantId: tenant.id,
      sample: egresos?.[0] 
    });
    
    if (error) {
      console.error("Error fetching egresos:", error);
      return NextResponse.json(
        { error: "Error fetching egresos" },
        { status: 500 }
      );
    }
    
    // Transform the data to match what LibroEgresos expects
    const transformedEgresos = egresos?.map(egreso => {
      console.log("🔍 DEBUG - Processing egreso:", {
        id: egreso.id,
        voucherType: egreso.voucherType,
        voucherNumber: egreso.voucherNumber,
        journalEntries: egreso.JournalEntry?.length || 0
      });
      
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
    
    console.log("🔍 DEBUG - Final transformed egresos:", {
      count: transformedEgresos.length,
      firstEntry: transformedEgresos[0]
    });
    
    return NextResponse.json(transformedEgresos);
  } catch (error) {
    console.error("Error fetching egresos:", error);
    return NextResponse.json(
      { error: "Error fetching egresos" },
      { status: 500 }
    );
  }
}

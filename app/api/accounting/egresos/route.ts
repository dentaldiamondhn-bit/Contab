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
    
    // Obtener egresos directamente de la tabla Transaction
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
      .eq("voucherType", "EGRESO")
      .in("tenantId", [tenant.id, tenant.id === '1' ? 'tenant_001' : '1']); // Handle both tenant ID formats
    
    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }
    
    const { data: egresos, error } = await query.order("date", { ascending: true });
    
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
      const validEntries = egreso.JournalEntry?.filter(entry => 
        entry && 
        entry.Account && 
        entry.Account.code && 
        entry.Account.name
      ).map(entry => ({
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

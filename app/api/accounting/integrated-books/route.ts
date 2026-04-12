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

// Libro diario integrado
export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    console.log("📚 API: tenantId =", tenant?.id);
    
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookType = searchParams.get('bookType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const filterType = searchParams.get('filterType');
    
    console.log("📚 API: bookType=", bookType, "startDate=", startDate, "endDate=", endDate, "filterType=", filterType);

    const supabase = createSupabaseClient();
    let functionName = '';
    let params: any = { p_tenant_id: tenant.id };

    switch (bookType) {
      case 'diario':
        functionName = 'get_libro_diario_integrado';
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;
        if (filterType) params.p_tipo_filtro = filterType;
        break;
      
      case 'mayor':
        functionName = 'get_libro_mayor_integrado';
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;
        if (filterType) params.p_tipo_cuenta = filterType;
        break;
      
      case 'balance':
        functionName = 'get_balance_comprobacion_integrado';
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;
        break;
      
      case 'resumen':
        functionName = 'get_resumen_ingresos_egresos';
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;
        break;
      
      default:
        return NextResponse.json(
          { error: "Tipo de libro no válido. Use: diario, mayor, balance, resumen" },
          { status: 400 }
        );
    }

    console.log("📚 API: Calling function:", functionName, "with params:", params);
    const { data, error } = await supabase.rpc(functionName, params);
    console.log("📚 API: Supabase response - data length:", (data as unknown as any[])?.length, "error:", error);

    if (error) {
      console.error(`Error fetching ${bookType}:`, error);
      console.error('Function:', functionName, 'Params:', params);
      return NextResponse.json(
        { error: `Error fetching ${bookType}: ${error.message || error.details || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Transform flat data into hierarchical structure for diario bookType
    if (bookType === 'diario' && Array.isArray(data)) {
      const flatData = data as unknown as any[];
      const grouped = flatData.reduce((acc: any[], row: any) => {
        // Create a unique key for each transaction
        const key = `${row.fecha}-${row.numero_comprobante}`;
        
        // Find existing entry or create new one
        let entry = acc.find(e => e.id === key);
        if (!entry) {
          entry = {
            id: key,
            date: row.fecha,
            voucher_type: row.tipo_comprobante,
            voucher_number: row.numero_comprobante,
            description: row.descripcion,
            reference: '',
            total_amount: 0,
            entries: []
          };
          acc.push(entry);
        }
        
        // Add line item to entry
        const lineId = `${key}-${row.codigo_cuenta}`;
        entry.entries.push({
          id: lineId,
          account_code: row.codigo_cuenta,
          account_name: row.nombre_cuenta,
          account_type: '',
          debit: parseFloat(row.debe) || 0,
          credit: parseFloat(row.haber) || 0,
          description: row.descripcion_asiento
        });
        
        // Update total amount
        entry.total_amount += (parseFloat(row.debe) || 0) + (parseFloat(row.haber) || 0);
        
        return acc;
      }, []);
      
      return NextResponse.json(grouped);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in integrated books:", error);
    return NextResponse.json(
      { error: "Error processing request" },
      { status: 500 }
    );
  }
}

// Sincronizar libros (forzar actualización de vistas integradas)
export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'sync') {
      return NextResponse.json(
        { error: "Acción no válida. Use: sync" },
        { status: 400 }
      );
    }

    // Las vistas en PostgreSQL se actualizan automáticamente cuando se consultan
    // Pero podemos forzar una consulta para asegurar que estén sincronizadas
    const supabase = createSupabaseClient();

    // Verificar que todas las funciones estén disponibles
    const functions = [
      'get_libro_diario_integrado',
      'get_libro_mayor_integrado', 
      'get_balance_comprobacion_integrado',
      'get_resumen_ingresos_egresos'
    ];

    const results = [];
    for (const funcName of functions) {
      const { data, error } = await supabase.rpc(funcName, { 
        p_tenant_id: tenant.id 
      } as any);
      results.push({
        function: funcName,
        status: error ? 'error' : 'success',
        count: Array.isArray(data) ? (data as unknown as any[]).length : 0,
        error: error?.message
      });
    }

    return NextResponse.json({
      message: "Sincronización completada",
      results
    });
  } catch (error) {
    console.error("Error syncing books:", error);
    return NextResponse.json(
      { error: "Error syncing books" },
      { status: 500 }
    );
  }
}

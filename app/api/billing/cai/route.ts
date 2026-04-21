import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Obtener el CAI vigente actual
    const { data: cai, error } = await supabase
      .from("cai")
      .select("*")
      .eq("status", "active")
      .eq("tenant_id", "1") // Hardcoded por ahora
      .order("created_at", { ascending: false })
      .limit(1)
      .single() as { data: any, error: any };
    
    if (error) {
      console.error("Error fetching CAI:", error);
      return NextResponse.json(
        { error: "Error fetching CAI" },
        { status: 500 }
      );
    }
    
    if (!cai) {
      return NextResponse.json(
        { error: "No active CAI found" },
        { status: 404 }
      );
    }
    
    // Calcular días restantes
    const expirationDate = new Date(cai.expiration_date);
    const today = new Date();
    const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Obtener el último número de factura usado
    const { data: invoices } = await (supabase as any)
      .from("invoice")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(100);
    
    let currentNumber = cai.start_number;
    
    // Encontrar el número más alto usado
    if (invoices && invoices.length > 0) {
      const numbers = invoices
        .map((inv: any) => {
          const parts = inv.invoice_number?.split('-');
          return parts && parts.length === 4 ? parseInt(parts[3]) : 0;
        })
        .filter((n: any) => !isNaN(n) && n > 0);
      
      if (numbers.length > 0) {
        const maxNumber = Math.max(...numbers);
        currentNumber = maxNumber + 1;
      }
    }
    
    const caiInfo = {
      cai: cai.cai,
      currentNumber,
      finalNumber: cai.end_number,
      issueDate: cai.issue_date,
      expirationDate: cai.expiration_date,
      daysRemaining: Math.max(0, daysRemaining),
      status: daysRemaining <= 0 ? 'expired' : daysRemaining <= 30 ? 'warning' : 'active',
      _debug: {
        invoiceCount: invoices?.length || 0,
        startNumber: cai.start_number,
        calculatedNumber: currentNumber
      }
    };
    
    return NextResponse.json(caiInfo);
  } catch (error) {
    console.error("Error in CAI route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cai, startNumber, endNumber, expirationDate } = body;
    
    const supabase = createSupabaseClient();
    
    // Desactivar CAIs anteriores
    await (supabase as any)
      .from("cai")
      .update({ status: 'inactive' })
      .eq("tenant_id", "1");
    
    // Crear nuevo CAI
    const { data, error } = await (supabase as any)
      .from("cai")
      .insert({
        cai,
        start_number: startNumber,
        end_number: endNumber,
        issue_date: new Date().toISOString().split('T')[0],
        expiration_date: expirationDate,
        status: 'active',
        tenant_id: '1'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating CAI:", error);
      return NextResponse.json(
        { error: "Error creating CAI" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in CAI POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

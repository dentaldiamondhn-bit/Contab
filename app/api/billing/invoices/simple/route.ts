import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const supabase = createSupabaseClient();
    
    // Datos mínimos para probar
    const testInvoice = {
      invoice_number: data.invoiceNumber || "TEST-001",
      cai: data.cai || "1234567890123456789012345678901234567",
      customer_rtn: data.customer?.rtn || "00000000000000",
      customer_name: data.customer?.name || "Cliente Test",
      subtotal: 1000,
      tax_15: 150,
      tax_18: 0,
      total: 1150,
      payment_method: data.paymentMethod || "cash",
      status: "PAGADA",
      tenant_id: "1",
      date: new Date().toISOString()
    };
    
    console.log("Inserting invoice:", testInvoice);
    
    const { data: invoice, error } = await supabase
      .from("invoice")
      .insert(testInvoice)
      .select()
      .single();
    
    if (error) {
      console.error("SUPABASE ERROR:", error);
      return NextResponse.json({
        error: "Database error",
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      invoice
    });
    
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json({
      error: "Server error",
      message: err.message
    }, { status: 500 });
  }
}

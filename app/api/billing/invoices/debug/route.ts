import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json();
    const supabase = createSupabaseClient();
    
    // Debug: Verificar datos recibidos
    const debug = {
      received: invoiceData,
      hasInvoiceNumber: !!invoiceData.invoiceNumber,
      hasCai: !!invoiceData.cai,
      hasCustomer: !!invoiceData.customer,
      hasTotals: !!invoiceData.totals,
      itemsCount: invoiceData.items?.length || 0
    };
    
    // Intentar insertar sin .single() primero
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from("invoice")
      .insert({
        invoice_number: invoiceData.invoiceNumber,
        cai: invoiceData.cai,
        customer_rtn: invoiceData.customer?.rtn,
        customer_name: invoiceData.customer?.name,
        subtotal: Math.round((invoiceData.totals?.subtotal || 0) * 100),
        tax_15: Math.round((invoiceData.totals?.tax15 || 0) * 100),
        tax_18: Math.round((invoiceData.totals?.tax18 || 0) * 100),
        total: Math.round((invoiceData.totals?.total || 0) * 100),
        payment_method: invoiceData.paymentMethod,
        payment_reference: invoiceData.paymentReference,
        status: 'PAGADA',
        date: invoiceData.date,
        tenant_id: '1'
      })
      .select();
    
    if (invoiceError) {
      return NextResponse.json({
        step: "insert_invoice",
        debug,
        error: invoiceError.message,
        details: invoiceError
      }, { status: 500 });
    }
    
    if (!invoice || invoice.length === 0) {
      return NextResponse.json({
        step: "no_invoice_returned",
        debug,
        invoice
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      debug,
      invoice: invoice[0]
    });
    
  } catch (error: any) {
    return NextResponse.json({
      step: "catch",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

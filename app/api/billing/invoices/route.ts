import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json();
    
    console.log("INVOICE DATA RECEIVED:", JSON.stringify(invoiceData, null, 2));
    
    const supabase = createSupabaseClient();
    
    // Crear la factura
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoice")
      .insert({
        invoice_number: invoiceData.invoiceNumber,
        cai: invoiceData.cai,
        customer_rtn: invoiceData.customer.rtn,
        customer_name: invoiceData.customer.name,
        subtotal: invoiceData.totals.subtotal * 100, // Convertir a centavos
        tax_15: invoiceData.totals.tax15 * 100,
        tax_18: invoiceData.totals.tax18 * 100,
        total: invoiceData.totals.total * 100,
        payment_method: invoiceData.paymentMethod,
        payment_reference: invoiceData.paymentReference,
        status: 'PAGADA',
        date: invoiceData.date,
        tenant_id: '1'
      })
      .select()
      .single();
    
    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { 
          error: "Error creating invoice", 
          details: invoiceError.message,
          code: invoiceError.code,
          hint: invoiceError.hint
        },
        { status: 500 }
      );
    }
    
    // Crear los items de la factura
    const invoiceItems = invoiceData.items.map((item: any) => ({
      invoice_id: invoice.id,
      product_code: item.code,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice * 100,
      tax_rate: item.taxRate,
      discount: item.discount,
      subtotal: item.subtotal * 100,
      tax_amount: item.taxAmount * 100,
      total: item.total * 100
    }));
    
    const { error: itemsError } = await supabase
      .from("invoiceitem")
      .insert(invoiceItems);
    
    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      return NextResponse.json(
        { error: "Error creating invoice items" },
        { status: 500 }
      );
    }
    
    // Actualizar el número del CAI
    const nextNumber = parseInt(invoiceData.invoiceNumber.split('-')[3]) + 1;
    await supabase
      .from("cai")
      .update({ current_number: nextNumber })
      .eq("cai", invoiceData.cai);
    
    // Generar asiento contable automático
    const journalEntries = [];
    
    // Cuenta de Clientes (si es crédito) o Caja (si es efectivo)
    if (invoiceData.paymentMethod === 'cash') {
      journalEntries.push({
        accountId: '1101', // Caja
        amount: invoiceData.totals.total * 100,
        type: 'DEBIT'
      });
    } else {
      journalEntries.push({
        accountId: '1103', // Clientes
        amount: invoiceData.totals.total * 100,
        type: 'DEBIT'
      });
    }
    
    // Ventas (Haber)
    journalEntries.push({
      accountId: '4101', // Ventas
      amount: invoiceData.totals.subtotal * 100,
      type: 'CREDIT'
    });
    
    // ISV por Pagar (Haber)
    if (invoiceData.totals.tax15 > 0) {
      journalEntries.push({
        accountId: '2105', // ISV por Pagar 15%
        amount: invoiceData.totals.tax15 * 100,
        type: 'CREDIT'
      });
    }
    
    if (invoiceData.totals.tax18 > 0) {
      journalEntries.push({
        accountId: '2106', // ISV por Pagar 18%
        amount: invoiceData.totals.tax18 * 100,
        type: 'CREDIT'
      });
    }
    
    // Llamar a la función RPC existente - usar URL base del request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const transactionResponse = await fetch(`${baseUrl}/api/accounting/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: '1',
        voucherType: 'INGRESO',
        voucherNumber: `FAC-${invoiceData.invoiceNumber}`,
        date: invoiceData.date,
        description: `Factura ${invoiceData.invoiceNumber} - ${invoiceData.customer.name}`,
        reference: invoiceData.paymentReference,
        journalEntries
      })
    });
    
    if (!transactionResponse.ok) {
      console.error("Error creating accounting entry:", await transactionResponse.text());
    }
    
    return NextResponse.json({ 
      success: true, 
      invoice,
      message: "Factura emitida exitosamente" 
    });
    
  } catch (error: any) {
    console.error("=== ERROR IN INVOICE POST ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    
    const supabase = createSupabaseClient();
    
    let query = supabase
      .from("invoice")
      .select(`
        *,
        InvoiceItem (
          product_code,
          product_name,
          quantity,
          unit_price,
          tax_rate,
          discount,
          subtotal,
          tax_amount,
          total
        )
      `)
      .eq("tenant_id", "1")
      .order("date", { ascending: false });
    
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    if (status) {
      query = query.eq("status", status);
    }
    
    const { data: invoices, error } = await query;
    
    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json(
        { error: "Error fetching invoices" },
        { status: 500 }
      );
    }
    
    // Convertir centavos a lempiras
    const formattedInvoices = invoices?.map(invoice => ({
      ...invoice,
      subtotal: invoice.subtotal / 100,
      tax_15: invoice.tax_15 / 100,
      tax_18: invoice.tax_18 / 100,
      total: invoice.total / 100,
      InvoiceItem: invoice.InvoiceItem?.map((item: any) => ({
        ...item,
        unit_price: item.unit_price / 100,
        subtotal: item.subtotal / 100,
        tax_amount: item.tax_amount / 100,
        total: item.total / 100
      }))
    }));
    
    return NextResponse.json(formattedInvoices);
    
  } catch (error) {
    console.error("Error in invoice GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

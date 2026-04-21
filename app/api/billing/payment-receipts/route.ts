import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const receipt = formData.get("receipt") as File;
    const paymentLinkId = formData.get("paymentLinkId") as string;
    
    if (!receipt || !paymentLinkId) {
      return NextResponse.json(
        { error: "Missing receipt file or payment link ID" },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseClient();
    
    // Subir comprobante a Supabase Storage
    const fileName = `receipt-${paymentLinkId}-${Date.now()}.${receipt.name.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(fileName, receipt);
    
    if (uploadError) {
      console.error("Error uploading receipt:", uploadError);
      return NextResponse.json(
        { error: "Error uploading receipt" },
        { status: 500 }
      );
    }
    
    // Obtener URL pública del comprobante
    const { data: urlData } = supabase.storage
      .from("payment-receipts")
      .getPublicUrl(fileName);
    
    // Actualizar enlace de pago con el comprobante
    const { data: paymentLink, error: updateError } = await (supabase as any)
      .from("PaymentLink")
      .update({ 
        status: 'completed',
        receipt_url: urlData.publicUrl,
        completed_at: new Date().toISOString()
      })
      .eq("id", paymentLinkId)
      .select(`
        *,
        Invoice (
          id,
          invoice_number,
          customer_name,
          total
        )
      `)
      .single();
    
    if (updateError) {
      console.error("Error updating payment link:", updateError);
      return NextResponse.json(
        { error: "Error updating payment link" },
        { status: 500 }
      );
    }
    
    // Actualizar estado de la factura a PAGADA
    if (paymentLink.Invoice) {
      await (supabase as any)
        .from("Invoice")
        .update({ status: 'PAGADA' })
        .eq("id", paymentLink.Invoice.id);
      
      // Generar asiento contable del pago
      const journalEntries = [
        {
          accountId: '1101', // Caja
          amount: paymentLink.Invoice.total,
          type: 'DEBIT'
        },
        {
          accountId: '1103', // Clientes
          amount: paymentLink.Invoice.total,
          type: 'CREDIT'
        }
      ];
      
      // Llamar a la función RPC existente
      const transactionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/accounting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: '1',
          voucherType: 'DIARIO',
          voucherNumber: `PAGO-${paymentLink.Invoice.invoice_number}`,
          date: new Date().toISOString(),
          description: `Pago de factura ${paymentLink.Invoice.invoice_number} - ${paymentLink.Invoice.customer_name}`,
          reference: `Payment Link: ${paymentLinkId}`,
          journalEntries
        })
      });
      
      if (!transactionResponse.ok) {
        console.error("Error creating payment accounting entry:", await transactionResponse.text());
      }
    }
    
    return NextResponse.json({
      success: true,
      receiptUrl: urlData.publicUrl,
      paymentStatus: 'completed'
    });
    
  } catch (error) {
    console.error("Error in payment receipts POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentLinkId = searchParams.get("paymentLinkId");
    
    const supabase = createSupabaseClient();
    
    let query = supabase
      .from("PaymentLink")
      .select(`
        *,
        BankAccount (
          bank_name,
          account_number,
          account_type,
          account_holder
        ),
        Invoice (
          invoice_number,
          customer_name,
          total,
          status
        )
      `)
      .eq("tenantId", "1");
    
    if (paymentLinkId) {
      query = query.eq("id", paymentLinkId);
    }
    
    const { data: receipts, error } = await query.order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching payment receipts:", error);
      return NextResponse.json(
        { error: "Error fetching payment receipts" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(receipts);
    
  } catch (error) {
    console.error("Error in payment receipts GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

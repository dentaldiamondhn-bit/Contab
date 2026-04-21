import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, invoiceNumber, amount, currency, bankAccountId, paymentUrl, qrCode } = await request.json();
    
    const supabase = createSupabaseClient();
    
    // Crear enlace de pago
    const { data: paymentLink, error } = await (supabase as any)
      .from("PaymentLink")
      .insert({
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount: amount * 100, // Convertir a centavos
        currency,
        bank_account_id: bankAccountId,
        payment_url: paymentUrl,
        qr_code: qrCode,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
        tenantId: '1'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating payment link:", error);
      return NextResponse.json(
        { error: "Error creating payment link" },
        { status: 500 }
      );
    }
    
    // Actualizar estado de la factura a pendiente de pago
    await (supabase as any)
      .from("Invoice")
      .update({ status: 'PENDING_PAYMENT' })
      .eq("id", invoiceId);
    
    return NextResponse.json({
      id: (paymentLink as any).id,
      invoiceNumber: (paymentLink as any).invoice_number,
      amount: (paymentLink as any).amount / 100,
      currency: (paymentLink as any).currency,
      bankAccount: (paymentLink as any).BankAccount,
      paymentUrl: (paymentLink as any).payment_url,
      qrCode: (paymentLink as any).qr_code,
      status: (paymentLink as any).status,
      createdAt: (paymentLink as any).created_at,
      expiresAt: (paymentLink as any).expires_at
    });
    
  } catch (error) {
    console.error("Error in payment links POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    
    const supabase = createSupabaseClient();
    
    let query = supabase
      .from("PaymentLink")
      .select(`
        *,
        BankAccount (
          bank_name,
          account_number,
          account_type,
          account_holder,
          currency
        )
      `)
      .eq("tenantId", "1");
    
    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }
    
    const { data: paymentLinks, error } = await query.order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching payment links:", error);
      return NextResponse.json(
        { error: "Error fetching payment links" },
        { status: 500 }
      );
    }
    
    // Convertir centavos a lempiras/dólares
    const formattedLinks = paymentLinks?.map((link: any) => ({
      ...link,
      amount: link.amount / 100,
      BankAccount: link.BankAccount
    }));
    
    return NextResponse.json(formattedLinks);
    
  } catch (error) {
    console.error("Error in payment links GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

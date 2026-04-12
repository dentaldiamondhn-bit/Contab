import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    const { data: accounts, error } = await supabase
      .from("bankaccount")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", "1")
      .order("bank_name", { ascending: true });
    
    if (error) {
      console.error("Error fetching bank accounts:", error);
      return NextResponse.json(
        { error: "Error fetching bank accounts" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error("Error in bank-accounts GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bank_name, account_number, account_type, account_holder, currency } = body;
    
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from("bankaccount")
      .insert({
        bank_name,
        account_number,
        account_type,
        account_holder,
        currency: currency || 'HNL',
        is_active: true,
        tenant_id: '1'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating bank account:", error);
      return NextResponse.json(
        { error: "Error creating bank account" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in bank-accounts POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

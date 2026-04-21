import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    const { data: customers, error } = await supabase
      .from("customer")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", "1")
      .order("name", { ascending: true });
    
    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json(
        { error: "Error fetching customers" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(customers || []);
  } catch (error) {
    console.error("Error in customers GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rtn, name, email, phone, address, credit_limit } = body;
    
    const supabase = createSupabaseClient();
    
    const { data, error } = await (supabase as any)
      .from("customer")
      .insert({
        rtn,
        name,
        email,
        phone,
        address,
        credit_limit: credit_limit || 0,
        current_debt: 0,
        is_active: true,
        tenant_id: '1'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating customer:", error);
      return NextResponse.json(
        { error: "Error creating customer" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in customers POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

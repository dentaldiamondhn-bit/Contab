import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    const { data: products, error } = await (supabase as any)
      .from("product")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", "1")
      .order("code", { ascending: true }) as { data: any[], error: any };
    
    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error fetching products" },
        { status: 500 }
      );
    }
    
    // Convertir centavos a unidades para la UI
    const formattedProducts = products?.map(product => ({
      ...product,
      unit_price: product.unit_price / 100
    }));
    
    return NextResponse.json(formattedProducts || []);
  } catch (error) {
    console.error("Error in products GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, unit_price, tax_rate, is_service, stock_quantity, category } = body;
    
    const supabase = createSupabaseClient();
    
    const { data, error } = await (supabase as any)
      .from("product")
      .insert({
        code,
        name,
        description,
        unit_price: Math.round(unit_price * 100), // Convertir a centavos
        tax_rate: tax_rate || 15,
        is_service: is_service || false,
        is_active: true,
        stock_quantity: stock_quantity || 0,
        category,
        tenant_id: '1'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Error creating product" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in products POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

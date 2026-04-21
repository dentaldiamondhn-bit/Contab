import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

// GET - Obtener productos con datos de inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withStockOnly = searchParams.get("withStock") === "true";
    const productType = searchParams.get("productType");

    const supabase = createSupabaseClient();

    let query = supabase
      .from("product")
      .select('*')
      .eq("tenant_id", "1")
      .eq("is_active", true);

    if (withStockOnly) {
      query = query.gt("current_stock", 0);
    }

    if (productType) {
      query = query.eq("product_type", productType);
    }

    const { data: rawProducts, error } = await query.order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error fetching products" },
        { status: 500 }
      );
    }

    // Map database columns to frontend expected names
    const products = rawProducts?.map((p: any) => ({
      ...p,
      price: p.unit_price,
      current_stock: p.current_stock ?? 0,
      min_stock: p.min_stock ?? 0,
      max_stock: p.max_stock ?? 0,
      current_cost: p.current_cost ?? 0,
    }));

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("=== ERROR IN INVENTORY PRODUCTS ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar producto (stock, costo, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("PATCH /api/inventory/products - Request body:", JSON.stringify(body, null, 2));
    
    const {
      id,
      name,
      description,
      unitPrice,
      currentCost,
      minStock,
      maxStock,
      taxRate,
      productType,
      valuationMethod,
      isActive,
    } = body;

    if (!id) {
      console.error("PATCH Error: Missing product id");
      return NextResponse.json(
        { error: "Missing product id" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    // Map camelCase to snake_case for database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (unitPrice !== undefined) updateData.unit_price = unitPrice;
    if (currentCost !== undefined) updateData.current_cost = currentCost;
    if (minStock !== undefined) updateData.min_stock = minStock;
    if (maxStock !== undefined) updateData.max_stock = maxStock;
    if (taxRate !== undefined) updateData.tax_rate = taxRate;
    if (productType !== undefined) updateData.product_type = productType;
    if (valuationMethod !== undefined) updateData.valuation_method = valuationMethod;
    if (isActive !== undefined) updateData.is_active = isActive;

    console.log("PATCH - Update data:", JSON.stringify(updateData, null, 2));

    const { data: product, error } = await (supabase as any)
      .from("product")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("=== SUPABASE ERROR ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return NextResponse.json(
        { error: "Error updating product", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
      message: "Producto actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("=== UNEXPECTED ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      code,
      name,
      description,
      unitPrice,
      currentCost,
      currentStock = 0,
      minStock = 0,
      maxStock = 0,
      taxRate = 15,
      productType = 'product',
      valuationMethod = 'weighted_average',
      warehouseId,
      isService = false,
    } = body;

    const supabase = createSupabaseClient();

    // Auto-generar código si no se proporciona
    if (!code) {
      // Obtener el último código de producto
      const { data: lastProduct } = await supabase
        .from("product")
        .select("code")
        .eq("tenant_id", "1")
        .ilike("code", "PROD-%")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if ((lastProduct as any)?.code) {
        const match = (lastProduct as any)?.code?.match(/PROD-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      code = `PROD-${String(nextNumber).padStart(3, "0")}`;
    }

    // Verificar si el código ya existe
    const { data: existing } = await (supabase as any)
      .from("product")
      .select("id")
      .eq("code", code)
      .eq("tenant_id", "1")
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un producto con ese código" },
        { status: 400 }
      );
    }

    const { data: product, error } = await (supabase as any)
      .from("product")
      .insert({
        tenant_id: "1",
        code,
        name,
        description,
        unit_price: unitPrice,
        current_cost: currentCost || unitPrice,
        current_stock: currentStock,
        min_stock: minStock,
        max_stock: maxStock,
        tax_rate: taxRate,
        product_type: productType,
        valuation_method: valuationMethod,
        warehouse_id: warehouseId,
        is_service: isService,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Error creating product", details: error.message },
        { status: 500 }
      );
    }

    // Si tiene stock inicial, crear movimiento de entrada
    if (currentStock > 0 && currentCost) {
      await (supabase as any).from("inventory_movement").insert({
        tenant_id: "1",
        product_id: (product as any).id,
        warehouse_id: warehouseId,
        movement_type: "IN",
        movement_reason: "initial_stock",
        quantity: currentStock,
        unit_cost: currentCost,
        total_cost: currentStock * currentCost,
        stock_before: 0,
        stock_after: currentStock,
        notes: "Stock inicial al crear producto",
        created_by: "system",
      });
    }

    return NextResponse.json({
      success: true,
      product,
      message: "Producto creado exitosamente",
    });
  } catch (error: any) {
    console.error("Error in products POST:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

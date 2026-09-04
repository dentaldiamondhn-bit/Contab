import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Obtener movimientos de inventario (Kardex)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const movementType = searchParams.get("movementType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tenantId = searchParams.get("tenantId") || "1";
    const limit = parseInt(searchParams.get("limit") || "100");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from("inventory_movement")
      .select('*')
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq("product_id", productId);
    }
    if (warehouseId) {
      query = query.eq("warehouse_id", warehouseId);
    }
    if (movementType) {
      query = query.eq("movement_type", movementType);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: movements, error } = await query;

    if (error) {
      console.error("Error fetching inventory movements:", error);
      return NextResponse.json(
        { error: "Error fetching movements" },
        { status: 500 }
      );
    }

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Error in inventory movements GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Crear movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      warehouseId,
      movementType,
      movementReason,
      quantity,
      unitCost,
      referenceId,
      referenceType,
      referenceNumber,
      lotNumber,
      expirationDate,
      notes,
    } = body;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener stock actual del producto
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("current_stock, current_cost, product_type")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const stockBefore = (product as any).current_stock || 0;
    let stockAfter = stockBefore;

    // Calcular nuevo stock
    if (movementType === "IN") {
      stockAfter = stockBefore + quantity;
    } else if (movementType === "OUT") {
      stockAfter = stockBefore - quantity;
      if (stockAfter < 0) {
        return NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 }
        );
      }
    }

    // Calcular costos
    const totalCost = unitCost * quantity;

    // Crear el movimiento
    const { data: movement, error: movementError } = await (supabase as any)
      .from("inventory_movement")
      .insert({
        tenant_id: "1",
        product_id: productId,
        warehouse_id: warehouseId,
        movement_type: movementType,
        movement_reason: movementReason,
        quantity: quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reference_id: referenceId,
        reference_type: referenceType,
        reference_number: referenceNumber,
        lot_number: lotNumber,
        expiration_date: expirationDate,
        notes: notes,
        created_by: "system",
      })
      .select()
      .single();

    if (movementError) {
      console.error("Error creating movement:", movementError);
      return NextResponse.json(
        { error: "Error creating movement" },
        { status: 500 }
      );
    }

    // Actualizar stock del producto
    const { error: updateError } = await (supabase as any)
      .from("product")
      .update({
        current_stock: stockAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Error updating product stock:", updateError);
    }

    // Si es entrada por compra, actualizar costo promedio
    if (movementType === "IN" && movementReason === "purchase") {
      const newCost = ((stockBefore * ((product as any).current_cost || 0)) + (quantity * unitCost)) / (stockBefore + quantity);
      await (supabase as any)
        .from("product")
        .update({ current_cost: newCost })
        .eq("id", productId);
    }

    return NextResponse.json({
      success: true,
      movement,
      message: "Movimiento registrado exitosamente",
    });
  } catch (error) {
    console.error("Error in inventory movement POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

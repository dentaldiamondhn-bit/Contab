import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Obtener ajustes de inventario
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from("inventory_adjustment")
      .select(`
        *,
        warehouse:warehouse_id (name),
        items:inventory_adjustment_item (
          product:product_id (code, name),
          system_stock,
          physical_count,
          difference,
          unit_cost,
          total_difference
        )
      `)
      .eq("tenant_id", "1")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: adjustments, error } = await query;

    if (error) {
      console.error("Error fetching adjustments:", error);
      return NextResponse.json(
        { error: "Error fetching adjustments" },
        { status: 500 }
      );
    }

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error("Error in adjustments GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Crear ajuste de inventario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      warehouseId,
      adjustmentType,
      notes,
      items, // Array de { productId, physicalCount, systemStock, notes }
    } = body;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generar número de ajuste
    const { data: lastAdjustment } = await (supabase as any)
      .from("inventory_adjustment")
      .select("adjustment_number")
      .eq("tenant_id", "1")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastNumber = (lastAdjustment as any)?.adjustment_number || "AJ-00000";
    const nextNumber = parseInt(lastNumber.split("-")[1]) + 1;
    const adjustmentNumber = `AJ-${String(nextNumber).padStart(5, "0")}`;

    // Calcular totales
    let totalItems = 0;
    let totalDifference = 0;

    const adjustmentItems = items.map((item: any) => {
      const difference = item.physicalCount - item.systemStock;
      const unitCost = item.unitCost || 0;
      const totalDiff = difference * unitCost;

      totalItems += 1;
      totalDifference += totalDiff;

      return {
        product_id: item.productId,
        system_stock: item.systemStock,
        physical_count: item.physicalCount,
        difference: difference,
        unit_cost: unitCost,
        total_difference: totalDiff,
        notes: item.notes || "",
      };
    });

    // Crear el ajuste
    const { data: adjustment, error: adjustmentError } = await (supabase as any)
      .from("inventory_adjustment")
      .insert({
        tenant_id: "1",
        warehouse_id: warehouseId,
        adjustment_number: adjustmentNumber,
        adjustment_type: adjustmentType,
        total_items: totalItems,
        total_difference: totalDifference,
        status: "draft",
        notes: notes,
        created_by: "system",
      })
      .select()
      .single();

    if (adjustmentError) {
      console.error("Error creating adjustment:", adjustmentError);
      return NextResponse.json(
        { error: "Error creating adjustment" },
        { status: 500 }
      );
    }

    // Crear items del ajuste
    const itemsWithAdjustmentId = adjustmentItems.map((item: any) => ({
      ...item,
      adjustment_id: (adjustment as any).id,
    }));

    const { error: itemsError } = await (supabase as any)
      .from("inventory_adjustment_item")
      .insert(itemsWithAdjustmentId);

    if (itemsError) {
      console.error("Error creating adjustment items:", itemsError);
    }

    return NextResponse.json({
      success: true,
      adjustment,
      message: "Ajuste creado exitosamente",
    });
  } catch (error) {
    console.error("Error in adjustments POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export const dynamic = "force-dynamic";

// Antes esta ruta resolvia solo el tenant (`resolveTenant`), que no tiene
// concepto de empresa: las consultas filtraban por `tenant_id` y test 1 y test 2
// comparten `TEST1DS`, asi que el kardex mezclaba los movimientos de las dos.
// Ademas el POST hacia `resolveTenant(request) || body.tenant_id`, o sea que el
// cliente decidia en que empresa se guardaba el movimiento.
//
// Ahora usa `contextoDeEmpresa` (valida pertenencia: 403 si la empresa pedida no
// es del tenant de la sesion) y `filtroEmpresaOCompany`, que es lo que separa.

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// GET - Obtener movimientos de inventario (Kardex)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const movementType = searchParams.get("movementType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = getSupabaseServer()
      .from("inventory_movement")
      .select('*')
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
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

const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }
    if (!productId) {
      return NextResponse.json({ error: "Falta el producto" }, { status: 400 });
    }
    if (movementType !== "IN" && movementType !== "OUT") {
      return NextResponse.json(
        { error: 'El tipo de movimiento debe ser "IN" u "OUT"' },
        { status: 400 }
      );
    }
    const qty = num(quantity);
    if (qty <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a cero" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer() as any;

// Stock actual del producto, ya filtrado por empresa: sin esto se podia
    // mover inventario de otra empresa.
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("current_stock, current_cost, product_type, tenant_id, warehouse_id")
      .eq("id", productId)
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .maybeSingle();

    if (productError) {
      console.error("Error reading product:", productError);
      return NextResponse.json(
        { error: "Error leyendo el producto" },
        { status: 500 }
      );
    }
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado para esta empresa" },
        { status: 404 }
      );
    }

    const stockBefore = num(product.current_stock);
    let stockAfter = stockBefore;

    // Calcular nuevo stock
    if (movementType === "IN") {
      stockAfter = stockBefore + qty;
    } else if (movementType === "OUT") {
      stockAfter = stockBefore - qty;
      if (stockAfter < 0) {
        return NextResponse.json(
          { error: `Stock insuficiente: hay ${stockBefore} y se piden ${qty}` },
          { status: 400 }
        );
      }
    }

    // Si no mandan costo, se usa el del producto: antes totalCost quedaba NaN.
    const cost = num(unitCost, num(product.current_cost));
    const totalCost = cost * qty;
    const now = new Date().toISOString();

    // Crear el movimiento
    const { data: movement, error: movementError } = await supabase
      .from("inventory_movement")
.insert({
        tenant_id: tenantId,
        // `inventory_movement` ya tiene `company_id` (migracion 023) y ademas lo
        // rellena el trigger, pero escribirlo explicito evita depender del
        // trigger para que el aislamiento del kardex se vea en el codigo.
        ...(empresa.companyId ? { company_id: empresa.companyId } : {}),
        product_id: productId,
        warehouse_id: warehouseId ?? product.warehouse_id ?? null,
        movement_type: movementType,
        movement_reason: movementReason,
        quantity: qty,
        unit_cost: cost,
        total_cost: totalCost,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reference_id: referenceId ?? null,
        reference_type: referenceType ?? null,
        reference_number: referenceNumber ?? null,
        lot_number: lotNumber ?? null,
        expiration_date: expirationDate ?? null,
        notes: notes ?? null,
        created_by: "system",
        created_at: now,
        updated_at: now,
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

    // Actualizar stock con actualizacion optimista: el .eq sobre el valor leido
    // evita pisar un descuento concurrente (POS u otro movimiento).
    const { data: updated, error: updateError } = await supabase
      .from("product")
      .update({
        current_stock: stockAfter,
        // Se escribe tambien el espejo: api/inventory/products mantiene las dos
        // columnas y antes un movimiento las desincronizaba.
        stock_quantity: stockAfter,
        updated_at: now,
      })
.eq("id", productId)
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .eq("current_stock", stockBefore)
      .select("current_stock");

    if (updateError || !updated || updated.length !== 1) {
      // El movimiento ya estaba escrito, asi que se deshace para no dejar el
      // kardex diciendo que salio stock que nunca salio.
      await supabase.from("inventory_movement").delete().eq("id", movement.id);
      console.error("[inventory/movements] Stock cambio durante el movimiento:", {
        productId,
        stockBefore,
        updateError: updateError?.message,
      });
      return NextResponse.json(
        {
          error:
            "El stock del producto cambio mientras se registraba el movimiento. Vuelve a intentarlo.",
        },
        { status: 409 }
      );
    }

    // Si es entrada por compra, actualizar costo promedio
    if (movementType === "IN" && movementReason === "purchase" && stockAfter > 0) {
      const newCost = ((stockBefore * num(product.current_cost)) + totalCost) / stockAfter;
      await supabase
        .from("product")
.update({ current_cost: newCost })
        .eq("id", productId)
        .eq("tenant_id", tenantId)
        .match(filtroEmpresaOCompany(empresa));
    }

    return NextResponse.json({
      success: true,
      movement,
message: "Movimiento registrado exitosamente",
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in inventory movement POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

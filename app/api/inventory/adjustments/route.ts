import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export const dynamic = "force-dynamic";

// Esta ruta resolvia solo el tenant, asi que el listado de ajustes mezclaba las
// empresas hermanas de un tenant (test 1 y test 2 comparten `TEST1DS`) y el POST
// hacia `resolveTenant(request) || body.tenant_id`: el cuerpo de la peticion
// decidia en que empresa se guardaba el ajuste, sin comprobar pertenencia.
//
// `inventory_adjustment` tiene `company_id` (medido en el OpenAPI de PostgREST),
// asi que se filtra por ahi. `inventory_adjustment_item` NO tiene columna de
// empresa: se aisla por el padre, y aqui solo se lee embebido desde el ajuste
// ya filtrado, nunca por `item_id` suelto.

const supabase = getSupabaseServer();

// GET - Obtener ajustes de inventario
export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    // `status` se usaba sin declarar, asi que el filtro nunca se aplicaba.
    const status = new URL(request.url).searchParams.get("status");

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
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
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

    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "El ajuste necesita al menos un producto" },
        { status: 400 }
      );
    }

    // Generar número de ajuste, correlativo por EMPRESA. Era por tenant, asi que
    // test 1 y test 2 (mismo `TEST1DS`) se repartian el mismo `AJ-#####`.
    const { data: lastAdjustment } = await (supabase as any)
      .from("inventory_adjustment")
      .select("adjustment_number")
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastNumber = (lastAdjustment as any)?.adjustment_number || "AJ-00000";
    const parsed = parseInt(String(lastNumber).split("-")[1], 10);
    const nextNumber = (Number.isFinite(parsed) ? parsed : 0) + 1;
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
        tenant_id: tenantId,
        ...(empresa.companyId ? { company_id: empresa.companyId } : {}),
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
      // Sin items el ajuste no sirve de nada: se elimina para no dejar un
      // borrador con total 0 que luego se aplicaria al inventario.
      await (supabase as any)
        .from("inventory_adjustment")
        .delete()
        .eq("id", (adjustment as any).id);
      return NextResponse.json(
        { error: "Error creating adjustment items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      adjustment,
      message: "Ajuste creado exitosamente",
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in adjustments POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

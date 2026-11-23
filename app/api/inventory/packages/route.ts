import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// GET - Obtener todos los paquetes de inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get("includeProducts") === "true";
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    let query = getSupabaseServer()
      .from("product")
      .select("*")
      .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .eq("is_service", false);

    // Filtrar solo paquetes (asumimos que packages tienen un campo o los identificamos por nombre)
    // Por ahora traemos todos los productos y los filtramos en el frontend o agregamos un field
    const { data: products, error } = await query.order("name");

    if (error) {
      console.error("Error fetching packages:", error);
      return NextResponse.json(
        { error: "Error fetching packages" },
        { status: 500 }
      );
    }

    // Mapear productos a formato de paquete
    const packages = products?.map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      unit: p.unit,
      unitPrice: p.unit_price,
      currentStock: p.current_stock ?? 0,
      minStock: p.min_stock ?? 0,
      maxStock: p.max_stock ?? 0,
      category: p.category,
      isKit: p.product_type === "kit" || p.name.toLowerCase().includes("kit") || p.name.toLowerCase().includes("paquete"),
    })).filter((p: any) => p.isKit);

    return NextResponse.json(packages);
  } catch (error: any) {
    console.error("=== ERROR IN INVENTORY PACKAGES ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo paquete
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("POST /api/inventory/packages - Request body:", JSON.stringify(body, null, 2));

    const {
      name,
      description,
      components, // Array de { productId, quantity }
      unitPrice,
      unit = "paquete",
      taxRate = 15,
    } = body;

    if (!name) {
      console.error("POST Error: Missing package name");
      return NextResponse.json(
        { error: "Missing package name" },
        { status: 400 }
      );
    }

    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    // Generar código único para el paquete
    const code = `PKG-${Date.now().toString(36).toUpperCase().substring(2, 8)}`;

    // Insertar el paquete como un producto service (is_service = true)
    const { data: packageProduct, error } = await (getSupabaseServer() as any)
      .from("product")
      .insert({
        tenant_id: tenantId,
        company_id: empresa.companyId || null,
        code,
        name,
        description,
        unit,
        unit_price: unitPrice || 0,
        current_cost: unitPrice || 0,
        current_stock: 0,
        stock_quantity: 0,
        min_stock: 0,
        max_stock: 0,
        tax_rate: taxRate,
        product_type: "kit",
        valuation_method: "weighted_average",
        warehouse_id: null,
        location: null,
        location_id: null,
        image_url: null,
        is_service: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating package:", error);
      return NextResponse.json(
        { error: "Error creating package", details: error.message },
        { status: 500 }
      );
    }

    // Si hay componentes, registrarlos (esto es opcional - se pueden agregar después)
    if (components && Array.isArray(components) && components.length > 0 && packageProduct) {
      for (const comp of components) {
        await (getSupabaseServer() as any).from("package_components").insert({
          tenant_id: tenantId,
          package_id: packageProduct.id,
          product_id: comp.productId,
          quantity: comp.quantity || 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      package: packageProduct,
      message: "Paquete creado exitosamente",
    });
  } catch (error: any) {
    console.error("Error in packages POST:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar paquete
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("PATCH /api/inventory/packages - Request body:", JSON.stringify(body, null, 2));

    const {
      id,
      name,
      description,
      unitPrice,
      unit,
      taxRate,
    } = body;

    if (!id) {
      console.error("PATCH Error: Missing package id");
      return NextResponse.json(
        { error: "Missing package id" },
        { status: 400 }
      );
    }

    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    // Map camelCase to snake_case for database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (unitPrice !== undefined) updateData.unit_price = unitPrice;
    if (unit !== undefined) updateData.unit = unit;
    if (taxRate !== undefined) updateData.tax_rate = taxRate;

    const { data: packageProduct, error } = await (getSupabaseServer() as any)
      .from("product")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .select()
      .maybeSingle();

    if (error) {
      console.error("=== SUPABASE ERROR ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return NextResponse.json(
        { error: "Error updating package", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!packageProduct) {
      return NextResponse.json(
        { error: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      package: packageProduct,
      message: "Paquete actualizado exitosamente",
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

// DELETE - Eliminar paquete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      console.error("DELETE Error: Missing package id");
      return NextResponse.json(
        { error: "Missing package id" },
        { status: 400 }
      );
    }

    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const { error } = await (getSupabaseServer() as any)
      .from("product")
      .update({ is_active: false })
      .eq("id", id)
      .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));

    if (error) {
      console.error("=== SUPABASE ERROR ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return NextResponse.json(
        { error: "Error deleting package", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Paquete eliminado exitosamente",
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
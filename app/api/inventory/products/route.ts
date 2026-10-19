import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  medidasDeProductosCon,
  reemplazarMedidasCon,
  validarMedidas,
} from '@/lib/services/product-measures';

export const dynamic = "force-dynamic";

// El tenant sale del header de sesion (`x-tenant-id`, lo inyecta middleware.ts),
// NO de `?companyId`: ese parametro lo manda el cliente y antes ganaba al header,
// asi que cualquier usuario autenticado podia leer y escribir los datos de otra
// empresa con `?companyId=ANGELOH7`. Ademas `?companyId` es un companies.id, no el
// tenant_id que guardan las tablas, y sin traducir daba cero filas.
//
// Ahora ademas baja `company_id` (la empresa concreta) y **valida que pertenezca
// al tenant de la sesion**. Sin eso, dos empresas del mismo tenant (test 1 y
// test 2) comparten inventario, porque las tablas filtraban solo por tenant_id.
// Ver lib/tenant-resolver.ts.

// GET - Obtener productos con datos de inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withStockOnly = searchParams.get("withStock") === "true";
    const productType = searchParams.get("productType");
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    let query = getSupabaseServer()
      .from("product")
      .select('*')
      .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))
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
    const products = (rawProducts ?? []).map((p: any) => ({
      ...p,
      price: p.unit_price,
      sale_price: p.sale_price ?? p.unit_price,
      current_stock: p.current_stock ?? 0,
      min_stock: p.min_stock ?? 0,
      max_stock: p.max_stock ?? 0,
      current_cost: p.current_cost ?? 0,
    }));

    // Una sola consulta para TODOS los productos (nunca una por fila). Si la 074
    // no esta aplicada el servicio devuelve un Map vacio y cada fila sale con
    // `measures: []`, que es lo que la UI espera.
    const medidas = await medidasDeProductosCon(
      getSupabaseServer(),
      {
        tenantId: empresa.tenantId,
        companyId: empresa.companyId as string,
      },
      products.map((p: any) => String(p.id)),
    );

    const conMedidas = products.map((p: any) => ({
      ...p,
      measures: medidas.get(String(p.id)) ?? [],
    }));

    return NextResponse.json(conMedidas);
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
      salePrice,
      minStock,
      maxStock,
      taxRate,
      productType,
      valuationMethod,
      location,
      locationId,
      imageUrl,
      barcode,
      barcodeImageUrl,
      isActive,
      measures,
      price_includes_tax,
    } = body;

    if (!id) {
      console.error("PATCH Error: Missing product id");
      return NextResponse.json(
        { error: "Missing product id" },
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
    if (currentCost !== undefined) updateData.current_cost = currentCost;
    if (salePrice !== undefined) updateData.sale_price = salePrice;
    if (minStock !== undefined) updateData.min_stock = minStock;
    if (maxStock !== undefined) updateData.max_stock = maxStock;
    if (taxRate !== undefined) updateData.tax_rate = taxRate;
    if (productType !== undefined) updateData.product_type = productType;
    if (valuationMethod !== undefined) updateData.valuation_method = valuationMethod;
    if (location !== undefined) updateData.location = location;
    if (locationId !== undefined) updateData.location_id = locationId || null;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    // Codigo de barras: `barcode` es el valor codificado; `barcode_image_url`
    // la foto opcional. La subida de la foto pasa por su propia ruta, pero
    // aqui se puede limpiar el valor o la imagen desde el formulario.
    if (barcode !== undefined) updateData.barcode = barcode || null;
    if (barcodeImageUrl !== undefined) updateData.barcode_image_url = barcodeImageUrl || null;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (price_includes_tax !== undefined) {
      updateData.price_includes_tax = Boolean(price_includes_tax);
    }

    console.log("PATCH - Update data:", JSON.stringify(updateData, null, 2));

    // Antes el update era solo `.eq("id", id)`, sin filtro de tenant: cualquier
    // usuario autenticado podia modificar el producto de otra empresa con solo
    // conocer el id. Ahora exige que la fila sea de esta empresa.
    const empresaPatch = await contextoDeEmpresa(request);
    if (!empresaPatch.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const { data: product, error } = await (getSupabaseServer() as any)
      .from("product")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", empresaPatch.tenantId)
      .match(filtroEmpresaOCompany(empresaPatch))
      .select()
      .maybeSingle();

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

    if (Array.isArray(measures)) {
      const medidas = await reemplazarMedidasCon(
        getSupabaseServer(),
        {
          tenantId: empresaPatch.tenantId,
          companyId: empresaPatch.companyId as string,
        },
        id,
        measures,
      );

      return NextResponse.json({
        success: true,
        product: { ...(product as any), measures: medidas },
        measures: medidas,
        message: "Producto actualizado exitosamente",
      });
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
      unit,
      unitPrice,
      currentCost,
      salePrice,
      currentStock = 0,
      minStock = 0,
      maxStock = 0,
      taxRate = 15,
      productType = 'product',
      valuationMethod = 'weighted_average',
      warehouseId,
      location,
      locationId,
      imageUrl,
      barcode,
      barcodeImageUrl,
      isService = false,
      measures,
      price_includes_tax,
    } = body;
    // Contexto de empresa con comprobacion de pertenencia. Antes esta ruta
    // aceptaba `?companyId` POR DELANTE del header y luego `body.tenantId`, o
    // sea que el cliente decidia en que empresa se guardaba el producto.
    // Ver lib/tenant-resolver.ts.
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "El nombre del producto (name) es requerido" },
        { status: 400 }
      );
    }

    // Se valida ANTES de insertar: un factor invalido no debe dejar un producto
    // creado sin sus medidas.
    let medidasValidadas: ReturnType<typeof validarMedidas>;
    try {
      medidasValidadas = validarMedidas(measures ?? [], unit || "Unidad");
    } catch (medidaError: any) {
      return NextResponse.json(
        { error: medidaError?.message || "Medidas del producto invalidas" },
        { status: 400 }
      );
    }

    // Auto-generar código si no se proporciona
    if (!code) {
      // Obtener el último código de producto
      const { data: lastProduct } = await getSupabaseServer()
        .from("product")
        .select("code")
        .eq("tenant_id", tenantId)
        .match(filtroEmpresaOCompany(empresa))
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
    const { data: existing } = await (getSupabaseServer() as any)
      .from("product")
      .select("id")
      .eq("code", code)
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un producto con ese código" },
        { status: 400 }
      );
    }

    const { data: product, error } = await (getSupabaseServer() as any)
      .from("product")
      .insert({
        tenant_id: tenantId,
        // product ya tenia company_id, asi que se puede escribir explicito. El
        // trigger de la migracion 023 tambien lo rellena, pero depender solo del
        // trigger oculta el dato en el codigo y hace el INSERT mas fragil.
        ...(empresa.companyId ? { company_id: empresa.companyId } : {}),
        code,
        name,
        description,
        unit: unit || 'Unidad',
        unit_price: unitPrice,
        current_cost: currentCost || unitPrice,
        sale_price: salePrice ?? 0,
        current_stock: currentStock,
        stock_quantity: currentStock,
        min_stock: minStock,
        max_stock: maxStock,
        tax_rate: taxRate,
        product_type: productType,
        valuation_method: valuationMethod,
        warehouse_id: warehouseId,
        location: location || null,
        location_id: locationId || null,
        image_url: imageUrl || null,
        barcode: barcode || null,
        barcode_image_url: barcodeImageUrl || null,
        is_service: isService,
        is_active: true,
        price_includes_tax: Boolean(price_includes_tax),
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

    // Las medidas son parte del alta: si fallan, se borra el producto recien
    // creado. Dejar un producto sin sus empaques es peor que no crearlo.
    let medidasCreadas: Awaited<ReturnType<typeof reemplazarMedidasCon>>;
    try {
      medidasCreadas = await reemplazarMedidasCon(
        getSupabaseServer(),
        {
          tenantId,
          companyId: empresa.companyId as string,
        },
        (product as any).id,
        medidasValidadas,
      );
    } catch (medidaError: any) {
      console.error("Error creating product measures:", medidaError);
      const { error: deleteError } = await getSupabaseServer()
        .from("product")
        .delete()
        .eq("id", (product as any).id)
        .eq("tenant_id", tenantId)
        .eq("company_id", empresa.companyId as string);

      if (deleteError) {
        console.error("Error compensating product:", deleteError);
      }

      return NextResponse.json(
        {
          error: medidaError?.message || "Error guardando las medidas del producto",
          details: medidaError?.message,
        },
        { status: 500 }
      );
    }

    // Si tiene stock inicial, crear movimiento de entrada
    if (currentStock > 0 && currentCost) {
      await (getSupabaseServer() as any).from("inventory_movement").insert({
        tenant_id: tenantId,
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

    return NextResponse.json(
      {
        success: true,
        product: { ...(product as any), measures: medidasCreadas },
        measures: medidasCreadas,
        message: "Producto creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in products POST:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

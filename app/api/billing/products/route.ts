import { NextRequest, NextResponse } from "next/server";
import { resolveTenant as resolveTenantDelRequest } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// El tenant se toma del id de empresa de la URL del POS, que es lo mas
// autoritativo para esa pantalla, y luego del header que inyecta middleware.ts.
// Antes estaba fijado en "1", asi que el POS de cualquier otra empresa listaba
// los productos de "Empresa 1" y nunca los suyos.
// El tenant sale del header de sesion (`x-tenant-id`, lo inyecta middleware.ts),
// NO de `?companyId`: ese parametro lo manda el cliente y antes ganaba al header,
// asi que cualquier usuario autenticado podia leer y escribir los datos de otra
// empresa con `?companyId=ANGELOH7`. Ademas `?companyId` es un companies.id, no el
// tenant_id que guardan las tablas, y sin traducir daba cero filas.
// Ver lib/tenant-resolver.ts.
async function resolveTenant(request: NextRequest): Promise<string | null> {
  return resolveTenantDelRequest(request);
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveTenant(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data: products, error } = (await (supabase as any)
      .from("product")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("code", { ascending: true })) as { data: any[]; error: any };

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error fetching products" },
        { status: 500 }
      );
    }

    // Los precios del inventario ya estan en la moneda de la factura
    // (lempiras, no centavos), igual que InvoiceItem.unitPrice. Dividir entre
    // 100 mostraba "L 0.02" por un guante de L 2.
    // El stock real es current_stock; stock_quantity solo se mantiene como
    // espejo y venia en 0 en filas antiguas.
    const formattedProducts = (products || []).map((p) => ({
      ...p,
      unit_price: Number(p.unit_price) || 0,
      tax_rate: Number(p.tax_rate) || 0,
      stock: Number(p.current_stock ?? p.stock_quantity ?? 0) || 0,
    }));

    return NextResponse.json(formattedProducts);
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
    const tenantId = await resolveTenant(request) || body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const { code, name, description, unit_price, tax_rate, is_service, stock_quantity, category } = body;
    const price = Number(unit_price) || 0;
    const stock = Number(stock_quantity) || 0;

    const supabase = getSupabaseServer();

    const { data, error } = (await (supabase as any)
      .from("product")
      .insert({
        code,
        name,
        description,
        // Se guarda en la misma unidad que la factura: sin *100.
        unit_price: price,
        tax_rate: Number(tax_rate) || 0,
        is_service: Boolean(is_service),
        is_active: true,
        stock_quantity: stock,
        current_stock: stock,
        category,
        tenant_id: tenantId,
      })
      .select()
      .single()) as { data: any; error: any };

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

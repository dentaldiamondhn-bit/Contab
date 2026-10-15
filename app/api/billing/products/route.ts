import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// La empresa sale del contexto validado (`contextoDeEmpresa`), NUNCA solo del
// tenant. `product` tiene `company_id` (migracion 023) y `TEST1DS` tiene dos
// empresas: filtrar por `tenant_id` hacia que el POS de test 1 listara el
// inventario de test 2. Antes estaba fijado en "1". Ver AGENTS.md seccion 1.
export async function GET(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    const supabase = getSupabaseServer();

    const { data: products, error } = (await (supabase as any)
      .from("product")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", empresa.companyId)
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in products GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    const { code, name, description, unit_price, tax_rate, is_service, stock_quantity, category } = await request.json();
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
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId,
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in products POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

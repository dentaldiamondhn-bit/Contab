import { NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: any) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Intentar leer como Excel primero, luego como CSV
    let products = [];

    try {
      // Intentar leer como Excel (.xlsx, .xls)
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      products = XLSX.utils.sheet_to_json(worksheet);
    } catch (e) {
      // Si falla Excel, intentar CSV
      try {
        const text = buffer.toString("utf-8");
        products = JSON.parse(text);
      } catch (e2) {
        return NextResponse.json(
          { error: "No se pudo parsear el archivo" },
          { status: 400 }
        );
      }
    }

    // Validar que tengamos datos
    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron datos en el archivo" },
        { status: 400 }
      );
    }

    // Crear cliente Supabase de forma segura
    const { createClient } = await import("@supabase/ssr");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Preparar productos para insertar (solo columnas críticas)
    const productsToInsert = products.map((product: any) => ({
      id: product.id || `prod-${Date.now()}`,
      code: product.code || product.codigo || `PROD-${Date.now().toString(36).toUpperCase().substring(2, 8)}`,
      name: product.name || product.nombre || product.productName || "",
      is_active: product.is_active !== undefined ? product.is_active : true,
      min_stock: product.min_stock !== undefined ? Number(product.min_stock) : 10,
      current_stock: product.current_stock !== undefined ? Number(product.current_stock) : 0,
      stockquantity: 0, // Valor por defecto para NOT NULL
      tenant_id: product.tenant_id || product.tenantId || "1",
      company_id: product.company_id || product.companyId || "c1-test1",
      unit: product.unit || product.unidad || "unidad",
      category: product.category || product.categoria || "Insumos",
    }));

    // Insertar en lotes
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from("product")
        .insert(batch);

      if (error) {
        errorCount += batch.length;
        console.error("Error inserting batch:", error.message);
      } else {
        successCount += batch.length;
      }
    }

    return NextResponse.json({
      message: `${successCount} productos insertados exitosamente`,
      errors: errorCount,
      total: productsToInsert.length,
    });

  } catch (error: any) {
    console.error("Error en bulk-upload:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
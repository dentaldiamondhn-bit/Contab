import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    const data = [
      ["fecha", "tipo", "descripcion", "monto"],
      ["2026-09-01", "INGRESO", "Venta de servicio A", "1500.00"],
      ["2026-09-02", "EGRESO", "Compra de suministros", "500.00"],
      ["2026-09-03", "INGRESO", "Pago de cliente B", "3200.00"],
      ["2026-09-05", "EGRESO", "Servicios de internet", "850.00"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Transacciones");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    const base64 = excelBuffer.toString("base64");

    return new NextResponse(Buffer.from(base64, "base64"), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla_transacciones.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("template-download error", error);
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}

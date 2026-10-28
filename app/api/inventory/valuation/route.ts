import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "";
    const fechaInicial = searchParams.get("fechaInicial") || "";
    const fechaFinal = searchParams.get("fechaFinal") || "";
    const method = searchParams.get("method") || "fifo"; // fifo, lifo, average, average_period
    const companyId = searchParams.get("companyId") || "";

    if (!productId || !fechaInicial || !fechaFinal) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: productId, fechaInicial, fechaFinal" },
        { status: 400 }
      );
    }

    let resultado: any;

    // Calcular según el método seleccionado
    switch (method) {
      case "fifo":
        // Importar dinámicamente o usar evaluación inline
        resultado = {
          costoCogs: 1120,
          valorInventarioFinal: 890.50,
          costoUnitario: 8.50,
          cantidadVendida: 45,
          cantidadQued: 12,
          metodo: "fifo",
        };
        break;
      case "lifo":
        resultado = {
          costoCogs: 1300,
          valorInventarioFinal: 810.50,
          costoUnitario: 11.73,
          cantidadVendida: 45,
          cantidadQued: 12,
          metodo: "lifo",
        };
        break;
      case "average":
      case "average_period":
        resultado = {
          costoCogs: 1210,
          valorInventarioFinal: 990.00,
          costoUnitario: 11.00,
          cantidadVendida: 45,
          cantidadQued: 12,
          metodo: "average",
        };
        break;
      default:
        return NextResponse.json(
          { error: "Método no soportado. Use: fifo, lifo, average, average_period" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      metodo: method,
      productoId: productId,
      periodo: { fechaInicial, fechaFinal },
      ...resultado,
    });
  } catch (error: any) {
    console.error("Error en valoración de inventario:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, method, fechaInicial, fechaFinal, companyId } = body;

    if (!productId || !method || !fechaInicial || !fechaFinal) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: productId, method, fechaInicial, fechaFinal" },
        { status: 400 }
      );
    }

    // Respuesta de ejemplo para actualización
    return NextResponse.json({
      success: true,
      mensaje: "Valoración actualizada exitosamente",
      datos: {
        metodo: method,
        productoId: productId,
        costoCogs: 1120,
        valorInventarioFinal: 890.50,
        costoUnitario: 8.50,
        cantidadVendida: 45,
        cantidadQued: 12,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar valuación:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
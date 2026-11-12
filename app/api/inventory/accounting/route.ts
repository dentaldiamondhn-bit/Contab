import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";

export const dynamic = "force-dynamic";

// Esta ruta solo resolvia el tenant. Ademas mandaba `companyId: tenantId` al
// asiento contable, o sea un `Tenant.id` ("TEST1DS") donde `/api/accounting/
// transactions` espera un `companies.id`: `empresaDesde` caia a la empresa MAS
// ANTIGUA del tenant, asi que las compras de inventario de test 2 se contabilizaban
// en el libro de test 1. Ahora `contextoDeEmpresa` valida la pertenencia (403) y
// se propaga el `company_id` real.

// POST - Generar asiento contable para compra de inventario
export async function POST(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, data } = body; // type: 'purchase', 'sale', 'adjustment'

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // /api/accounting/transactions resuelve el tenant por el header o por
    // ?tenantId=; antes este fetch no pasaba ninguno y devolvia 401, asi que los
    // cuatro tipos de asiento fallaban siempre.
    const postEntry = (payload: Record<string, unknown>) =>
      fetch(`${baseUrl}/api/accounting/transactions?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          ...payload,
          tenant_id: tenantId,
          // `company_id` es `companies.id`. Mandar aqui el `Tenant.id` hacia que
          // el asiento se atribuyera a la empresa hermana mas antigua.
          companyId: empresa.companyId ?? undefined,
        }),
      });

    if (type === 'purchase') {
      // Asiento para compra de inventario:
      // Debe: Inventario (1xxx)
      // Haber: Bancos/Proveedores (2xxx)
      const { supplierId, invoiceNumber, totalAmount, items } = data;

      const journalEntries = [
        {
          accountId: '1105', // Inventario de Mercadería (ejemplo)
          amount: totalAmount * 100, // En centavos
          type: 'DEBIT',
        },
        {
          accountId: supplierId ? '2101' : '1101', // Proveedores o Bancos
          amount: totalAmount * 100,
          type: 'CREDIT',
        },
      ];

      const response = await postEntry({
        voucherType: 'COMPRA',
        voucherNumber: `COM-${invoiceNumber}`,
        date: new Date().toISOString().split('T')[0],
        description: `Compra de inventario - Factura ${invoiceNumber}`,
        reference: supplierId,
        journalEntries,
      });

      if (!response.ok) {
        throw new Error('Error creating purchase accounting entry');
      }

      return NextResponse.json({
        success: true,
        message: 'Asiento contable de compra generado',
      });
    }

    if (type === 'sale') {
      // Asiento para costo de ventas:
      // Debe: Costo de Ventas (5xxx)
      // Haber: Inventario (1xxx)
      const { invoiceId, invoiceNumber, costOfGoodsSold, productId } = data;

      const journalEntries = [
        {
          accountId: '5101', // Costo de Ventas
          amount: costOfGoodsSold * 100,
          type: 'DEBIT',
        },
        {
          accountId: '1105', // Inventario
          amount: costOfGoodsSold * 100,
          type: 'CREDIT',
        },
      ];

      const response = await postEntry({
        voucherType: 'EGRESO',
        voucherNumber: `CV-${invoiceNumber}`,
        date: new Date().toISOString().split('T')[0],
        description: `Costo de ventas - Factura ${invoiceNumber}`,
        reference: invoiceId,
        journalEntries,
      });

      if (!response.ok) {
        throw new Error('Error creating COGS accounting entry');
      }

      return NextResponse.json({
        success: true,
        message: 'Asiento contable de costo de ventas generado',
      });
    }

    if (type === 'adjustment') {
      // Asiento para ajuste de inventario:
      // Si sobrante: Debe Inventario / Haber Ingresos
      // Si faltante: Debe Gastos / Haber Inventario
      const { adjustmentId, adjustmentNumber, adjustmentType, totalDifference } = data;

      let journalEntries: any[] = [];

      if (adjustmentType === 'surplus') {
        // Sobrante
        journalEntries = [
          {
            accountId: '1105', // Inventario
            amount: Math.abs(totalDifference) * 100,
            type: 'DEBIT',
          },
          {
            accountId: '4101', // Otros Ingresos
            amount: Math.abs(totalDifference) * 100,
            type: 'CREDIT',
          },
        ];
      } else if (adjustmentType === 'shortage') {
        // Faltante
        journalEntries = [
          {
            accountId: '5201', // Gastos por Faltantes
            amount: Math.abs(totalDifference) * 100,
            type: 'DEBIT',
          },
          {
            accountId: '1105', // Inventario
            amount: Math.abs(totalDifference) * 100,
            type: 'CREDIT',
          },
        ];
      } else if (adjustmentType === 'damage') {
        // Merma/Daño
        journalEntries = [
          {
            accountId: '5202', // Merma o Daño
            amount: Math.abs(totalDifference) * 100,
            type: 'DEBIT',
          },
          {
            accountId: '1105', // Inventario
            amount: Math.abs(totalDifference) * 100,
            type: 'CREDIT',
          },
        ];
      }

      const response = await postEntry({
        voucherType: 'AJUSTE',
        voucherNumber: `AJ-${adjustmentNumber}`,
        date: new Date().toISOString().split('T')[0],
        description: `Ajuste de inventario ${adjustmentType} - ${adjustmentNumber}`,
        reference: adjustmentId,
        journalEntries,
      });

      if (!response.ok) {
        throw new Error('Error creating adjustment accounting entry');
      }

      return NextResponse.json({
        success: true,
        message: 'Asiento contable de ajuste generado',
      });
    }

    if (type === 'consumption') {
      // Asiento para consumo interno (suministros):
      // Debe: Gasto Operativo (5xxx)
      // Haber: Inventario (1xxx)
      const { productId, quantity, unitCost, totalCost, notes } = data;

      const journalEntries = [
        {
          accountId: '5203', // Consumo de Suministros
          amount: totalCost * 100,
          type: 'DEBIT',
        },
        {
          accountId: '1105', // Inventario
          amount: totalCost * 100,
          type: 'CREDIT',
        },
      ];

      const response = await postEntry({
        voucherType: 'EGRESO',
        voucherNumber: `CON-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: `Consumo interno - ${notes || 'Suministros'}`,
        reference: productId,
        journalEntries,
      });

      if (!response.ok) {
        throw new Error('Error creating consumption accounting entry');
      }

      return NextResponse.json({
        success: true,
        message: 'Asiento contable de consumo generado',
      });
    }

    return NextResponse.json(
      { error: 'Invalid accounting type' },
      { status: 400 }
    );
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in inventory accounting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

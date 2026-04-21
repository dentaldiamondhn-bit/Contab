import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

// POST - Generar asiento contable para compra de inventario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body; // type: 'purchase', 'sale', 'adjustment'

    const supabase = createSupabaseClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

      const response = await fetch(`${baseUrl}/api/accounting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: '1',
          voucherType: 'COMPRA',
          voucherNumber: `COM-${invoiceNumber}`,
          date: new Date().toISOString().split('T')[0],
          description: `Compra de inventario - Factura ${invoiceNumber}`,
          reference: supplierId,
          journalEntries,
        }),
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

      const response = await fetch(`${baseUrl}/api/accounting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: '1',
          voucherType: 'EGRESO',
          voucherNumber: `CV-${invoiceNumber}`,
          date: new Date().toISOString().split('T')[0],
          description: `Costo de ventas - Factura ${invoiceNumber}`,
          reference: invoiceId,
          journalEntries,
        }),
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

      const response = await fetch(`${baseUrl}/api/accounting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: '1',
          voucherType: 'AJUSTE',
          voucherNumber: `AJ-${adjustmentNumber}`,
          date: new Date().toISOString().split('T')[0],
          description: `Ajuste de inventario ${adjustmentType} - ${adjustmentNumber}`,
          reference: adjustmentId,
          journalEntries,
        }),
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

      const response = await fetch(`${baseUrl}/api/accounting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: '1',
          voucherType: 'EGRESO',
          voucherNumber: `CON-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          description: `Consumo interno - ${notes || 'Suministros'}`,
          reference: productId,
          journalEntries,
        }),
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
    console.error('Error in inventory accounting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

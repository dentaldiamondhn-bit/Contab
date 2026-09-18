/**
 * Módulo de integración de inventario con contabilidad automática
 * Cuando se crean ventas (INGRESO), reduce automáticamente el inventario
 * y crea el asiento de Cost of Goods Sold (COGS).
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { createJournalTransaction } from '@/lib/services/journal-service';
import { formatCurrency } from '@/lib/currency-utils';

/**
 * Cuentas por defecto para integración de inventario
 * Estas cuentas deberían existir en el catálogo de cuentas de cada empresa
 */
export enum InventoryAccountCodes {
  INVENTORY = '1500', // Activo: Inventario
  COGS = '2100',      // Gasto: Cost of Goods Sold
}

/**
 * Interface for inventory integration data
 */
export interface InventoryIntegrationData {
  productId: string;
  productCode: string;
  productName: string;
  quantitySold: number;
  unitCost: number; // costo unitario al momento de la venta
  totalCost: number; // costo total = quantitySold * unitCost
}

/**
 * Verifica si una cuenta es de inventario o COGS
 */
export function isInventoryAccount(code: string): boolean {
  return code === InventoryAccountCodes.INVENTORY;
}

export function isCOGSAccount(code: string): boolean {
  return code === InventoryAccountCodes.COGS;
}

/**
 * Obtiene la cuenta de inventario para un tenant
 * Busca en el catálogo de cuentas una cuenta con código 1500 o similar
 */
async function getInventoryAccount(tenantId: string): Promise<{ id: string; code: string; name: string } | null> {
  try {
    const { data, error } = await db.account.findFirst({
      where: {
        tenantId,
        code: InventoryAccountCodes.INVENTORY,
      },
    });

    if (error || !data) {
      // Intentar con búsqueda por nombre como fallback
      const { data: fallback, error: fallbackError } = await db.account.findFirst({
        where: {
          tenantId,
          name: { contains: 'Inventario' },
        },
      });

      if (fallbackError || !fallback) return null;
      return { id: fallback.id, code: fallback.code, name: fallback.name };
    }

    return { id: data.id, code: data.code, name: data.name };
  } catch (error) {
    console.error("Error getting inventory account:", error);
    return null;
  }
}

/**
 * Obtiene la cuenta de COGS para un tenant
 */
async function getCOGSAccount(tenantId: string): Promise<{ id: string; code: string; name: string } | null> {
  try {
    const { data, error } = await db.account.findFirst({
      where: {
        tenantId,
        code: InventoryAccountCodes.COGS,
      },
    });

    if (error || !data) {
      // Intentar con búsqueda por nombre como fallback
      const { data: fallback, error: fallbackError } = await db.account.findFirst({
        where: {
          tenantId,
          name: { contains: 'COGS' } || { contains: 'Costo de Ventas' } || { contains: 'Gasto de Ventas' },
        },
      });

      if (fallbackError || !fallback) return null;
      return { id: fallback.id, code: fallback.code, name: fallback.name };
    }

    return { id: data.id, code: data.code, name: data.name };
  } catch (error) {
    console.error("Error getting COGS account:", error);
    return null;
  }
}

/**
 * Calcula el costo total de los productos vendidos
 * Basado en el costo unitario actual de los productos en inventario
 */
async function calculateCOGS(
  productIds: string[],
  quantities: number[],
  tenantId: string
): Promise<{
  totalCOGS: number;
  details: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}> {
  try {
    // Obtener productos con su costo actual
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
      },
      include: {
        // No hay relación directa, traer todas las fields
      },
    });

    const details = products.map((product: any) => {
      const qtyIndex = productIds.indexOf(product.id);
      const quantity = qtyIndex >= 0 ? quantities[qtyIndex] : 0;
      const unitCost = product.unitCost || 0;
      const totalCost = quantity * unitCost;

      return {
        productId: product.id,
        productCode: product.code || '',
        productName: product.name,
        quantity,
        unitCost,
        totalCost,
      };
    });

    const totalCOGS = details.reduce((sum, detail) => sum + detail.totalCost, 0);

    return { totalCOGS, details };
  } catch (error) {
    console.error("Error calculating COGS:", error);
    return { totalCOGS: 0, details: [] };
  }
}

/**
 * Crea el asiento automático de COGS cuando se vende un producto
 * Este asiento debe llamarse después de crear la transacción de venta
 */
export async function createCOGSEntry(
  tenantId: string,
  saleTransactionId: string,
  description: string,
  options: {
    productIds?: string[];
    quantities?: number[];
    overrideUnitCosts?: number[]; // Para forzar costos unitarios específicos
  } = {}
): Promise<{
  success: boolean;
  cogsEntry?: any;
  error?: string;
}> {
  try {
    // Obtener cuentas de inventario y COGS
    const inventoryAccount = await getInventoryAccount(tenantId);
    const cogsAccount = await getCOGSAccount(tenantId);

    if (!inventoryAccount) {
      return { success: false, error: 'Cuenta de inventario no configurada (1500)' };
    }

    if (!cogsAccount) {
      return { success: false, error: 'Cuenta de COGS no configurada (2100)' };
    }

    // Si no se proporcionan IDs y cantidades, intentar obtenerlos de los productos vendidos
    // en la transacción de venta
    let productIds = options.productIds;
    let quantities = options.quantities;

    if (!productIds || !quantities || productIds.length === 0) {
      // Intentar obtener de las entradas de la transacción
      // Not: Esto requiere que la transacción tenga entries con información de producto
      return {
        success: false,
        error: 'Se deben proporcionar productIds y quantities, o la transacción debe tener entries con product info',
      };
    }

    // Calcular COGS
    const { totalCOGS, details } = await calculateCOGS(productIds, quantities, tenantId);

    if (totalCOGS === 0) {
      return { success: false, error: 'No se pudo calcular COGS - total es 0' };
    }

    // Crear asientos de journal entry:
    // 1. Débito a COGS (account 2100) por el costo total
    // 2. Crédito a Inventario (account 1500) por el costo total
    
    const cogsEntry = await createJournalTransaction(tenantId, {
      description: description || `COGS - Venta de inventario`,
      voucherType: 'AJUSTE', // Usar AJUSTE ya que es un ajuste de costos
      entries: [
        {
          accountId: cogsAccount.id,
          amount: totalCOGS, // Débitos son positivos
          isDebit: true,
          description: `COGS: ${details.map(d => `${d.productCode}-${d.productName}`).join(', ')}`,
        },
        {
          accountId: inventoryAccount.id,
          amount: -totalCOGS, // Créditos son negativos en el sistema
          isDebit: false,
          description: `Reducción de inventario por venta de ${details.length} productos`,
        },
      ],
    });

    if (!cogsEntry) {
      return { success: false, error: 'Error al crear el asiento de COGS' };
    }

    return {
      success: true,
      cogsEntry,
    };
  } catch (error) {
    console.error("Error creating COGS entry:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Hook para integrar inventario automáticamente al crear una venta
 * Esta función debería llamarse DESPUÉS de crear exitosamente una transacción de venta
 * 
 * @param tenantId ID del tenant
 * @param transactionId ID de la transacción de venta creada
 * @param productInfo Información de los productos vendidos y cantidades
 * @param description Descripción de la venta
 */
export async function integrateSaleWithInventory(
  tenantId: string,
  transactionId: string,
  productInfo: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitCost?: number; // Si no se proporciona, se usa el costo actual del producto
  }>,
  description: string
): Promise<{
  success: boolean;
  cogsEntry?: any;
  inventoryReduction?: any;
  error?: string;
}> {
  try {
    // 1. Calcular el costo total basándose en los costos unitarios proporcionados
    // o los costos actuales de los productos en inventario
    const productIds = productInfo.map(p => p.productId);
    const quantities = productInfo.map(p => p.quantity);
    const unitCosts = productInfo.map(p => p.unitCost);

    // Si algunos costos unitarios no están provistos, obtenerlos de la base de datos
    const productsFromDB = await db.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
      },
    });

    const effectiveUnitCosts = unitCosts.map((providedCost, index) => {
      const product = productsFromDB.find(p => p.id === productIds[index]);
      return providedCost || (product?.unitCost || 0);
    });

    // 2. Calcular COGS con los costos efectivos
    const { totalCOGS, details } = await calculateCOGS(productIds, quantities, tenantId);

    if (totalCOGS === 0) {
      return { success: false, error: 'No se pudo calcular COGS - total es 0' };
    }

    // 3. Crear el asiento de COGS
    const cogsDescription = `${description} - COGS automático`;
    
    const cogsResult = await createJournalTransaction(tenantId, {
      description: cogsDescription,
      voucherType: 'AJUSTE',
      entries: [
        {
          accountId: (await getCOGSAccount(tenantId))!.id,
          amount: totalCOGS,
          isDebit: true,
          description: `COGS automático: ${details.map(d => `${d.productCode}-${d.qty}x${d.unitCost}HNL`).join(', ')}`,
        },
        {
          accountId: (await getInventoryAccount(tenantId))!.id,
          amount: -totalCOGS,
          isDebit: false,
          description: `Reducción automática de inventario por venta`,
        },
      ],
    });

    // 4. Reducir el stock de inventario
    // Actualizar la tabla product con el nuevo stock
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const quantity = quantities[i];
      const unitCost = effectiveUnitCosts[i];

      await db.product.update({
        where: { id: productId },
        data: {
          currentStock: db.raw(`currentStock - ${quantity}`),
          // También podríamos querer tracking más detallado
        },
      });
    }

    return {
      success: true,
      cogsEntry: cogsResult,
      inventoryReduction: {
        productCount: productInfo.length,
        totalQuantity: quantities.reduce((sum, q) => sum + q, 0),
        totalCOGS,
      },
    };
  } catch (error) {
    console.error("Error integrating sale with inventory:", error);
    return { success: false, error: (error as Error).message };
  }
}

export default {
  createCOGSEntry,
  integrateSaleWithInventory,
  getInventoryAccount,
  getCOGSAccount,
  isInventoryAccount,
  isCOGSAccount,
  calculateCOGS,
};
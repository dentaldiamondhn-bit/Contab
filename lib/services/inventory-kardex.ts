// services/inventory-kardex.ts
// Helper para ejecutar movimientos en el kardex de inventario
// Asegura pasar company_id, location_id, batch_id y tipo de movimiento

import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

// Usar el cliente server-side para bypass RLS
const supabase = getSupabaseServer();

/**
 * Tipos de movimiento de inventario
 */
export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

/**
 * Interfaz para un movimiento de kardex
 */
export interface InventoryMovementInput {
  product_id: string;
  company_id: string;
  quantity: number;
  movement_type: MovementType;
  location_id?: string; // Opcional: ID del estante/bodega
  batch_id?: string;    // Opcional: ID del lote
  reference_type?: 'invoice' | 'purchase' | 'adjustment' | null;
  reference_id?: string; // ID de la factura/compra/ajuste relacionado
  notes?: string; // Observaciones opcionales
  warehouse_id?: string; // ID de la bodega (si aplica)
}

/**
 * Ejecutar un movimiento de kardex
 * Este es el punto de entrada único para todas las operaciones de stock.
 * 
 * Lógica:
   1. Inserta el movimiento en inventory_movement
   2. El trigger trg_sync_product_stock actualiza automáticamente
      current_stock y stock_quantity en product
   3. Retorna el movimiento creado y el nuevo estado de stock
 * 
 * @param movement - Datos del movimiento a registrar
 * @returns Movimiento creado y nuevo stock
 */
export async function kardexMovement(movement: InventoryMovementInput) {
  const {
    product_id,
    company_id,
    quantity,
    movement_type,
    location_id,
    batch_id,
    reference_type,
    reference_id,
    notes,
    warehouse_id,
  } = movement;

  // 1. Insertar el movimiento en inventory_movement
  const { data: movimientoCreado, error: movementError } = await supabase
    .from('inventory_movement')
    .insert({
      product_id,
      company_id,
      quantity,
      movement_type,
      location_id,
      batch_id,
      reference_type,
      reference_id,
      notes,
      warehouse_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (movementError) {
    console.error('Error inserting inventory_movement:', movementError);
    throw new Error('No se pudo registrar el movimiento de kardex: ' + movementError.message);
  }

  // 2. El trigger fn_sync_product_stock_from_kardex() se ejecuta automáticamente
  // y actualiza current_stock y stock_quantity en la tabla product.
  // No necesitamos hacer un UPDATE adicional aquí porque el trigger lo hace.

  // 3. Retornar el movimiento creado y el nuevo estado de stock
  // Para obtener el stock actualizado, haremos una consulta rápida
  const { data: product, error: productError } = await supabase
    .from('product')
    .select('id, current_stock, stock_quantity')
    .eq('id', product_id)
    .eq('company_id', company_id)
    .single();

  if (productError) {
    console.error('Error fetching product stock after movement:', productError);
    // No lanzamos error aquí para no romper el flujo, 
    // el movimiento ya se registro correctamente
  }

  return {
    movement: movimientoCreado,
    product: product || {
      id: product_id,
      current_stock: movimientoCreado.quantity,
      stock_quantity: movimientoCreado.quantity,
    },
    action: movement_type,
  };
}

/**
 * Registrar una ENTRADA de stock (recepción de mercancía)
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @param quantity - Cantidad recibida (siempre positiva)
 * @param locationId - ID del estante/bodega (opcional)
 * @param batchId - ID del lote (opcional)
 * @param invoiceId - ID de la factura de compra (opcional)
 * @param notes - Observaciones
 */
export async function registrarEntradaStock(
  productId: string,
  companyId: string,
  quantity: number,
  locationId?: string,
  batchId?: string,
  invoiceId?: string,
  notes?: string
) {
  return kardexMovement({
    product_id: productId,
    company_id: companyId,
    quantity,
    movement_type: 'ENTRADA',
    location_id: locationId,
    batch_id: batchId,
    reference_type: 'purchase',
    reference_id: invoiceId,
    notes,
  });
}

/**
 * Registrar una SALIDA de stock (venta o consumo)
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @param quantity - Cantidad a despachar (siempre positiva)
 * @param locationId - ID del estante/bodega (opcional)
 * @param batchId - ID del lote (opcional)
 * @param invoiceId - ID de la factura de venta (opcional)
 * @param notes - Observaciones
 */
export async function registrarSalidaStock(
  productId: string,
  companyId: string,
  quantity: number,
  locationId?: string,
  batchId?: string,
  invoiceId?: string,
  notes?: string
) {
  return kardexMovement({
    product_id: productId,
    company_id: companyId,
    quantity,
    movement_type: 'SALIDA',
    location_id: locationId,
    batch_id: batchId,
    reference_type: 'invoice',
    reference_id: invoiceId,
    notes,
  });
}

/**
 * Registrar un AJUSTE de stock (conteo físico, devolución, pérdida)
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @param quantity - Cantidad de ajuste (puede ser positiva o negativa)
 * @param locationId - ID del estante/bodega (opcional)
 * @param adjustmentType - 'FISICO', 'DEVOLUCION', 'PERDIDA', etc.
 * @param referenceId - ID de la factura o movimiento original (opcional)
 * @param notes - Observaciones
 */
export async function registrarAjusteStock(
  productId: string,
  companyId: string,
  quantity: number, // Puede ser negativo para reducir stock
  locationId?: string,
  adjustmentType: 'FISICO' | 'DEVOLUCION' | 'PERDIDA' | 'OTRO' = 'FISICO',
  referenceId?: string,
  notes?: string
) {
  return kardexMovement({
    product_id: productId,
    company_id: companyId,
    quantity, // Signo ya definido por el caller (positivo = entrada, negativo = salida)
    movement_type: 'AJUSTE',
    location_id: locationId,
    batch_id: null, // Los ajustes typically no tienen batch
    reference_type: 'adjustment',
    reference_id: referenceId,
    notes: `${adjustmentType}: ${notes || ''}`,
  });
}

/**
 * Obtener el historial de movimientos de un producto
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @param options - Filtros opcionales
 * @returns Historial de movimientos con stock actual
 */
export async function obtenerHistorialMovimientos(
  productId: string,
  companyId: string,
  options: {
    limit?: number;
    movement_type?: MovementType;
    startDate?: string;
    endDate?: string;
  } = {}
) {
  let query = supabase
    .from('inventory_movement')
    .select(`
      *,
      product!inventory_movement_product_id_fkey (name, code)
    `)
    .eq('product_id', productId)
    .eq('company_id', companyId);

  if (options.movement_type) {
    query = query.eq('movement_type', options.movement_type);
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movement history:', error);
    throw new Error('No se pudo obtener el historial de movimientos: ' + error.message);
  }

  return data;
}

/**
 * Verificar stock disponible antes de una salida
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @param quantity - Cantidad a verificar
 * @returns Objeto con stock disponible y si hay suficiente
 */
export async function verificarStockDisponible(
  productId: string,
  companyId: string,
  quantity: number
) {
  const { data: product, error } = await supabase
    .from('product')
    .select('current_stock, stock_quantity')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    throw new Error('No se pudo verificar el stock: ' + error.message);
  }

  const currentStock = product?.current_stock ?? 0;
  const stockQuantity = product?.stock_quantity ?? 0;
  
  // Usamos el mayor de los dos campos, o el que tenga más datos
  const effectiveStock = Math.max(currentStock, stockQuantity);
  const hasSufficientStock = effectiveStock >= quantity;

  return {
    currentStock,
    stockQuantity,
    effectiveStock,
    hasSufficientStock,
    shortfall: Math.max(0, quantity - effectiveStock),
  };
}

/**
 * Obtener stock actual de un producto
 * 
 * @param productId - ID del producto
 * @param companyId - ID de la empresa
 * @returns Objeto con ambos campos de stock
 */
export async function obtenerStockActual(
  productId: string,
  companyId: string
) {
  const { data: product, error } = await supabase
    .from('product')
    .select('current_stock, stock_quantity')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    throw new Error('No se pudo obtener el stock: ' + error.message);
  }

  return {
    currentStock: product?.current_stock ?? 0,
    stockQuantity: product?.stock_quantity ?? 0,
    effectiveStock: Math.max(product?.current_stock ?? 0, product?.stock_quantity ?? 0),
  };
}

// Exportar también la función raw para casos edge case
export { supabase };
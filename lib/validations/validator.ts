// Validation middleware using Zod schemas
// Provides type-safe request validation for API routes

import { z } from 'zod';
import { createTransactionSchema, createJournalEntrySchema, createInvoiceSchema, createCAISchema, updateCAICurrentNumberSchema, createUserSchema, periodClosingSchema } from './zod-schemas';

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  issues?: z.ZodIssue[];
}

/**
 * Valida un payload entrante contra un schema Zod
 * @param data Datos crudos de la request
 * @param schema Schema Zod para validar
 * @returns Resultado de validación con datos limpios o error
 */
export function validateRequest(data: unknown, schema: z.ZodSchema): ValidationResult {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: 'Validation failed',
    issues: result.error.issues,
  };
}

/**
 * Valida y extrae datos de creación de transacción
 */
export async function validateTransactionRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, createTransactionSchema);
}

/**
 * Valida y extrae datos de creación de entrada de journal
 */
export async function validateJournalEntryRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, createJournalEntrySchema);
}

/**
 * Valida y extrae datos de creación de factura
 */
export async function validateInvoiceRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, createInvoiceSchema);
}

/**
 * Valida y extrae datos de creación de CAI
 */
export async function validateCAIRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, createCAISchema);
}

/**
 * Valida y extrae datos de actualización de número actual de CAI
 */
export async function validateCAICurrentNumberRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, updateCAICurrentNumberSchema);
}

/**
 * Valida y extrae datos de creación de usuario
 */
export async function validateUserRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, createUserSchema);
}

/**
 * Valida y extrae datos de cierre de período
 */
export async function validatePeriodClosingRequest(
  data: unknown
): Promise<ValidationResult> {
  return validateRequest(data, periodClosingSchema);
}

export {
  validateRequest,
  validateTransactionRequest,
  validateJournalEntryRequest,
  validateInvoiceRequest,
  validateCAIRequest,
  validateCAICurrentNumberRequest,
  validateUserRequest,
  validatePeriodClosingRequest,
};
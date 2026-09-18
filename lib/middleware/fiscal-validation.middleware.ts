"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCAIById, CAIStatus } from "@/lib/services/cai-service";
import { z } from "zod";

/**
 * Schema for fiscal document validation
 */
const FiscalDocumentSchema = z.object({
  caiId: z.string().optional(),
  issueDate: z.date(),
  voucherNumber: z.number().int().positive(),
  voucherType: z.enum(['INGRESO', 'EGRESO', 'DIARIO']),
  currency: z.string().default("HNL"),
});

/**
 * Interface for fiscal validation result
 */
interface FiscalValidationResult {
  valid: boolean;
  reason?: string;
  caicCode?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  remainingInRange: number;
  canGenerate: boolean;
}

/**
 * Middleware de validación fiscal para documentos con CAI
 * Valida que:
 * 1. La fecha actual sea menor a la fecha límite de emisión (expiryDate)
 * 2. El número correlativo no supere el rango autorizado (rangeEnd)
 * 
 * @param params Parameters for fiscal validation including caiId, issueDate, voucherNumber
 * @returns FiscalValidationResult with validation status
 */
export async function validateFiscalDocument(params: {
  caiId: string;
  issueDate: Date;
  voucherNumber: number;
  voucherType?: string;
}): Promise<FiscalValidationResult> {
  const validated = FiscalDocumentSchema.parse(params);

  if (!validated.caiId) {
    return {
      valid: false,
      reason: 'CAI ID es requerido para documentos fiscales',
      canGenerate: false,
    };
  }

  const cai = await getCAIById(validated.caiId);

  if (!cai) {
    return {
      valid: false,
      reason: 'CAI no encontrado',
      canGenerate: false,
    };
  }

  const now = new Date();
  const remainingInRange = cai.rangeEnd - cai.currentNumber;
  const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if CAI is expired
  if (now > cai.expirationDate) {
    return {
      valid: false,
      reason: `CAI ${cai.caiCode} ha expirado el ${cai.expirationDate.toLocaleDateString('es-HN')}`,
      caicCode: cai.caiCode,
      expiryDate: cai.expirationDate.toISOString(),
      daysUntilExpiry: daysUntilExpiry,
      remainingInRange: remainingInRange,
      canGenerate: false,
    };
  }

  // Check if range is exhausted
  if (cai.currentNumber >= cai.rangeEnd) {
    return {
      valid: false,
      reason: `Rango de CAI ${cai.caiCode} agotado (current: ${cai.currentNumber}, rangeEnd: ${cai.rangeEnd})`,
      caicCode: cai.caiCode,
      remainingInRange: remainingInRange,
      canGenerate: false,
    };
  }

  // Check if within warning range (≤ 10 invoices remaining)
  if (remainingInRange <= 10 && remainingInRange > 0) {
    // Validation passes but warns about low stock
    // The system still allows generation but should alert user
  }

  // Check if issue date is after expiry (fiscal validity)
  if (validated.issueDate > cai.expirationDate) {
    return {
      valid: false,
      reason: 'La fecha de emisión es posterior a la fecha de expiración del CAI',
      caicCode: cai.caiCode,
      expiryDate: cai.expirationDate.toISOString(),
      daysUntilExpiry: daysUntilExpiry,
      remainingInRange: remainingInRange,
      canGenerate: false,
    };
  }

  // Validate that voucher number is within CAI range
  if (validated.voucherNumber < cai.rangeStart || validated.voucherNumber > cai.rangeEnd) {
    return {
      valid: false,
      reason: `Número de voucher ${validated.voucherNumber} fuera del rango autorizado [${cai.rangeStart}-${cai.rangeEnd}] para CAI ${cai.caiCode}`,
      caicCode: cai.caiCode,
      remainingInRange: remainingInRange,
      canGenerate: false,
    };
  }

  return {
    valid: true,
    reason: 'Documento fiscal válido',
    caicCode: cai.caiCode,
    expiryDate: cai.expirationDate.toISOString(),
    daysUntilExpiry: daysUntilExpiry,
    remainingInRange: remainingInRange,
    canGenerate: true,
  };
}

/**
 * Example usage in an API route:
 * 
 * import { NextResponse } from 'next/server';
 * import { validateFiscalDocument } from '@/lib/middleware/fiscal-validation.middleware';
 * 
 * export async function POST(request: Request) {
 *   try {
 *     const body = await request.json();
 *     const { caiId, issueDate, voucherNumber, voucherType } = body;
 *     
 *     const result = await validateFiscalDocument({
 *       caiId,
 *       issueDate: new Date(issueDate),
 *       voucherNumber,
 *       voucherType,
 * });
 *     
 *     if (!result.valid) {
 *       return NextResponse.json(
 *         { error: result.reason },
 *         { status: 400 }
 *       );
 *     }
 *     
 *     // Proceed with creating the fiscal document
 *     const document = await db.invoice.create({
 *       data: {
 *         ...body,
 *         cai: result.caicCode,
 *         status: 'ACTIVE',
 *       }
 *     });
 *     
 *     return NextResponse.json(document);
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Error validando documento fiscal' },
 *       { status: 500 }
 *     );
 *   }
 * }
 */
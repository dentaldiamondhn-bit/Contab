// Fiscal validation middleware for Contab
// Validates CAI (Código de Autorización de Impresión) before saving fiscal documents
// Ensures: 1) Current date is before expiration date
//          2) Correlative number does not exceed authorized range

import { db } from '@/lib/db';
import { CAIStatus, getCAIById, canGenerateInvoice } from '@/lib/services/cai-service';
import { NextResponse } from 'next/server';

/**
 * Validates that a fiscal document can be generated with the current CAI status
 * 
 * @param caiId CAI ID
 * @param tenantId Tenant ID
 * @returns Validation result with success flag and reason if invalid
 */
export async function validateFiscalDocument(caiId: string, tenantId: string) {
  try {
    // Obtener el CAI
    const cai = await getCAIById(caiId);
    
    if (!cai) {
      return {
        valid: false,
        reason: 'CAI no encontrado',
        code: 'CAI_NOT_FOUND'
      };
    }
    
    // Verificar que el CAI no esté expirado
    const now = new Date();
    const expirationDate = new Date(cai.expirationDate);
    
    if (now >= expirationDate) {
      return {
        valid: false,
        reason: `CAI expirado desde ${cai.expirationDate.toLocaleDateString('es-HN')}`,
        code: 'CAI_EXPIRED'
      };
    }
    
    // Verificar que el número correlativo no supere el rango autorizado
    const canGenerate = await canGenerateInvoice(caiId);
    
    if (!canGenerate.canGenerate) {
      return {
        valid: false,
        reason: canGenerate.reason || 'No se puede generar documento',
        code: 'CAI_LIMIT_REACHED'
      };
    }
    
    // Verificar específicamente que el próximo número no exceda el rango
    const nextNumber = canGenerate.nextNumber;
    const rangeEnd = cai.rangeEnd;
    
    if (nextNumber > rangeEnd) {
      return {
        valid: false,
        reason: `Número correlativo ${nextNumber} excede el rango autorizado ${rangeEnd}`,
        code: 'CORRELATIVE_EXCEEDED'
      };
    }
    
    return {
      valid: true,
      reason: 'Documento fiscal válido',
      code: 'OK',
      nextAvailableNumber: canGenerate.nextNumber
    };
    
  } catch (error) {
    console.error('Fiscal validation error:', error);
    return {
      valid: false,
      reason: 'Error validando documento fiscal',
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Middleware para validación fiscal en API routes
 * Uso ejemplo:
 * 
 * import { withFiscalValidation } from '@/lib/middleware/fiscal-validation';
 * import { createInvoiceSchema } from '@/lib/validations/zod-schemas';
 * 
 * export async function POST(request) {
 *   const body = await request.json();
 *   const result = await validateFiscalDocument(caiId, tenantId);
 *   
 *   if (!result.valid) {
 *     return NextResponse.json(
 *       { error: result.reason },
 *       { status: 400 }
 *     );
 *   }
 *   // Proceed with document generation
 * }
 */
export async function withFiscalValidation(
  handler: (req: NextRequest, fiscalOk: boolean, validation: ReturnType<typeof validateFiscalDocument>) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Extraer caiId y tenantId de la request
    const body = await req.json();
    const { caiId, tenantId } = body;
    
    if (!caiId || !tenantId) {
      return NextResponse.json(
        { error: 'CAI ID and tenant ID are required' },
        { status: 400 }
      );
    }
    
    // Validar documento fiscal
    const validation = await validateFiscalDocument(caiId, tenantId);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }
    
    // Proceed with handler if validation passed
    return handler(req, true, validation);
  };
}

/**
 * Validates that the invoice number is within the CAI range
 * This is an additional check for invoice creation
 */
export async function validateInvoiceNumberRange(
  caiId: string,
  invoiceNumber: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const cai = await getCAIById(caiId);
    
    if (!cai) {
      return { valid: false, reason: 'CAI no encontrado' };
    }
    
    const currentNumber = cai.currentNumber;
    
    // Verificar que el número de factura no exceda el currentNumber + 1 (próximo disponible)
    // y que no supere el rangoEnd
    if (invoiceNumber > cai.rangeEnd) {
      return {
        valid: false,
        reason: `Número de factura ${invoiceNumber} excede el rango máximo ${cai.rangeEnd}`
      };
    }
    
    if (invoiceNumber <= currentNumber) {
      return {
        valid: false,
        reason: `Número de factura ${invoiceNumber} ya ha sido utilizado (actual: ${currentNumber})`
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('Invoice number range validation error:', error);
    return { valid: false, reason: 'Error validando número de factura' };
  }
}

export default validateFiscalDocument;
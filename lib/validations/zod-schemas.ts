// Zod validation schemas for Contab API payloads
// These schemas validate incoming payloads before hitting the database,
// providing type safety and runtime validation

import { z } from 'zod';

// Schema for creating a transaction
export const createTransactionSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  date: z.date(),
  description: z.string().min(1, 'Description is required').max(200),
  reference: z.string().optional(),
  voucherType: z.enum(['INGRESO', 'EGRESO', 'DIARIO', 'AJUSTE']),
  voucherNumber: z.number().int().positive('Voucher number must be positive'),
  currency: z.string().default('HNL'),
  exchangeRate: z.number().positive().default(24.70),
  totalAmount: z.bigint().int(),
  clienteRTN: z.string().optional().refine(
    (val) => !val || /^\d{8}-\d{1}$/.test(val),
    'RTN must have format 8 digits - 1 check digit'
  ),
  proveedorRTN: z.string().optional().refine(
    (val) => !val || /^\d{8}-\d{1}$/.test(val),
    'RTN must have format 8 digits - 1 check digit'
  ),
  entries: z.array(z.object({
    accountId: z.string().min(1, 'Account ID is required'),
    amount: z.bigint().int(),
  })).min(2, 'At least 2 entries required (double-entry)'),
});

// Schema for creating a journal entry
export const createJournalEntrySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  amount: z.bigint().int(),
  originalAmount: z.bigint().int().optional(),
  currency: z.string().default('HNL'),
  description: z.string().optional(),
  cleared: z.boolean().default(false),
});

// Schema for creating an invoice
export const createInvoiceSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceType: z.enum(['CUSTOMER', 'SUBSCRIPTION', 'EXPENSE']).default('CUSTOMER'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerRTN: z.string().optional().refine(
    (val) => !val || /^\d{8}-\d{1}$/.test(val),
    'RTN must have format 8 digits - 1 check digit'
  ),
  customerEmail: z.string().email('Invalid email format').optional(),
  customerAddress: z.string().optional(),
  issuerName: z.string().optional(),
  issuerRTN: z.string().optional().refine(
    (val) => !val || /^\d{8}-\d{1}$/.test(val),
    'RTN must have format 8 digits - 1 check digit'
  ),
  issuerAddress: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  cai: z.string().optional(),
  rangeStart: z.number().int().optional(),
  rangeEnd: z.number().int().optional(),
  expiryDate: z.date().optional(),
  subtotal: z.number().positive(),
  tax: z.number().default(15),
  total: z.number().positive(),
  currency: z.string().default('HNL'),
  taxRate: z.number().default(15),
  notes: z.string().optional(),
});

// Schema for creating a CAI
export const createCAISchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  caiCode: z.string().min(1, 'CAI code is required'),
  establishmentCode: z.string().min(1, 'Establishment code is required'),
  pointOfSaleCode: z.string().min(1, 'Point of sale code is required'),
  documentType: z.enum(['FACT', 'NOTA_CREDITO', 'NOTA_DEBITO', 'TICKET']).default('FACT'),
  rangeStart: z.bigint().int().positive('Range start must be positive'),
  rangeEnd: z.bigint().int().positive('Range end must be positive'),
  issueDate: z.date(),
  expiryDate: z.date(),
  isActive: z.boolean().default(true),
});

// Schema for updating a CAI current number
export const updateCAICurrentNumberSchema = z.object({
  caiId: z.string().min(1, 'CAI ID is required'),
  newNumber: z.bigint().int().positive('New number must be positive'),
});

// Schema for creating a user
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'USER', 'VIEWER']).default('USER'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Schema for period closing
export const periodClosingSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  periodStart: z.date(),
  periodEnd: z.date().gt('periodStart', 'Period end must be after period start'),
  includeEntries: z.array(z.string()).optional(),
  generateReports: z.boolean().default(true),
});

// Export types derived from schemas
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateCAIInput = z.infer<typeof createCAISchema>;
export type UpdateCAICurrentNumberInput = z.infer<typeof updateCAICurrentNumberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PeriodClosingInput = z.infer<typeof periodClosingSchema>;

/**
 * Middleware para validar payloads entrantes usando Zod
 * Uso en API routes:
 * 
 * import { validateRequest } from '@/lib/validations/zod-validator';
 * import { createTransactionSchema } from '@/lib/validations/transaction-schema';
 * 
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   const result = await validateRequest(body, createTransactionSchema);
 *   
 *   if (!result.success) {
 *     return Next.json({ error: result.error }, { status: 400 });
 *   }
 *   // Proceed with validated data: result.data
 * }
 */
export { createTransactionSchema, createJournalEntrySchema, createInvoiceSchema, createCAISchema, updateCAICurrentNumberSchema, createUserSchema, periodClosingSchema };
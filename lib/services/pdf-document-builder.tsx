// Ensambla el documento @react-pdf según tipo (JSX aislado aquí para que
// el resto del motor (pdf-documents.ts) siga siendo testeable en node).

import React from 'react';
import { InvoicePDF } from '@/components/reports/InvoicePDF';
import type { InvoicePdfData } from '@/components/reports/InvoicePDF';
import { TransferPDF } from '@/components/reports/TransferPDF';
import type { TransferPdfData } from '@/components/reports/TransferPDF';
import { BudgetVsActualPDF } from '@/components/reports/BudgetVsActualPDF';
import type { BudgetPdfData } from '@/components/reports/BudgetVsActualPDF';
import { DiatPDF } from '@/components/reports/DiatPDF';
import type { DiatPdfData } from '@/components/reports/DiatPDF';
import { VariationsPDF } from '@/components/reports/VariationsPDF';
import type { VariationsPdfData } from '@/components/reports/VariationsPDF';
import type { PdfType } from '@/lib/services/pdf-documents';

export type PdfPayload =
  | { type: 'invoice'; data: InvoicePdfData }
  | { type: 'transfer'; data: TransferPdfData }
  | { type: 'budget'; data: BudgetPdfData }
  | { type: 'diat'; data: DiatPdfData }
  | { type: 'variations'; data: VariationsPdfData };

export function buildPdfDocument(type: PdfType, data: unknown): React.ReactElement {
  switch (type) {
    case 'invoice':
      return <InvoicePDF data={data as InvoicePdfData} />;
    case 'transfer':
      return <TransferPDF data={data as TransferPdfData} />;
    case 'budget':
      return <BudgetVsActualPDF data={data as BudgetPdfData} />;
    case 'diat':
      return <DiatPDF data={data as DiatPdfData} />;
    case 'variations':
      return <VariationsPDF data={data as VariationsPdfData} />;
    default:
      throw new Error(`Tipo de documento no soportado: ${String(type)}`);
  }
}

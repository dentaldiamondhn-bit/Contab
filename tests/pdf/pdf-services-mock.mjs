// Mock único para los servicios que usa la ruta /api/documents/pdf.
// buildPdfDocument devuelve un documento @react-pdf REAL (mínimo) para que
// renderToBuffer genere bytes PDF auténticos en los tests.

import React from 'react';
import { Document, Page, Text } from '@react-pdf/renderer';

export const mockState = {
  invoice: null,
  transfer: null,
  comparison: null,
  report: null,
  variations: null,
  hasData: true,
  company: { name: 'Empresa Demo', rtn: '', address: '', phone: '', email: '' },
  calls: { invoice: [], transfer: [], comparison: [], report: [], hasData: [], build: [], variations: [] },
};

export function resetPdfMock() {
  mockState.invoice = null;
  mockState.transfer = null;
  mockState.comparison = null;
  mockState.report = null;
  mockState.variations = null;
  mockState.hasData = true;
  mockState.calls = { invoice: [], transfer: [], comparison: [], report: [], hasData: [], build: [], variations: [] };
}

// --- @/lib/services/budget-service ---
export async function resolveTenant(companyId, hint) {
  return hint && hint.trim() ? hint.trim() : companyId;
}

export function isValidPeriod(period) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export async function getBudgetComparison(companyId, id, period, tenantHint) {
  mockState.calls.comparison.push({ companyId, id, period, tenantHint });
  return mockState.comparison;
}

// --- @/lib/services/warehouse-service ---
export async function getTransfer(companyId, id, tenantHint) {
  mockState.calls.transfer.push({ companyId, id, tenantHint });
  return mockState.transfer;
}

// --- @/lib/services/diat-generator ---
export async function hasDiatData(companyId) {
  mockState.calls.hasData.push(companyId);
  return mockState.hasData;
}

export async function getDiatReport(companyId, period) {
  mockState.calls.report.push({ companyId, period });
  return mockState.report;
}

// --- @/lib/services/pdf-document-builder ---
export function buildPdfDocument(type, data) {
  mockState.calls.build.push({ type });
  return React.createElement(
    Document,
    null,
    React.createElement(Page, null, React.createElement(Text, null, `PDF-${type}`)),
  );
}

// --- @/lib/services/period-variations ---
export async function getVariationsReport(tenantId, from, to) {
  mockState.calls.variations.push({ tenantId, from, to });
  return mockState.variations;
}

// --- @/lib/services/pdf-data (fetchers con datos de prueba) ---
export async function fetchCompanyHeader(companyId, tenantHint) {
  return { ...mockState.company, name: `Empresa ${companyId}` };
}

export async function fetchInvoiceData(companyId, invoiceId, tenantHint) {
  mockState.calls.invoice.push({ companyId, invoiceId, tenantHint });
  return mockState.invoice;
}

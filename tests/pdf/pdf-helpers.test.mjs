import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDateHN,
  formatHNL,
  isValidPdfType,
  pdfFilename,
  sanitizeFilename,
} from '../../lib/services/pdf-documents.ts';

test('isValidPdfType acepta los 5 documentos', () => {
  assert.equal(isValidPdfType('invoice'), true);
  assert.equal(isValidPdfType('transfer'), true);
  assert.equal(isValidPdfType('budget'), true);
  assert.equal(isValidPdfType('diat'), true);
  assert.equal(isValidPdfType('variations'), true);
  assert.equal(isValidPdfType('reporte'), false);
  assert.equal(isValidPdfType(''), false);
});

test('formatHNL en lempiras es-HN', () => {
  const out = formatHNL(1234.5);
  assert.match(out, /1,234\.50/);
  assert.match(out, /L/);
  assert.equal(formatHNL(NaN), formatHNL(0));
});

test('formatDateHN normaliza fechas', () => {
  assert.equal(formatDateHN('2026-09-15T00:00:00.000Z').length > 0, true);
  assert.equal(formatDateHN(''), '');
  assert.equal(formatDateHN('no-fecha'), 'no-fecha');
});

test('sanitizeFilename elimina caracteres inseguros', () => {
  assert.equal(sanitizeFilename('factura 001/002: A+B'), 'factura_001_002__A_B');
  assert.equal(sanitizeFilename('TRF-00001'), 'TRF-00001');
});

test('pdfFilename compone nombre por tipo', () => {
  assert.equal(pdfFilename('invoice', ['001-001-01-00000001']), 'factura_001-001-01-00000001.pdf');
  assert.equal(pdfFilename('transfer', ['TRF-00001']), 'traslado_TRF-00001.pdf');
  assert.equal(pdfFilename('budget', ['Anual 2026', '2026-09']), 'presupuesto_Anual_2026_2026-09.pdf');
  assert.equal(pdfFilename('diat', ['ANGELOH7', '2026-09']), 'DIAT_ANGELOH7_2026-09.pdf');
  assert.equal(pdfFilename('variations', ['2026-09', '2026-10']), 'variaciones_2026-09_2026-10.pdf');
});

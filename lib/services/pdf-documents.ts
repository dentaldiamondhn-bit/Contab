// Motor PDF profesional server-side (sin JSX).
// Renderiza documentos @react-pdf a Buffer y los sirve como descarga.
// Documentos: factura, guía de traslado, presupuesto vs real, DIAT.

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';

export type PdfType = 'invoice' | 'transfer' | 'budget' | 'diat' | 'variations' | 'audit';

export function isValidPdfType(t: string): t is PdfType {
  return (
    t === 'invoice' || t === 'transfer' || t === 'budget' || t === 'diat' || t === 'variations'
  );
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

export function formatHNL(n: number): string {
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(
    num(n),
  );
}

export function formatDateHN(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return str(iso).slice(0, 10);
  return d.toLocaleDateString('es-HN');
}

export function sanitizeFilename(name: string): string {
  return str(name)
    .replace(/[^a-zA-Z0-9\-_.áéíóúÁÉÍÓÚñÑ]/g, '_')
    .slice(0, 120);
}

export function pdfFilename(type: PdfType, parts: string[]): string {
  const prefix =
    type === 'invoice'
      ? 'factura'
      : type === 'transfer'
        ? 'traslado'
        : type === 'budget'
          ? 'presupuesto'
          : type === 'variations'
            ? 'variaciones'
            : type === 'audit'
              ? 'bitacora'
              : 'DIAT';
  return sanitizeFilename(`${prefix}_${parts.filter(Boolean).join('_')}.pdf`);
}

export async function renderPdfDocument(element: React.ReactElement): Promise<Buffer> {
  const buf = await renderToBuffer(element);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

export function pdfFileResponse(buffer: Buffer, filename: string): NextResponse {
  const body = new Uint8Array(buffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}

// Datos para PDF de auditoría
export interface AuditLogRow {
  performed_at: string;
  account_code: string;
  account_name: string;
  action: string;
  performed_by: string;
}

// Genera contenido de texto plano para el PDF de auditoría (formato simple)
export function buildAuditPdfContent(logs: AuditLogRow[]): string {
  const lines: string[] = [];
  lines.push('=== LOG DE AUDITORÍA CONTABLE ===');
  lines.push(`Generado: ${new Date().toLocaleString('es-HN')}`);
  lines.push(`Total de registros: ${logs.length}`);
  lines.push(' ');
  logs.forEach((log, idx) => {
    lines.push(`#${idx + 1}`);
    lines.push(`Fecha: ${log.performed_at}`);
    lines.push(`Cuenta: ${log.account_code} - ${log.account_name}`);
    lines.push(`Acción: ${log.action}`);
    lines.push(`Usuario: ${log.performed_by}`);
    lines.push('-------------------------------');
  });
  return lines.join('\n');
}

// Genera un elemento React simple para el PDF de auditoría (sin JSX directo)
export function buildAuditPdfElement(logs: AuditLogRow[]): React.ReactElement {
  const content = buildAuditPdfContent(logs);
  return React.createElement('div', null, content);
}
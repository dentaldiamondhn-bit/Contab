"use server";

import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/currency-utils";
import { NextResponse } from "next/server";
import { supabase, generatePdfKey, cachePdf, isPdfCached } from "@/lib/services/pdf-cache-service";

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  period?: string;
  companyName?: string;
  preparedBy?: string;
  date?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

/**
 * Genera HTML formateado para PDF
 */
export async function generatePDFHTML(content: string, options: PDFExportOptions): Promise<string> {
  const currentDate = options.date || new Date().toLocaleDateString('es-HN');
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      <style>
        @page {
          size: letter;
          margin: 2cm;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
        }
        .company-name {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .document-title {
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .document-subtitle {
          font-size: 10pt;
          margin-bottom: 8px;
        }
        .document-meta {
          font-size: 9pt;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #333;
          padding: 6px;
          font-size: 10pt;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
          font-size: 10pt;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .totals-row {
          font-weight: bold;
          background-color: #f9f9f9;
          font-size: 10pt;
        }
        .signature-section {
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .signature-line {
          border-top: 1px solid #000;
          width: 200px;
          margin-top: 20px;
          padding-top: 4px;
          text-align: center;
          font-size: 9pt;
        }
        .footer {
          position: fixed;
          bottom: 15px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 8pt;
          color: #666;
        }
        .page-number {
          position: fixed;
          bottom: 15px;
          right: 20px;
          font-size: 8pt;
        }
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          border-bottom: 1px solid #333;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${options.companyName ? `<div class="company-name">${options.companyName}</div>` : ''}
        ${options.title ? `<div class="document-title">${options.title}</div>` : ''}
        ${options.subtitle ? `<div class="document-subtitle">${options.subtitle}</div>` : ''}
        <div class="document-meta">
          ${options.period ? `<div>Período: ${options.period}</div>` : ''}
          <div>Fecha: ${currentDate}</div>
          ${options.preparedBy ? `<div>Elaborado por: ${options.preparedBy}</div>` : ''}
        </div>
      </div>
      
      ${content}
      
      ${options.showFooter !== false ? `
        <div class="footer">
          Documento generado por Contab System - Sistema de Contabilidad Profesional
        </div>
        <div class="page-number">Página <span></span> de <span></span></div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
}

/**
 * Interfaz para datos de balanza de comprobación PDF
 */
export interface TrialBalancePDFData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  accounts: Array<{
    code: string;
    name: string;
    totalDebits: number;
    totalCredits: number;
    balance: number;
  }>;
}

/**
 * Exporta Balanza de Comprobación a PDF (versión optimizada con cache en Supabase Storage)
 * 
 * Genera el PDF una sola vez al realizar un cierre o firma digital,
 * almacénalo en Supabase Storage y entrega a los clientes el enlace firmado (signedUrl) directamente.
 * 
 * @param tenantId ID del tenant/empresa
 * @param trialBalance Datos de la balanza
 * @param options Opciones de exportación
 * @returns URL firmada del PDF en Supabase Storage
 */
export async function exportTrialBalanceToPDF(
  tenantId: string,
  trialBalance: TrialBalancePDFData,
  options?: Partial<PDFExportOptions>
): Promise<string> {
  // Identificador único para el cache (usando el ID de la balanza o fecha período)
  const identifier = `${trialBalance.period.startDate.toISOString()}-${trialBalance.period.endDate.toISOString()}`
  
  // Intentar obtener PDF del cache primero
  const cacheCheck = await isPdfCached(tenantId, 'trial_balance', identifier)
  
  if (cacheCheck.cached && cacheCheck.fileUrl) {
    // Retornar URL del cache en lugar de generar de nuevo
    return cacheCheck.fileUrl
  }
  
  // Generar contenido HTML
  const content = `
    <div class="section-title">Balanza de Comprobación</div>
    <p>Período: ${trialBalance.period.startDate.toLocaleDateString('es-HN')} - ${trialBalance.period.endDate.toLocaleDateString('es-HN')}</p>
    
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre de Cuenta</th>
          <th class="text-right">Débitos</th>
          <th class="text-right">Créditos</th>
          <th class="text-right">Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${trialBalance.accounts.map((account) => `
          <tr>
            <td>${account.code}</td>
            <td>${account.name}</td>
            <td class="text-right">${formatCurrency(account.totalDebits)}</td>
            <td class="text-right">${formatCurrency(account.totalCredits)}</td>
            <td class="text-right">${formatCurrency(account.endingBalance)}</td>
          </tr>
        `).join('')}
        <tr class="totals-row">
          <td colspan="2" class="text-center"><strong>TOTALES</strong></td>
          <td class="text-right"><strong>${formatCurrency(trialBalance.totalDebits)}</strong></td>
          <td class="text-right"><strong>${formatCurrency(trialBalance.totalCredits)}</strong></td>
          <td class="text-right"><strong>${formatCurrency(trialBalance.totalEndingBalance)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    <div style="margin-top: 20px; font-size: 9pt;">
      <p><strong>Estado:</strong> ${trialBalance.isBalanced ? 'Balanceado' : 'Desbalanceado'}</p>
      <p>Total asientos: ${trialBalance.accounts.length}</p>
    </div>
  `;

  // Generar HTML
  const html = await generatePDFHTML(content, {
    title: 'Balanza de Comprobación',
    period: options?.period,
    companyName: options?.companyName,
    preparedBy: options?.preparedBy,
    showHeader: true,
    showFooter: true,
  })

  // Convertir a Buffer
  const pdfBuffer = Buffer.from(html, 'utf-8')
  
  // Cachear en Supabase Storage y obtener URL firmada
  const signedUrl = await cachePdf(tenantId, 'trial_balance', identifier, pdfBuffer, {
    ttlMinutes: 43200 // 30 días
  })
  
  return signedUrl
}

/**
 * Interfaz para datos de póliza PDF
 */
export interface PolizaPDFData {
  id: string;
  date: Date;
  voucherType: string;
  voucherNumber: number;
  description: string;
  totalAmount: number;
  entries: Array<{
    account: {
      code: string;
      name: string;
    };
    amount: number;
    description?: string;
  }>;
}

/**
 * Exporta Pólizas a PDF (versión optimizada con cache en Supabase Storage)
 * 
 * Genera el PDF una sola vez al realizar un cierre o firma digital,
 * almacénalo en Supabase Storage y entrega a los clientes el enlace firmado (signedUrl) directamente.
 * 
 * @param tenantId ID del tenant/empresa
 * @param polizas Array de pólizas a exportar
 * @param options Opciones de exportación
 * @returns URL firmada del PDF en Supabase Storage
 */
export async function exportPolizasToPDF(
  tenantId: string,
  polizas: PolizaPDFData[],
  options?: Partial<PDFExportOptions>
): Promise<string> {
  // Identificador único para el cache (usando el rango de fechas y número de pólizas)
  const identifier = `${polizas[0]?.date.toISOString()}-${polizas.length}-polizas`
  
  // Intentar obtener PDF del cache primero
  const cacheCheck = await isPdfCached(tenantId, 'polizas', identifier)
  
  if (cacheCheck.cached && cacheCheck.fileUrl) {
    // Retornar URL del cache en lugar de generar de nuevo
    return cacheCheck.fileUrl
  }
  
  const voucherTypeNames: Record<string, string> = {
    'INGRESO': 'Póliza de Ingreso',
    'EGRESO': 'Póliza de Egreso',
    'DIARIO': 'Póliza de Diario',
    'AJUSTE': 'Póliza de Ajuste',
  };

  const content = polizas.map((poliza: any) => `
    <div style="margin-bottom: 25px; page-break-inside: avoid;">
      <div class="section-title">Póliza N° ${poliza.voucherNumber}</div>
      
      <table style="width: 100%; border: none; margin-bottom: 15px;">
        <tr style="border: none;">
          <td style="border: none; width: 50%;">
            <strong>Tipo:</strong> ${voucherTypeNames[poliza.voucherType] || poliza.voucherType}<br>
            <strong>Fecha:</strong> ${poliza.date.toLocaleDateString('es-HN')}<br>
            <strong>Descripción:</strong> ${poliza.description}
          </td>
          <td style="border: none; width: 50%; text-align: right;">
            <strong>Total:</strong> ${formatCurrency(poliza.totalAmount)}
          </td>
        </tr>
      </table>
      
      <div style="margin-bottom: 10px;">
        <strong>Partidas:</strong>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cuenta</th>
            <th class="text-right">Débe</th>
            <th class="text-right">Haber</th>
          </thead>
          <tbody>
            ${poliza.entries.map((entry: any) => `
              <tr>
                <td>${entry.account.code}</td>
                <td>${entry.account.name}${entry.description ? `<br><small>${entry.description}</small>` : ''}</td>
                <td class="text-right">${formatCurrency(entry.amount > 0 ? entry.amount : 0)}</td>
                <td class="text-right">${formatCurrency(entry.amount < 0 ? Math.abs(entry.amount) : 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </thead>
      </table>
      
      <div style="margin-top: 10px; font-size: 9pt; color: #666;">
        <strong>Saldo Póliza:</strong> ${formatCurrency(poliza.totalAmount)}
      </div>
    </div>
  `).join('');

  // Generar HTML
  const html = await generatePDFHTML(content, {
    title: 'Reporte de Pólizas',
    showHeader: true,
    showFooter: true,
    companyName: options?.companyName,
    preparedBy: options?.preparedBy,
  })

  // Convertir a Buffer
  const pdfBuffer = Buffer.from(html, 'utf-8')
  
  // Cachear en Supabase Storage y obtener URL firmada
  const signedUrl = await cachePdf(tenantId, 'polizas', identifier, pdfBuffer, {
    ttlMinutes: 43200 // 30 días
  })
  
  return signedUrl
}

/**
 * Interfaz para datos de reporte tributario PDF
 */
export interface TaxReportPDFData {
  period: string;
  taxConfig: {
    rate: number;
  };
  sales: {
    totalBase: number;
    totalTax: number;
    details: Array<{
      accountCode: string;
      accountName: string;
      totalBase: number;
      totalTax: number;
      effectiveRate: number;
    }>;
  };
  purchases: {
    totalBase: number;
    totalTax: number;
    details: Array<{
      accountCode: string;
      accountName: string;
      totalBase: number;
      totalTax: number;
      effectiveRate: number;
    }>;
  };
  summary: {
    totalTaxToPay: number;
  };
}

/**
 * Exporta Reporte de Impuestos a PDF (versión optimizada con cache en Supabase Storage)
 * 
 * Genera el PDF una sola vez al realizar un cierre o firma digital,
 * almacénalo en Supabase Storage y entrega a los clientes el enlace firmado (signedUrl) directamente.
 * 
 * @param tenantId ID del tenant/empresa
 * @param taxReport Datos del reporte tributario
 * @param options Opciones de exportación
 * @returns URL firmada del PDF en Supabase Storage
 */
export async function exportTaxReportToPDF(
  tenantId: string,
  taxReport: TaxReportPDFData,
  options?: Partial<PDFExportOptions>
): Promise<string> {
  // Identificador único para el cache (usando el período)
  const identifier = taxReport.period
  
  // Intentar obtener PDF del cache primero
  const cacheCheck = await isPdfCached(tenantId, 'tax_report', identifier)
  
  if (cacheCheck.cached && cacheCheck.fileUrl) {
    // Retornar URL del cache en lugar de generar de nuevo
    return cacheCheck.fileUrl
  }
  
  const content = `
    <div class="section-title">Reporte Mensual de ISV - SAR</div>
    <p>Período: ${taxReport.period}</p>
    <p>Tasa ISV: ${(taxReport.taxConfig.rate * 100).toFixed(1)}%</p>
    
    <h4 style="color: #2d5016; border-bottom: 1px solid #2d5016; padding-bottom: 5px;">1. VENTAS (ISV Cobrado)</h4>
    <table>
      <thead>
        <tr>
          <th>Código Cuenta</th>
          <th>Descripción</th>
          <th class="text-right">Base Imponible</th>
          <th class="text-right">ISV</th>
          <th class="text-center">Tasa</th>
        </tr>
      </thead>
      <tbody>
        ${taxReport.sales.details.map((detail: any) => `
          <tr>
            <td>${detail.accountCode}</td>
            <td>${detail.accountName}</td>
            <td class="text-right">${formatCurrency(detail.totalBase)}</td>
            <td class="text-right">${formatCurrency(detail.totalTax)}</td>
            <td class="text-center">${(detail.effectiveRate * 100).toFixed(2)}%</td>
          </tr>
        `).join('')}
        <tr class="totals-row">
          <td colspan="2" class="text-center"><strong>TOTAL VENTAS</strong></td>
          <td class="text-right"><strong>${formatCurrency(taxReport.sales.totalBase)}</strong></td>
          <td class="text-right"><strong>${formatCurrency(taxReport.sales.totalTax)}</strong></td>
          <td class="text-center">-</td>
        </tr>
      </tbody>
    </table>
    
    <h4 style="color: #1e3a8a; border-bottom: 1px solid #1e3a8a; padding-bottom: 5px;">2. COMPRAS (ISV Pagado/Recuperable)</h4>
    <table>
      <thead>
        <tr>
          <th>Código Cuenta</th>
          <th>Descripción</th>
          <th class="text-right">Base Imponible</th>
          <th class="text-right">ISV</th>
          <th class="text-center">Tasa</th>
        </thead>
        <tbody>
          ${taxReport.purchases.details.map((detail: any) => `
            <tr>
              <td>${detail.accountCode}</td>
              <td>${detail.accountName}</td>
              <td class="text-right">${formatCurrency(detail.totalBase)}</td>
              <td class="text-right">${formatCurrency(detail.totalTax)}</td>
              <td class="text-center">${(detail.effectiveRate * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="2" class="text-center"><strong>TOTAL COMPRAS</strong></td>
            <td class="text-right"><strong>${formatCurrency(taxReport.purchases.totalBase)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(taxReport.purchases.totalTax)}</strong></td>
            <td class="text-center">-</td>
          </tr>
        </tbody>
      </table>
      
      <div style="background-color: #f3e8ff; border: 2px solid #7c3aed; padding: 15px; margin: 20px 0;">
        <h4 style="color: #5b21b6; margin-top: 0;">3. LIQUIDACIÓN DE ISV</h4>
        <table>
          <tr style="border: none;">
            <td style="border: none; width: 60%;">ISV por Ventas (Cobrado):</td>
            <td style="border: none; width: 40%; text-align: right; font-weight: bold;">${formatCurrency(taxReport.sales.totalTax)}</td>
          </tr>
          <tr style="border: none;">
            <td style="border: none;">(-) ISV por Compras (Recuperable):</td>
            <td style="border: none; text-align: right; font-weight: bold;">- ${formatCurrency(taxReport.purchases.totalTax)}</td>
          </tr>
          <tr style="border: none; font-size: 12pt; color: #5b21b6;">
            <td style="border: none; padding-top: 10px;"><strong>(=) ISV A PAGAR:</strong></td>
            <td style="border: none; text-align: right; padding-top: 10px;"><strong>${formatCurrency(taxReport.summary.totalTaxToPay)}</strong></td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 30px; font-size: 9pt; border-top: 1px solid #ccc; padding-top: 15px;">
        <p><strong>DECLARACIÓN JURADA:</strong> Los datos contenidos en este documento son fiel reflejo de los registros contables de la empresa.</p>
        <p style="margin-top: 10px;">Este documento cumple con los requisitos del SAR para la presentación mensual.</p>
      </div>
  `;

  // Generar HTML
  const html = await generatePDFHTML(content, {
    title: 'Declaración Mensual de ISV - SAR',
    period: taxReport.period,
    showHeader: true,
    showFooter: true,
  })

  // Convertir a Buffer
  const pdfBuffer = Buffer.from(html, 'utf-8')
  
  // Cachear en Supabase Storage y obtener URL firmada
  const signedUrl = await cachePdf(tenantId, 'tax_report', identifier, pdfBuffer, {
    ttlMinutes: 43200 // 30 días
  })
  
  return signedUrl
}

/**
 * Convierte HTML a Buffer (para ser renderizado por react-pdf o servicio externo)
 */
function htmlToPDFBuffer(html: string): Buffer {
  return Buffer.from(html, 'utf-8')
}
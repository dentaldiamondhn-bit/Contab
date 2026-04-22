"use server";

import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/currency-utils";

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  period?: string;
  companyName?: string;
  preparedBy?: string;
  date?: string;
}

export interface PolizaData {
  id: string;
  date: Date;
  voucherType: string;
  voucherNumber: number;
  description: string;
  totalAmount: bigint;
  entries: Array<{
    account: {
      code: string;
      name: string;
    };
    amount: bigint;
    description?: string;
  }>;
}

export interface TrialBalanceData {
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    debits: bigint;
    credits: bigint;
    balance: bigint;
  }>;
  totalDebits: bigint;
  totalCredits: bigint;
  period: string;
}

export class PDFExportService {
  private static async generateHTML(content: string, options: PDFExportOptions): Promise<string> {
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
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          .company-name {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .document-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .document-subtitle {
            font-size: 12pt;
            margin-bottom: 10px;
          }
          .document-meta {
            font-size: 10pt;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
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
          }
          .signature-section {
            margin-top: 50px;
            page-break-inside: avoid;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 250px;
            margin-top: 30px;
            padding-top: 5px;
            text-align: center;
          }
          .footer {
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #666;
          }
          .page-number {
            position: fixed;
            bottom: 20px;
            right: 30px;
            font-size: 9pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${options.companyName || 'EMPRESA S.A.'}</div>
          <div class="document-title">${options.title}</div>
          ${options.subtitle ? `<div class="document-subtitle">${options.subtitle}</div>` : ''}
          <div class="document-meta">
            ${options.period ? `<div>Período: ${options.period}</div>` : ''}
            <div>Fecha: ${currentDate}</div>
            ${options.preparedBy ? `<div>Elaborado por: ${options.preparedBy}</div>` : ''}
          </div>
        </div>
        
        ${content}
        
        <div class="signature-section">
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="border: none; width: 50%; text-align: center;">
                <div class="signature-line">Contador</div>
              </td>
              <td style="border: none; width: 50%; text-align: center;">
                <div class="signature-line">Gerente</div>
              </td>
            </tr>
          </table>
        </div>
        
        <div class="footer">
          Documento generado por Contab System - Sistema de Contabilidad Profesional
        </div>
      </body>
      </html>
    `;
  }

  static async exportTrialBalanceToPDF(trialBalance: TrialBalanceData, options?: Partial<PDFExportOptions>): Promise<Buffer> {
    const content = `
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre de Cuenta</th>
            <th class="text-right">Debe</th>
            <th class="text-right">Haber</th>
            <th class="text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${trialBalance.accounts.map(account => `
            <tr>
              <td>${account.code}</td>
              <td>${account.name}</td>
              <td class="text-right">${formatCurrency(account.debits)}</td>
              <td class="text-right">${formatCurrency(account.credits)}</td>
              <td class="text-right">${formatCurrency(account.balance)}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="2" class="text-center"><strong>TOTALES</strong></td>
            <td class="text-right"><strong>${formatCurrency(trialBalance.totalDebits)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(trialBalance.totalCredits)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(trialBalance.totalDebits - trialBalance.totalCredits)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 30px; font-size: 10pt;">
        <p><strong>Notas:</strong></p>
        <ul>
          <li>Esta balanza de comprobación refleja la situación contable al cierre del período.</li>
          <li>Todos los montos están expresados en Lempiras (HNL).</li>
          <li>La diferencia entre Debe y Habar debe ser cero para indicar balance.</li>
        </ul>
      </div>
    `;

    const html = await this.generateHTML(content, {
      title: 'Balanza de Comprobación',
      subtitle: 'Trial Balance',
      period: trialBalance.period,
      ...options,
    });

    return await this.htmlToPDF(html);
  }

  static async exportPolizaToPDF(poliza: PolizaData, options?: Partial<PDFExportOptions>): Promise<Buffer> {
    const voucherTypeNames: Record<string, string> = {
      'INGRESO': 'Póliza de Ingreso',
      'EGRESO': 'Póliza de Egreso',
      'DIARIO': 'Póliza de Diario',
      'AJUSTE': 'Póliza de Ajuste',
    };

    const voucherNumber = poliza.voucherNumber.toString().padStart(6, '0');
    
    const content = `
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
          <tr style="border: none;">
            <td style="border: none; width: 50%;">
              <strong>Tipo:</strong> ${voucherTypeNames[poliza.voucherType] || poliza.voucherType}<br>
              <strong>Número:</strong> ${voucherTypeNames[poliza.voucherType]?.charAt(0) || 'D'}-${voucherNumber}<br>
              <strong>Fecha:</strong> ${poliza.date.toLocaleDateString('es-HN')}
            </td>
            <td style="border: none; width: 50%; text-align: right;">
              <strong>Total:</strong> ${formatCurrency(poliza.totalAmount)}
            </td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Descripción:</strong><br>
        ${poliza.description}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cuenta</th>
            <th class="text-right">Debe</th>
            <th class="text-right">Haber</th>
          </tr>
        </thead>
        <tbody>
          ${poliza.entries.map(entry => `
            <tr>
              <td>${entry.account.code}</td>
              <td>${entry.account.name}${entry.description ? `<br><small style="color: #666;">${entry.description}</small>` : ''}</td>
              <td class="text-right">${entry.amount > 0 ? formatCurrency(entry.amount) : ''}</td>
              <td class="text-right">${entry.amount < 0 ? formatCurrency(-entry.amount) : ''}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="2" class="text-center"><strong>TOTAL PÓLIZA</strong></td>
            <td class="text-right"><strong>${formatCurrency(poliza.entries.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0n), 0n))}</strong></td>
            <td class="text-right"><strong>${formatCurrency(poliza.entries.reduce((sum, e) => sum + (e.amount < 0 ? -e.amount : 0n), 0n))}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 30px; font-size: 9pt; color: #666;">
        <p>Documento contable generado electrónicamente. Validez legal conforme a legislación vigente.</p>
      </div>
    `;

    const html = await this.generateHTML(content, {
      title: voucherTypeNames[poliza.voucherType] || 'Póliza Contable',
      subtitle: `N° ${voucherTypeNames[poliza.voucherType]?.charAt(0) || 'D'}-${voucherNumber}`,
      date: poliza.date.toLocaleDateString('es-HN'),
      ...options,
    });

    return await this.htmlToPDF(html);
  }

  static async exportTaxReportToPDF(taxReport: any, options?: Partial<PDFExportOptions>): Promise<Buffer> {
    const content = `
      <div style="margin-bottom: 20px;">
        <h3>Resumen de Impuestos - ISV</h3>
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            <td style="width: 50%;"><strong>Período:</strong> ${taxReport.period}</td>
            <td style="width: 50%;"><strong>Tasa ISV:</strong> ${(taxReport.taxConfig.rate * 100).toFixed(1)}%</td>
          </tr>
        </table>
      </div>
      
      <h4 style="color: #2d5016; border-bottom: 1px solid #2d5016; padding-bottom: 5px;">1. VENTAS (ISV Cobrado)</h4>
      <table style="margin-bottom: 30px;">
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
      <table style="margin-bottom: 30px;">
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
      
      <div style="background-color: #f3e8ff; border: 2px solid #7c3aed; padding: 20px; margin: 30px 0;">
        <h4 style="color: #5b21b6; margin-top: 0;">3. LIQUIDACIÓN DE ISV</h4>
        <table style="width: 100%; border: none;">
          <tr style="border: none;">
            <td style="border: none; width: 60%;">ISV por Ventas (Cobrado):</td>
            <td style="border: none; width: 40%; text-align: right; font-weight: bold;">${formatCurrency(taxReport.sales.totalTax)}</td>
          </tr>
          <tr style="border: none;">
            <td style="border: none;">(-) ISV por Compras (Recuperable):</td>
            <td style="border: none; text-align: right; font-weight: bold;">- ${formatCurrency(taxReport.purchases.totalTax)}</td>
          </tr>
          <tr style="border: none; font-size: 14pt; color: #5b21b6;">
            <td style="border: none; padding-top: 15px;"><strong>(=) ISV A PAGAR:</strong></td>
            <td style="border: none; text-align: right; padding-top: 15px;"><strong>${formatCurrency(taxReport.summary.totalTaxToPay)}</strong></td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 40px; font-size: 10pt; border-top: 1px solid #ccc; padding-top: 20px;">
        <p><strong>DECLARACIÓN JURADA:</strong> Los datos contenidos en este documento son fiel reflejo de los registros contables de la empresa.</p>
        <p style="margin-top: 15px;">Este documento cumple con los requisitos del Servicio de Administración de Rentas (SAR) para la presentación de la declaración mensual de ISV.</p>
      </div>
    `;

    const html = await this.generateHTML(content, {
      title: 'Declaración Mensual de ISV',
      subtitle: 'Reporte de Impuesto Sobre Ventas - SAR',
      period: taxReport.period,
      ...options,
    });

    return await this.htmlToPDF(html);
  }

  private static async htmlToPDF(html: string): Promise<Buffer> {
    // For serverless environments, we'll use a simpler approach
    // In production, you might want to use a dedicated PDF service
    
    // For now, return HTML content that can be converted client-side or by a microservice
    // This is a placeholder implementation
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Get all pólizas for a period
   */
  static async getPolizasForPeriod(period: string): Promise<PolizaData[]> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await (db as any).transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: [
        { voucherNumber: 'asc' },
        { date: 'asc' }
      ]
    } as any);

    return transactions.map((tx: any) => ({
      id: tx.id,
      date: tx.date,
      voucherType: tx.voucherType,
      voucherNumber: tx.voucherNumber,
      description: tx.description,
      totalAmount: tx.totalAmount,
      entries: tx.entries.map((entry: any) => ({
        account: {
          code: entry.account.code,
          name: entry.account.name,
        },
        amount: entry.amount,
        description: entry.transactionId, // Simplified
      })),
    }));
  }
}

export default PDFExportService;

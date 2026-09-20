"use server";

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdfkit';

// Cliente Supabase para lecturas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Interfaz para un log de auditoría individual
 */
export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id?: string;
  user_agent?: string;
  ip_address?: string;
  category?: string;
  description?: string;
  created_at?: string;
}

/**
 * Interfaz para el resumen de logs exportados
 */
export interface AuditLogSummary {
  total: number;
  byTable: Record<string, number>;
  byAction: Record<string, number>;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Obtiene logs de auditoría desde Supabase para un período dado
 */
export async function getAuditLogsFromSupabase(
  tenantId: string,
  period: string
): Promise<{ logs: AuditLogEntry[], summary: AuditLogSummary }> {
  const [year, month] = period.split('-').map(Number);

  // Consulta a la tabla audit_log en Supabase
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${period}-01`)
    .lte('created_at', `${period}-${getDaysInMonth(year, month)} 23:59:59`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audit logs from Supabase:', error);
    return { logs: [], summary: { total: 0, byTable: {}, byAction: {}, dateRange: { start: period, end: period } } };
  }

  const logs: AuditLogEntry[] = data || [];

  // Calcular resumen
  const byTable: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  let earliestDate: string | null = null;
  let latestDate: string | null = null;

  logs.forEach(log => {
    // Contar por tabla
    byTable[log.table_name] = (byTable[log.table_name] || 0) + 1;

    // Contar por acción
    const action = log.action || 'UNKNOWN';
    byAction[action] = (byAction[action] || 0) + 1;

    // Fechas rango
    const createdAt = log.created_at ? new Date(log.created_at) : new Date();
    if (!earliestDate || createdAt < new Date(earliestDate)) {
      earliestDate = format(createdAt, 'yyyy-MM-dd');
    }
    if (!latestDate || createdAt > new Date(latestDate)) {
      latestDate = format(createdAt, 'yyyy-MM-dd');
    }
  });

  const summary: AuditLogSummary = {
    total: logs.length,
    byTable,
    byAction,
    dateRange: {
      start: earliestDate || period,
      end: latestDate || period,
    },
  };

  return { logs, summary };
}

/**
 * Obtiene el número de días en un mes dado
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formatea un objeto de log para display en PDF/Excel
 */
function formatAuditLogForDisplay(log: AuditLogEntry): any {
  return {
    ID: log.id.substring(0, 8) + '...',
    Tabla: log.table_name || 'N/A',
    Acción: log.action || 'N/A',
    Usuario: log.user_id || 'Sistema',
    Fecha: log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
    Descripción: log.description || 'Sin descripción',
    Registros: log.changed_fields?.length > 0 ? log.changed_fields.join(', ') : 'Todos los campos',
  };
}

/**
 * Genera el contenido HTML para el PDF de logs de auditoría
 */
function generateAuditLogsPDFHTML(
  logs: AuditLogEntry[],
  summary: AuditLogSummary,
  period: string,
  tenantName: string
): string {
  const currentDate = new Date().toLocaleDateString('es-HN');

  // Generar filas de tabla
  const rows = logs.map((log) => formatAuditLogForDisplay(log)).map((log: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px;">${log.ID}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px;">${log.Tabla}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px; text-align: center;">${log.Acción}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px;">${log.Usuario}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px;">${log.Fecha}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 9px;">${log.Descripción.substring(0, 50)}${log.Descripción.length > 50 ? '...' : ''}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Logs de Auditoría - Contab</title>
      <style>
        @page {
          size: letter;
          margin: 2cm 2.5cm;
        }
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          font-size: 9pt;
          line-height: 1.4;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #003366;
          padding-bottom: 15px;
          margin-top: -10px;
        }
        .company-name {
          font-size: 14pt;
          font-weight: bold;
          color: #003366;
          margin-bottom: 5px;
        }
        .document-title {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #003366;
          margin-bottom: 5px;
        }
        .document-meta {
          font-size: 9pt;
          color: #666;
        }
        .period-info {
          font-size: 9pt;
          color: #666;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 8pt;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px 4px;
          text-align: left;
          vertical-align: top;
          font-size: 8pt;
        }
        th {
          background-color: #003366;
          color: white;
          font-weight: bold;
          padding: 8px 4px;
          text-align: center;
          font-size: 9px;
        }
        .summary {
          background-color: #f5f5f5;
          padding: 10px;
          margin: 15px 0;
          border: 1px solid #ddd;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-size: 9px;
        }
        .summary-label {
          width: 40%;
        }
        .summary-value {
          width: 60%;
          text-align: right;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 8pt;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Contab - Sistema Contable Honduras</div>
        <div class="document-title">Logs de Auditoría</div>
        <div class="document-meta">
          Período: ${period}<br>
          Generado: ${currentDate}<br>
          Empresa: ${tenantName || 'N/A'}
        </div>
      </div>

      <div class="period-info">
        <strong>Resumen General:</strong> ${summary.total} logs auditados<br>
        <strong>Rango de fechas:</strong> ${summary.dateRange.start} - ${summary.dateRange.end}
      </div>

      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">Total de Logs:</span>
          <span class="summary-value">${summary.total}</span>
        </div>
        ${Object.entries(summary.byTable).map(([table, count]) => `
          <div class="summary-row">
            <span class="summary-label">${table}:</span>
            <span class="summary-value">${count}</span>
          </div>`).join('')}
        ${Object.entries(summary.byAction).map(([action, count]) => `
          <div class="summary-row">
            <span class="summary-label">${action}:</span>
            <span class="summary-value">${count}</span>
          </div>`).join('')}
      </div>

      <h3 style="color: #003366; border-bottom: 1px solid #003366; padding-bottom: 5px; margin: 20px 0;">
        Detalle de Logs
      </h3>

      <table>
        <thead>
          <tr>
            <th style="width: 15%;">ID</th>
            <th style="width: 20%;">Tabla</th>
            <th style="width: 15%;" class="text-center">Acción</th>
            <th style="width: 15%;">Usuario</th>
            <th style="width: 20%;">Fecha</th>
            <th style="width: 35%;">Descripción</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        Documento generado por Contab System - Sistema de Contabilidad Profesional<br>
        Para consultas sobre este reporte, contacte al departamento de contabilidad.
      </div>
    </body>
    </html>
  `;
}

/**
 * Exporta logs de auditoría a PDF
 * 
 * @param tenantId ID del tenant/empresa
 * @param logs Array de logs de auditoría
 * @param period Período en formato YYYY-MM
 * @returns URL firmada del PDF en Supabase Storage
 */
export async function exportAuditLogsToPDF(
  tenantId: string,
  logs: AuditLogEntry[],
  period: string
): Promise<string> {
  // Obtener nombre de la empresa desde Supabase
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tenantData } = await supabase
    .from('Tenants')
    .select('business_name')
    .eq('id', tenantId)
    .maybeSingle();

  // Generar contenido HTML
  const html = generateAuditLogsPDFHTML(logs, { total: logs.length, byTable: {}, byAction: {}, dateRange: { start: period, end: period } }, period, tenantData?.business_name);

  // Crear PDF usando pdfkit
  const doc = new PDFDocument({
    margin: 40,
    size: 'letter',
  });

  // Buffer para almacenar el PDF
  const chunks: Buffer[] = [];

  // Evento para capturar los datos del PDF
  doc.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  // Evento para cuando el PDF termina
  await new Promise<void>((resolve) => {
    doc.on('end', resolve);
  });

  // Construir el PDF
  doc
    .fontSize(9)
    .text(`Logs de Auditoría - Período: ${period}`, 50, 50)
    .text(`Empresa: ${tenantData?.business_name || 'N/A'}`, 50, 65)
    .text(`Total de logs: ${logs.length}`, 50, 80)
    .text(`Generado: ${new Date().toLocaleDateString('es-HN')}`, 50, 95)
    .moveDown(20);

  // Agregar tabla de logs
  doc.addPage();
  doc.fontSize(7.5).table(
    [
      { ID: 'ID', Tabla: 'Tabla', Acción: 'Acción', Usuario: 'Usuario', Fecha: 'Fecha', Descripción: 'Descripción' },
      ...logs.map((log) => formatAuditLogForDisplay(log)),
    ],
    {
      columnWidths: [30, 40, 25, 30, 30, 230],
      prepareHeader: () => {
        doc.fontSize(8);
        doc.font('Helvetica');
      },
    }
  );

  // Guardar el PDF en un buffer
  const pdfBuffer = await doc.promiseStore();

  // Identificador único para el cache
  const identifier = `audit_logs_${tenantId}_${period}_${uuidv4()}`;

  // Subir a Supabase Storage y obtener URL firmada
  const { data, error } = await supabase.storage
    .from('pdf-exports')
    .upload(`${identifier}.pdf`, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading PDF to Supabase Storage:', error);
    throw new Error('Error al subir el PDF a Storage');
  }

  // Obtener URL firmada
  const { data: { signedUrl } } = supabase.storage
    .from('pdf-exports')
    .getPublicUrl(`${identifier}.pdf`);

  return signedUrl;
}

/**
 * Exporta logs de auditoría a Excel
 * 
 * @param tenantId ID del tenant/empresa
 * @param logs Array de logs de auditoría
 * @param period Período en formato YYYY-MM
 * @returns Buffer con el archivo Excel
 */
export async function exportAuditLogsToExcel(
  tenantId: string,
  logs: AuditLogEntry[],
  period: string
): Promise<Buffer> {
  // Obtener nombre de la empresa desde Supabase
  const { data: tenantData } = await supabase
    .from('Tenants')
    .select('business_name')
    .eq('id', tenantId)
    .maybeSingle();

  // Datos para Excel - encabezados
  const headers = [
    'ID Log',
    'Tabla',
    'Acción',
    'Usuario',
    'Fecha',
    'Descripción',
    'Campos Cambiados',
  ];

  // Filas de datos
  const rows = logs.map((log) => [
    log.id.substring(0, 8) + '...',
    log.table_name || 'N/A',
    log.action || 'N/A',
    log.user_id || 'Sistema',
    log.created_at ? new Date(log.created_at).toLocaleString('es-HN') : 'N/A',
    log.description ? log.description.substring(0, 100) : 'Sin descripción',
    log.changed_fields?.length > 0 ? log.changed_fields.join(', ') : 'Todos los campos',
  ]);

  // Agregar resumen al final
  const summaryRow = [
    'RESUMEN',
    '',
    '',
    '',
    `Período: ${period}`,
    `Total de logs: ${logs.length}`,
    '',
  ];

  // Combinar headers y rows
  const allRows = [headers, ...rows, summaryRow];

  // Generar hoja de cálculo CSV (usando formato compatible con Excel)
  // Usar un formato simple que Excel pueda leer
  let csvContent = '';

  // Agregar headers
  csvContent += headers.map((header) => `"${header}"`).join(',') + '\r\n';

  // Agregar filas de datos
  rows.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(',') + '\r\n';
  });

  // Agregar fila de resumen
  csvContent += summaryRow.map((cell) => `"${cell}"`).join(',') + '\r\n';

  // Convertir a Buffer
  const buffer = Buffer.from(csvContent, 'utf-8');

  return buffer;
}
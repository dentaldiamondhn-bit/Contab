import { NextRequest, NextResponse } from "next/server";
import { exportAuditLogsToPDF, exportAuditLogsToExcel } from "@/lib/services/audit-export-service";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET /api/accounting/export-audit?period=YYYY-MM&type=pdf|excel
 * 
 * Exporta logs de auditoría a PDF o Excel.
 * 
 * Parámetros:
 * - period: YYYY-MM (opcional, por defecto mes actual)
 * - type: pdf|excel (opcional, por defecto pdf)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const tenantId = searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const exportType = searchParams.get("type") || "pdf";

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    // Validar formato de período
    const [year, month] = period.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Formato de período inválido. Use YYYY-MM" }, { status: 400 });
    }

    // Obtener logs de auditoría desde Supabase
    const supa = getSupabaseServer();
    const { data: auditLogs, error } = await supa
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${period}-01`)
      .lte('created_at', `${period}-31 23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 });
    }

    if (!auditLogs || auditLogs.length === 0) {
      // Retornar respuesta vacía pero exitosa
      if (exportType === "pdf") {
        return NextResponse.json({ 
          success: true, 
          data: { logs: [], summary: { total: 0, byTable: {} } },
          filename: `Logs_Auditoria_${period}.pdf`
        });
      }
      return NextResponse.json({ 
        success: true, 
        data: { logs: [], summary: { total: 0, byTable: {} } },
        filename: `Logs_Auditoria_${period}.xlsx`
      });
    }

    if (exportType === "pdf") {
      const signedUrl = await exportAuditLogsToPDF(tenantId, auditLogs, period);
      return NextResponse.json({ 
        success: true, 
        signedUrl,
        filename: `Logs_Auditoria_${period}.pdf`,
        totalLogs: auditLogs.length
      });
    } else {
      const fileBuffer = await exportAuditLogsToExcel(tenantId, auditLogs, period);
      // Retornar el archivo como respuesta descargable
      const timestamp = new Date().toISOString();
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Disposition': `attachment; filename="Logs_Auditoria_${period}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 });
  }
}
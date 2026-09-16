import { NextRequest, NextResponse } from "next/server";
import { supabase as sb } from "@/lib/supabase-db";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function parseFecha(raw: any): string {
  if (typeof raw === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const days = raw - 1;
    const jsDate = new Date(excelEpoch.getTime() + days * 86400000);
    return jsDate.toISOString().split("T")[0];
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) throw new Error("Fecha vacía");
    if (s.includes("/")) {
      const parts = s.split("/");
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d).toISOString().split("T")[0];
    }
    return new Date(s).toISOString().split("T")[0];
  }
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  throw new Error(`Fecha inválida: ${raw}`);
}

function parseMonto(v: any): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/^L\s*/i, "").replace(/,/g, "").trim();
  return parseFloat(s) || 0;
}

async function resolveTenantId(input: string): Promise<string | null> {
  const { data: byId } = await sb.from("Tenant").select("id").eq("id", input).maybeSingle();
  if (byId?.id) return byId.id;
  const { data: byCode } = await sb.from("Tenant").select("id").eq("tenant_code", input).maybeSingle();
  if (byCode?.id) return byCode.id;
  const { data: comp } = await sb.from("companies").select("tenant_id").eq("id", input).maybeSingle();
  if ((comp as any)?.tenant_id) return (comp as any).tenant_id;
  return null;
}

async function getNextVoucherNumber(tenantId: string, voucherType: string): Promise<number> {
  const { data: globalMax } = await sb.from("Transaction").select("voucherNumber").eq("voucherType", voucherType).order("voucherNumber", { ascending: false }).limit(1).maybeSingle();
  const globalNext = ((globalMax as any)?.voucherNumber || 0) + 1;
  const { data: tenantMax } = await sb.from("Transaction").select("voucherNumber").eq("tenantId", tenantId).eq("voucherType", voucherType).order("voucherNumber", { ascending: false }).limit(1).maybeSingle();
  const tenantNext = ((tenantMax as any)?.voucherNumber || 0) + 1;
  return Math.max(globalNext, tenantNext);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tenantIdRaw = formData.get("tenantId") as string | null;

    if (!file || !tenantIdRaw) {
      return NextResponse.json({ error: "file y tenantId requeridos" }, { status: 400 });
    }

    const tenantId = (await resolveTenantId(tenantIdRaw)) || tenantIdRaw;
    const { data: tenantExists } = await sb.from("Tenant").select("id").eq("id", tenantId).maybeSingle();
    if (!tenantExists) {
      return NextResponse.json({ error: `Tenant no encontrado: ${tenantIdRaw}` }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    let totalRows = 0;
    let processed = 0;
    const errors: string[] = [];
    const createdTxIds: string[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true }) as any[][];
      if (jsonData.length < 2) { errors.push(`Hoja "${sheetName}" vacía`); continue; }

      const headers = jsonData[0].map((h: any) => (h ?? "").toString().toLowerCase().trim());
      const rows = jsonData.slice(1);
      totalRows += rows.length;

      const normHeaders = headers.map(h => h.toLowerCase().trim().replace(/[()\/\-\.\s]/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, ""));

      const hasFecha = normHeaders.some(h => h === "fecha" || h === "fecha_transaccion");
      const hasTipo = normHeaders.some(h => h === "tipo" || h === "tipo_comprobante" || h === "tipo_transaccion");
      const hasDesc = normHeaders.some(h => h === "descripcion" || h === "concepto" || h === "detalle");
      const hasMonto = normHeaders.some(h => h === "monto" || h === "total" || h === "monto_total");

      if (!hasFecha || !hasTipo || !hasDesc || !hasMonto) {
        errors.push(`Hoja "${sheetName}": plantilla no reconocida. Se esperan: fecha, tipo, descripcion, monto`);
        continue;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const fechaRaw = row[normHeaders.findIndex(h => h === "fecha" || h === "fecha_transaccion")];
        const tipoRaw = row[normHeaders.findIndex(h => h === "tipo" || h === "tipo_comprobante" || h === "tipo_transaccion")];
        const descRaw = row[normHeaders.findIndex(h => h === "descripcion" || h === "concepto" || h === "detalle")];
        const montoRaw = row[normHeaders.findIndex(h => h === "monto" || h === "total" || h === "monto_total")];

        if (!fechaRaw || String(fechaRaw).trim() === "") continue;
        if (!tipoRaw || String(tipoRaw).trim() === "") continue;

        try {
          const fecha = parseFecha(fechaRaw);
          const tipo = String(tipoRaw).trim().toUpperCase();
          if (tipo !== "INGRESO" && tipo !== "EGRESO") throw new Error(`Tipo inválido: ${tipoRaw}`);
          const description = String(descRaw ?? "").trim();
          const monto = parseMonto(montoRaw);
          if (monto <= 0) throw new Error("Monto inválido");

          const voucherNumber = await getNextVoucherNumber(tenantId, tipo);
          const txId = randomUUID();
          const nowTx = new Date().toISOString();
          const amt = Math.round(monto * 100);

          const payload: any = {
            id: txId, tenantId, date: fecha, description,
            voucherType: tipo, voucherNumber, currency: "HNL", exchangeRate: 24.7,
            totalAmount: amt, functionalAmount: amt, originalTotal: amt,
            createdAt: nowTx, updatedAt: nowTx,
          };

          const { data: inserted, error: txErr } = await sb.from("Transaction").insert(payload).select("id").single();
          if (txErr) throw txErr;

          const accountId = tipo === "INGRESO" ? "4101" : "6103";
          const { data: accData } = await sb.from("Account").select("id").eq("tenantId", tenantId).eq("code", accountId).maybeSingle() || await sb.from("Account").select("id").eq("code", accountId).maybeSingle();
          const accId = accData?.id || accountId;

          await sb.from("JournalEntry").insert({
            id: randomUUID(), transactionId: txId, accountId: accId, tenantId,
            amount: tipo === "INGRESO" ? amt : -amt,
            originalAmount: amt, currency: "HNL", exchangeRate: 24.7,
            description,
          });

          processed++;
          createdTxIds.push(txId);
        } catch (e: any) {
          errors.push(`Fila ${i + 2} "${sheetName}": ${e.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalRows,
      processed,
      errors: errors.slice(0, 20),
      hasMoreErrors: errors.length > 20,
      message: errors.length ? `Procesado ${processed}/${totalRows} con ${errors.length} errores` : `¡${processed} transacciones importadas!`,
    });
  } catch (error: any) {
    console.error("transaction-import error", error);
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}

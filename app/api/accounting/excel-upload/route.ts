import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-db";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const TEMPLATES: Record<string, string[]> = {
  egresos_personalizado: [
    "fecha", "cheque / transf.", "proveedor / beneficiario", "rtn proveedor",
    "concepto", "monto neto", "isv pagado", "total egreso"
  ],
  ingresos_personalizado: [
    "fecha", "documento (recibo/factura)", "cliente / concepto", "rtn cliente",
    "monto exento", "monto gravado (15%)", "isv (15%)", "total ingreso"
  ],
  libro_diario: [
    "fecha", "tipo_comprobante", "numero_comprobante", "descripcion",
    "codigo_cuenta", "nombre_cuenta", "debe", "haber"
  ],
  libro_mayor: [
    "codigo_cuenta", "nombre_cuenta", "tipo_cuenta", "total_debe", "total_haber", "saldo"
  ],
  libro_compras: [
    "fecha", "numero_factura", "rtn_proveedor", "descripcion_compra", 
    "monto_compra", "credito_fiscal"
  ],
  libro_ventas: [
    "fecha", "numero_factura", "rtn_cliente", "descripcion_venta",
    "monto_venta", "debito_fiscal"
  ],
};

const ACCOUNT_IDS: Record<string, { code: string; name: string; type: string }> = {
  CAJA: { code: "1101", name: "Caja Principal", type: "ASSET" },
  BANCOS: { code: "1110", name: "Bancos", type: "ASSET" },
  VENTAS: { code: "4101", name: "Ventas de Servicios", type: "REVENUE" },
  GASTOS_OPERATIVOS: { code: "6103", name: "Gastos Operativos - Servicios Básicos", type: "EXPENSE" },
};

async function resolveTenantId(input: string): Promise<string | null> {
  const { data: byId } = await supabase.from("Tenant").select("id").eq("id", input).maybeSingle();
  if (byId?.id) return byId.id;
  const { data: byCode } = await supabase.from("Tenant").select("id").eq("tenant_code", input).maybeSingle();
  if (byCode?.id) return byCode.id;
  const { data: comp } = await supabase.from("companies").select("tenant_id").eq("id", input).maybeSingle();
  if ((comp as any)?.tenant_id) return (comp as any).tenant_id;
  return null;
}

async function ensureAccountsExist(tenantId: string) {
  const needed = Object.values(ACCOUNT_IDS);
  const codes = needed.map(n => n.code);
  const { data: existingTenant } = await supabase.from("Account").select("id, code").eq("tenantId", tenantId).in("code", codes);
  const { data: existingGlobal } = await supabase.from("Account").select("id, code").in("code", codes);
  const existingByCode = new Map<string,string>();
  (existingGlobal || []).forEach((a:any)=> existingByCode.set(a.code, a.id));
  (existingTenant || []).forEach((a:any)=> existingByCode.set(a.code, a.id));
  const codeToId = new Map<string, string>();
  for (const acc of needed) {
    if (existingByCode.has(acc.code)) {
      codeToId.set(acc.code, existingByCode.get(acc.code)!);
      continue;
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("Account")
      .insert({
        id,
        tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        createdAt: now,
        updatedAt: now,
      })
      .select("id, code")
      .single();
    if (!error && data) {
      codeToId.set(acc.code, (data as any).id);
    } else if ((error as any)?.code === "23505") {
      const { data: globalAgain } = await supabase.from("Account").select("id").eq("code", acc.code).maybeSingle();
      if (globalAgain) codeToId.set(acc.code, (globalAgain as any).id);
      else console.error("ensureAccounts 23505 but no global found", acc.code, error);
    } else if (error) {
      console.error("ensureAccounts error", acc.code, error);
      const { data: globalAgain } = await supabase.from("Account").select("id").eq("code", acc.code).maybeSingle();
      if (globalAgain) codeToId.set(acc.code, (globalAgain as any).id);
    }
  }
  return codeToId;
}

function parseMonto(v: any): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/^L\s*/i, "").replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseFecha(raw: any): string {
  if (typeof raw === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const days = raw - 1;
    const jsDate = new Date(excelEpoch.getTime() + days * 86400000);
    if (isNaN(jsDate.getTime())) throw new Error(`Fecha Excel inválida: ${raw}`);
    return jsDate.toISOString().split("T")[0];
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) throw new Error("Fecha vacía");
    if (s.includes("/")) {
      const parts = s.split("/");
      if (parts.length !== 3) throw new Error(`Formato fecha no reconocido: ${s}`);
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (isNaN(dt.getTime())) throw new Error(`Fecha inválida: ${s}`);
      return dt.toISOString().split("T")[0];
    }
    const dt = new Date(s);
    if (isNaN(dt.getTime())) throw new Error(`Fecha inválida: ${s}`);
    return dt.toISOString().split("T")[0];
  }
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  throw new Error(`Tipo fecha no soportado: ${raw}`);
}

async function getNextVoucherNumber(tenantId: string, voucherType: string): Promise<number> {
  const { data: globalMax } = await supabase
    .from("Transaction")
    .select("voucherNumber")
    .eq("voucherType", voucherType)
    .order("voucherNumber", { ascending: false })
    .limit(1)
    .maybeSingle();
  const globalNext = ((globalMax as any)?.voucherNumber || 0) + 1;
  const { data: tenantMax } = await supabase
    .from("Transaction")
    .select("voucherNumber")
    .eq("tenantId", tenantId)
    .eq("voucherType", voucherType)
    .order("voucherNumber", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tenantNext = ((tenantMax as any)?.voucherNumber || 0) + 1;
  return Math.max(globalNext, tenantNext);
}

async function insertTransactionWithRetry(payload: any, maxRetries = 5): Promise<{ id: string }> {
  let attempt = 0;
  let voucherNumber = payload.voucherNumber;
  while (attempt < maxRetries) {
    const { data, error } = await supabase.from("Transaction").insert({ ...payload, voucherNumber }).select("id").single();
    if (!error) return { id: (data as any).id };
    if ((error as any).code === "23505" && (error as any).message?.includes("voucher")) {
      voucherNumber += 1;
      attempt++;
      console.warn(`Retrying Transaction duplicate voucher, next=${voucherNumber}`);
      continue;
    }
    throw error;
  }
  throw new Error("No se pudo generar voucher único tras reintentos");
}

function detectBookType(headers: string[]): keyof typeof TEMPLATES | null {
  const norm = headers.map((h) => h.toLowerCase().trim().replace(/[()\/\-\.\s]/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, ""));
  for (const [type, cols] of Object.entries(TEMPLATES)) {
    const ncols = cols.map((c) => c.toLowerCase().trim().replace(/[()\/\-\.\s]/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, ""));
    const match = ncols.filter((col) => norm.some((h) => h === col || h.includes(col) || col.includes(h))).length;
    const pct = match / cols.length;
    const threshold = type.includes("personalizado") ? 0.4 : 0.5;
    if (pct >= threshold) return type as any;
  }
  return null;
}

function getColValue(headers: string[], row: any[], col: string): any {
  const normCol = col.toLowerCase().trim();
  const normHeaders = headers.map((h) => (h ?? "").toString().toLowerCase().trim());
  const idx = normHeaders.findIndex(
    (h) =>
      h === normCol ||
      h.includes(normCol) ||
      normCol.includes(h) ||
      h.replace(/[()]/g, "").includes(normCol.replace(/[()]/g, "")) ||
      normCol.replace(/[()]/g, "").includes(h.replace(/[()]/g, ""))
  );
  return idx >= 0 ? row[idx] : "";
}

function inferAccountType(code: string): string {
  if (!code) return "ASSET";
  const c = code.trim()[0];
  if (c === "1") return "ASSET";
  if (c === "2") return "LIABILITY";
  if (c === "3") return "EQUITY";
  if (c === "4") return "REVENUE";
  if (c === "5" || c === "6" || c === "7") return "EXPENSE";
  return "ASSET";
}

async function ensureDynamicAccounts(tenantId: string, codes: Map<string,string>) {
  // codes: code -> name
  const allCodes = Array.from(codes.keys());
  if (allCodes.length === 0) return new Map<string,string>();
  const { data: existing } = await supabase.from("Account").select("id, code").in("code", allCodes);
  const map = new Map<string,string>();
  (existing || []).forEach((a:any)=> map.set(a.code, a.id));
  for (const [code, name] of codes.entries()) {
    if (map.has(code)) continue;
    const id = randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("Account").insert({
      id, tenantId, code, name: name || `Cuenta ${code}`, type: inferAccountType(code), createdAt: now, updatedAt: now
    }).select("id").single();
    if (!error && data) map.set(code, (data as any).id);
    else if ((error as any)?.code === "23505") {
      const { data: g } = await supabase.from("Account").select("id").eq("code", code).maybeSingle();
      if (g) map.set(code, (g as any).id);
    }
  }
  return map;
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
    const { data: tenantExists } = await supabase.from("Tenant").select("id").eq("id", tenantId).maybeSingle();
    if (!tenantExists) {
      return NextResponse.json({ error: `Tenant no encontrado: ${tenantIdRaw}` }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    let totalRows = 0;
    let processed = 0;
    const errors: string[] = [];
    const createdTxIds: string[] = [];

    const codeToId = await ensureAccountsExist(tenantId);
    const cajaId = codeToId.get("1101")!;
    const gastosId = codeToId.get("6103")!;
    const ventasId = codeToId.get("4101")!;

    if (!cajaId || !gastosId || !ventasId) {
      return NextResponse.json({ error: "No se pudieron crear cuentas base", codeToId: Object.fromEntries(codeToId) }, { status: 500 });
    }

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true }) as any[][];
      if (jsonData.length < 2) {
        errors.push(`Hoja "${sheetName}" vacía`);
        continue;
      }
      const headers = jsonData[0].map((h: any) => (h ?? "").toString().toLowerCase().trim());
      const rows = jsonData.slice(1);
      totalRows += rows.length;

      const detected = detectBookType(headers);
      if (!detected) {
        errors.push(`Hoja "${sheetName}": formato no reconocido (${headers.join(", ")})`);
        continue;
      }

      // Libro Diario: procesar agrupado por comprobante (usa mismo formato que pagina)
      if (detected === "libro_diario") {
        try {
          // Recolectar códigos dinámicos
          const codeNameMap = new Map<string,string>();
          for (const r of rows) {
            const code = String(getColValue(headers, r, "codigo_cuenta") ?? "").trim();
            const name = String(getColValue(headers, r, "nombre_cuenta") ?? "").trim();
            if (code) codeNameMap.set(code, name);
          }
          const dynamicMap = await ensureDynamicAccounts(tenantId, codeNameMap);
          // merge con codeToId base
          for (const [k,v] of dynamicMap.entries()) codeToId.set(k, v);

          // Agrupar por tipo+numero+fecha
          const groups = new Map<string, { fecha: string; tipo: string; numero: string; descripcion: string; lines: any[] }>();
          for (const r of rows) {
            const fechaRaw = getColValue(headers, r, "fecha");
            if (!fechaRaw || String(fechaRaw).trim()==="") continue;
            const tipo = String(getColValue(headers, r, "tipo_comprobante") ?? "DIARIO").trim() || "DIARIO";
            const numero = String(getColValue(headers, r, "numero_comprobante") ?? "").trim() || "0";
            const fecha = parseFecha(fechaRaw);
            const key = `${tipo}|${numero}|${fecha}`;
            if (!groups.has(key)) groups.set(key, { fecha, tipo, numero, descripcion: String(getColValue(headers, r, "descripcion") ?? ""), lines: [] });
            groups.get(key)!.lines.push(r);
          }
          for (const [, g] of groups) {
            const totalDebe = g.lines.reduce((s, r)=> s + parseMonto(getColValue(headers, r, "debe")), 0);
            const totalHaber = g.lines.reduce((s, r)=> s + parseMonto(getColValue(headers, r, "haber")), 0);
            const total = Math.max(totalDebe, totalHaber);
            if (total <= 0) continue;
            let voucherNumber: number;
            const numInt = parseInt(g.numero, 10);
            if (!isNaN(numInt) && numInt>0) {
              // intentar usar numero del Excel, con retry si colisiona global
              voucherNumber = numInt;
            } else {
              voucherNumber = await getNextVoucherNumber(tenantId, g.tipo.toUpperCase());
            }
            const txId = randomUUID();
            const nowTx = new Date().toISOString();
            const amt = Math.round(total * 100);
            const payload: any = {
              id: txId, tenantId, date: g.fecha, description: g.descripcion || `${g.tipo} ${g.numero}`,
              voucherType: g.tipo.toUpperCase(), voucherNumber, currency: "HNL", exchangeRate: 24.7,
              totalAmount: amt, functionalAmount: amt, originalTotal: amt,
              createdAt: nowTx, updatedAt: nowTx,
            };
            const inserted = await insertTransactionWithRetry(payload);
            const finalTxId = inserted.id;
            createdTxIds.push(finalTxId);
            for (const r of g.lines) {
              const code = String(getColValue(headers, r, "codigo_cuenta") ?? "").trim();
              const debe = parseMonto(getColValue(headers, r, "debe"));
              const haber = parseMonto(getColValue(headers, r, "haber"));
              const amount = debe > 0 ? Math.round(debe*100) : -Math.round(haber*100);
              if (amount === 0) continue;
              const accId = codeToId.get(code);
              if (!accId) throw new Error(`Cuenta ${code} no encontrada`);
              await supabase.from("JournalEntry").insert({
                id: randomUUID(), transactionId: finalTxId, accountId: accId, tenantId,
                amount, originalAmount: Math.abs(amount), currency: "HNL", exchangeRate: 24.7,
                description: g.descripcion,
              });
            }
            processed += g.lines.length;
          }
        } catch (e:any) {
          errors.push(`Hoja "${sheetName}" libro_diario: ${e.message}`);
        }
        continue;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const fechaRaw = getColValue(headers, row, "fecha");
        if (fechaRaw === "" || fechaRaw == null || (typeof fechaRaw === "string" && fechaRaw.trim() === "")) {
          continue;
        }
        try {
          if (detected === "egresos_personalizado") {
            const fecha = parseFecha(fechaRaw);
            const cheque = String(getColValue(headers, row, "cheque / transf.") ?? "");
            const prov = String(getColValue(headers, row, "proveedor / beneficiario") ?? "");
            const rtn = String(getColValue(headers, row, "rtn proveedor") ?? "");
            const concepto = String(getColValue(headers, row, "concepto") ?? "");
            const total = parseMonto(getColValue(headers, row, "total egreso"));

            if (!prov || !concepto || total <= 0) throw new Error("Faltan datos obligatorios (proveedor/concepto/total)");
            let voucherNumber = await getNextVoucherNumber(tenantId, "EGRESO");

            const nowTx = new Date().toISOString();
            const amt = Math.round(total * 100);
            const txId = randomUUID();
            const payloadEgreso: any = {
                id: txId,
                tenantId,
                date: fecha,
                description: `${prov} - ${concepto}`,
                voucherType: "EGRESO",
                voucherNumber,
                currency: "HNL",
                exchangeRate: 24.7,
                totalAmount: amt,
                functionalAmount: amt,
                originalTotal: amt,
                reference: cheque || null,
                proveedorRTN: rtn || null,
                createdAt: nowTx,
                updatedAt: nowTx,
              };
            let inserted = await insertTransactionWithRetry(payloadEgreso);
            const finalTxId = inserted.id;
            createdTxIds.push(finalTxId);

            const { error: je1Err } = await supabase.from("JournalEntry").insert({
              id: randomUUID(),
              transactionId: finalTxId,
              accountId: gastosId,
              tenantId,
              amount: amt,
              originalAmount: amt,
              currency: "HNL",
              exchangeRate: 24.7,
              description: concepto,
            });
            if (je1Err) throw je1Err;

            const { error: je2Err } = await supabase.from("JournalEntry").insert({
              id: randomUUID(),
              transactionId: finalTxId,
              accountId: cajaId,
              tenantId,
              amount: -amt,
              originalAmount: amt,
              currency: "HNL",
              exchangeRate: 24.7,
              description: cheque || "Egreso de caja",
            });
            if (je2Err) throw je2Err;

            processed++;
          } else if (detected === "ingresos_personalizado") {
            const fecha = parseFecha(fechaRaw);
            const doc = String(getColValue(headers, row, "documento (recibo/factura)") ?? "");
            const cliente = String(getColValue(headers, row, "cliente / concepto") ?? "");
            const rtn = String(getColValue(headers, row, "rtn cliente") ?? "");
            const total = parseMonto(getColValue(headers, row, "total ingreso"));
            if (!cliente || total <= 0) throw new Error("Faltan datos (cliente/total)");
            let voucherNumber = await getNextVoucherNumber(tenantId, "INGRESO");

            const nowTx2 = new Date().toISOString();
            const amt2 = Math.round(total * 100);
            const txId2 = randomUUID();
            const payloadIngreso: any = {
                id: txId2,
                tenantId,
                date: fecha,
                description: `${cliente} - ${doc}`,
                voucherType: "INGRESO",
                voucherNumber,
                currency: "HNL",
                exchangeRate: 24.7,
                totalAmount: amt2,
                functionalAmount: amt2,
                originalTotal: amt2,
                reference: doc || null,
                clienteRTN: rtn || null,
                createdAt: nowTx2,
                updatedAt: nowTx2,
              };
            let inserted2 = await insertTransactionWithRetry(payloadIngreso);
            const finalTxId2 = inserted2.id;
            createdTxIds.push(finalTxId2);

            await supabase.from("JournalEntry").insert({
              id: randomUUID(),
              transactionId: finalTxId2,
              accountId: cajaId,
              tenantId,
              amount: amt2,
              originalAmount: amt2,
              currency: "HNL",
              exchangeRate: 24.7,
              description: doc || "Ingreso de caja",
            });
            await supabase.from("JournalEntry").insert({
              id: randomUUID(),
              transactionId: finalTxId2,
              accountId: ventasId,
              tenantId,
              amount: -amt2,
              originalAmount: amt2,
              currency: "HNL",
              exchangeRate: 24.7,
              description: cliente,
            });
            processed++;
          }
        } catch (e: any) {
          errors.push(`Fila ${i + 2} "${sheetName}": ${e.message}`);
        }
      }
    }

    // Guardar archivo físico en Storage (para descargar) + historial en File
    let storedPath = `uploads/${tenantId}/${Date.now()}_${file.name}`;
    try {
      const bucket = "ticket-attachments";
      const up = await supabase.storage.from(bucket).upload(`accounting/${tenantId}/${Date.now()}_${file.name}`, buffer, {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      if (!up.error && up.data) storedPath = up.data.path;
    } catch (e) { console.warn("Storage upload falló, usando path local", e); }
    try {
      await supabase.from("File").insert({
        id: randomUUID(),
        tenantId,
        originalName: file.name,
        fileName: `${Date.now()}_${file.name}`,
        filePath: storedPath,
        fileSize: file.size,
        mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileType: "excel",
        category: "accounting_excel",
        uploadedBy: "system",
        status: errors.length ? "partial" : "processed",
        metadata: JSON.stringify({ processed, totalRows, errors: errors.slice(0,5), uploadedAt: new Date().toISOString(), transactionIds: createdTxIds }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    } catch (e) { console.warn("No se pudo guardar historial File", e); }

    return NextResponse.json({
      success: true,
      totalRows,
      processed,
      errors: errors.slice(0, 20),
      hasMoreErrors: errors.length > 20,
      message: errors.length ? `Procesado ${processed}/${totalRows} con ${errors.length} errores` : `¡${processed} filas importadas!`,
    });
  } catch (error: any) {
    console.error("excel-upload error", error);
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}

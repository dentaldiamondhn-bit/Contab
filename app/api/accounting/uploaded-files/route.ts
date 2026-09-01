import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const downloadId = searchParams.get("downloadId");
    const tenantId = searchParams.get("tenantId") || searchParams.get("companyId") || request.headers.get("x-tenant-id");

    // Modo descarga: devuelve el archivo binario desde Storage
    if (downloadId) {
      const { data: fileRec } = await supabaseService.from("File").select("filePath, originalName, mimeType").eq("id", downloadId).maybeSingle() as any;
      if (!fileRec?.filePath) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      const bucket = "ticket-attachments";
      // filePath ya incluye bucket path como accounting/... o ticket-attachments/...
      const path = fileRec.filePath.startsWith("accounting/") ? fileRec.filePath : fileRec.filePath;
      const { data, error } = await supabaseService.storage.from(bucket).download(path);
      if (error || !data) {
        // intentar con path tal cual
        const alt = await supabaseService.storage.from(bucket).download(fileRec.filePath);
        if (alt.error || !alt.data) return NextResponse.json({ error: "No se pudo descargar" }, { status: 404 });
        return new NextResponse(alt.data, { headers: { "Content-Type": fileRec.mimeType || "application/octet-stream", "Content-Disposition": `attachment; filename="${fileRec.originalName}"` } });
      }
      return new NextResponse(data, { headers: { "Content-Type": fileRec.mimeType || "application/octet-stream", "Content-Disposition": `attachment; filename="${fileRec.originalName}"` } });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
    }

    let files: any[] = [];
    try {
      const { data, error } = await supabaseService
        .from("File")
        .select("id, originalName, fileName, filePath, fileSize, mimeType, category, createdAt, created_at, metadata, status")
        .eq("tenantId", tenantId)
        .order("createdAt", { ascending: false })
        .limit(50);
      if (!error && data && data.length > 0) {
        files = data.map((f:any)=> ({
          id: f.id,
          fileName: f.originalName || f.fileName,
          filePath: f.filePath,
          fileSize: f.fileSize,
          category: f.category,
          uploadedAt: f.createdAt || f.created_at,
          status: f.status,
          metadata: f.metadata ? JSON.parse(f.metadata) : null,
        }));
      } else {
        const alt = await supabaseService.from("File").select("id, original_name, file_name, file_path, file_size, category, created_at, metadata, status").eq("tenant_id", tenantId).order("created_at", {ascending:false}).limit(50) as any;
        if (!alt.error && alt.data) {
          files = alt.data.map((f:any)=> ({
            id: f.id,
            fileName: f.original_name || f.file_name,
            filePath: f.file_path,
            fileSize: f.file_size,
            uploadedAt: f.created_at,
            status: f.status,
            metadata: f.metadata ? JSON.parse(f.metadata) : null,
          }));
        }
      }
    } catch {}

    if (files.length === 0) {
      const { data: txs } = await supabaseService.from("Transaction").select("id, createdAt, created_at, description, totalAmount, voucherType").eq("tenantId", tenantId).order("createdAt", {ascending:false}).limit(50) as any;
      const grouped = new Map<string, any>();
      (txs||[]).forEach((t:any)=>{
        const d = t.createdAt || t.created_at;
        const key = d ? new Date(d).toISOString().slice(0,16) : "desconocido";
        if (!grouped.has(key)) grouped.set(key, { id: key, fileName: `Importación ${new Date(d).toLocaleDateString('es-HN')} ${new Date(d).toLocaleTimeString('es-HN')}`, filePath: null, uploadedAt: d, processed: 0, total: 0 });
        const g = grouped.get(key); g.processed +=1;
      });
      if (grouped.size>0) {
        files = Array.from(grouped.values()).map(g=> ({ ...g, fileName: g.fileName, uploadedAt: g.uploadedAt, status: "processed", category: "auto" }));
      }
    }

    return NextResponse.json({ files });
  } catch (error:any) {
    console.error("uploaded-files error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const tenantId = searchParams.get("tenantId");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Obtener File para saber qué transacciones borrar
    const { data: fileRec } = await supabaseService.from("File").select("filePath, metadata, createdAt, created_at").eq("id", id).maybeSingle() as any;
    
    // Si es un archivo agrupado auto (id es fecha como 2026-08-31T04:46), borrar por ventana de tiempo
    const isAutoGroup = !fileRec;
    let txIds: string[] = [];
    if (fileRec?.metadata) {
      try {
        const meta = typeof fileRec.metadata === "string" ? JSON.parse(fileRec.metadata) : fileRec.metadata;
        if (Array.isArray(meta.transactionIds)) txIds = meta.transactionIds;
      } catch {}
    }

    // Borrar de Storage si existe
    if (fileRec?.filePath) {
      try { await supabaseService.storage.from("ticket-attachments").remove([fileRec.filePath]); } catch {}
    }

    // Borrar transacciones asociadas
    if (txIds.length > 0) {
      // Borrar JournalEntries primero
      await supabaseService.from("JournalEntry").delete().in("transactionId", txIds) as any;
      // Fallback por si usa snake
      await supabaseService.from("JournalEntry").delete().in("transaction_id", txIds) as any;
      await supabaseService.from("Transaction").delete().in("id", txIds) as any;
    } else if (isAutoGroup && tenantId) {
      const { data: allTxs, error: allErr } = await supabaseService.from("Transaction").select("id, createdAt, created_at").eq("tenantId", tenantId) as any;
      const debugAllCount = allTxs?.length ?? 0;
      const debugError = allErr?.message || null;
      const ids = (allTxs||[]).filter((t:any)=>{
        const d = t.createdAt || t.created_at;
        if (!d) return false;
        const key = new Date(d).toISOString().slice(0,16);
        return key === id;
      }).map((t:any)=>t.id);
      if (ids.length>0) {
        await supabaseService.from("JournalEntry").delete().in("transactionId", ids) as any;
        await supabaseService.from("JournalEntry").delete().in("transaction_id", ids) as any;
        await supabaseService.from("Transaction").delete().in("id", ids) as any;
        txIds = ids;
      } else {
        // devolver debug para diagnosticar
        return NextResponse.json({ success: false, deletedTransactions: 0, debug: { id, tenantId, allTxsCount: debugAllCount, allErr: debugError, sampleKeys: (allTxs||[]).slice(0,3).map((t:any)=> ({d: t.createdAt||t.created_at, key: new Date(t.createdAt||t.created_at).toISOString().slice(0,16)})) } }, { status: 200 });
      }
    } else if (fileRec && tenantId) {
      // Fallback: borrar transacciones creadas en la misma hora que el archivo (si no hay metadata)
      const createdAt = fileRec.createdAt || fileRec.created_at;
      if (createdAt) {
        const d = new Date(createdAt);
        const start = new Date(d); start.setMinutes(d.getMinutes()-2);
        const end = new Date(d); end.setMinutes(d.getMinutes()+2);
        const { data: txs } = await supabaseService.from("Transaction").select("id").eq("tenantId", tenantId).gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString()) as any;
        const ids = (txs||[]).map((t:any)=>t.id);
        if (ids.length>0 && ids.length < 100) { // evitar borrado masivo accidental
          await supabaseService.from("JournalEntry").delete().in("transactionId", ids) as any;
          await supabaseService.from("Transaction").delete().in("id", ids) as any;
        }
      }
    }

    if (!isAutoGroup) {
      const { error } = await supabaseService.from("File").delete().eq("id", id) as any;
      if (error) {
        const alt = await supabaseService.from("File").delete().eq("id", id) as any;
        if (alt.error) throw alt.error;
      }
    }

    return NextResponse.json({ success: true, deletedTransactions: txIds.length });
  } catch (e:any) {
    console.error("uploaded-files DELETE error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, fileName } = body;
    if (!id || !fileName) return NextResponse.json({ error: "id y fileName requeridos" }, { status: 400 });
    const { data, error } = await supabaseService.from("File").update({ originalName: fileName, updatedAt: new Date().toISOString() } as any).eq("id", id).select("id").single() as any;
    if (error) throw error;
    return NextResponse.json({ success: true, id: (data as any).id });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

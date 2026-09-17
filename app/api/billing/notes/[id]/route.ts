import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getNote,
  updateNoteStatus,
  resolveTenantId,
  type NoteStatus,
} from "@/lib/services/notes-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenantId = await resolveTenantId({
      header: request.headers.get("x-tenant-id"),
      query: new URL(request.url).searchParams.get("tenantId"),
    });

    const note = await getNote(tenantId, id);
    if (!note) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error in note GET route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const tenantId = await resolveTenantId({
      header: request.headers.get("x-tenant-id"),
      query: new URL(request.url).searchParams.get("tenantId"),
    });

    const body = await request.json();
    const status = String(body.status || "").toUpperCase() as NoteStatus;

    const result = await updateNoteStatus(tenantId, id, status);
    if (!result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, note: result.data });
  } catch (error: any) {
    console.error("Error in note PATCH route:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
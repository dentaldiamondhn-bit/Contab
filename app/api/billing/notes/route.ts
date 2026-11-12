import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listNotes,
  createNote,
  resolveTenantId,
} from "@/lib/services/notes-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = await resolveTenantId({
      header: request.headers.get("x-tenant-id"),
      query: searchParams.get("tenantId"),
    });

    const notes = await listNotes(tenantId, {
      noteType: searchParams.get("type"),
      status: searchParams.get("status"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    return NextResponse.json({ tenantId, notes });
  } catch (error) {
    console.error("Error in notes GET route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tenantId = await resolveTenantId({
      header: request.headers.get("x-tenant-id"),
      query: new URL(request.url).searchParams.get("tenantId"),
      body: body.tenantId,
    });

    const result = await createNote(tenantId, {
      noteType: body.noteType,
      date: body.date,
      originalInvoiceId: body.originalInvoiceId || null,
      invoiceNumber: body.invoiceNumber || null,
      customerName: body.customerName || null,
      reason: body.reason,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      createdBy: userId,
    });

    if (!result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, note: result.data });
  } catch (error: any) {
    console.error("Error in notes POST route:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
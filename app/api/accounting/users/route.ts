import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-db";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
      new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("User")
      .select("id, email, firstname, lastname, role, isactive")
      .eq("tenantid", tenantId)
      .eq("isactive", true)
      .order("firstname");

    if (error) throw error;

    const users = (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstname,
      lastName: u.lastname,
      role: u.role,
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error loading users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

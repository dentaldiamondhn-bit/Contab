import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-db";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";

export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);

    const { data, error } = await supabase
      .from("User")
      .select("id, email, firstname, lastname, role, isactive")
      .eq("tenantid", empresa.tenantId)
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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error loading users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

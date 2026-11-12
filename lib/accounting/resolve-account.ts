import { supabase as supabaseService } from "@/lib/supabase-db";

/**
 * Resuelve el UUID de una cuenta contable por prefijo de código dentro de un tenant.
 * Los catálogos varían por tenant (p.ej. "1101", "1101.01", "1101-01"), por eso se
 * busca por prefijo y se devuelve la primera coincidencia en orden de código.
 */
export async function resolveAccountId(
  tenantId: string,
  prefixes: string[]
): Promise<string | null> {
  for (const prefix of prefixes) {
    const { data } = await (supabaseService as any)
      .from("Account")
      .select("id,code")
      .eq("tenantId", tenantId)
      .ilike("code", `${prefix}%`)
      .order("code", { ascending: true })
      .limit(1);
    if (data && data.length > 0) return data[0].id as string;
  }
  return null;
}

export const ACCOUNT_PREFIXES = {
  cash: ["1101"],
  receivable: ["1103"],
  sales: ["4101", "4102", "4120"],
  isv: ["2105", "2106", "2110"],
};

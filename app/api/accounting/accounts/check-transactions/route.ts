import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Account id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check JournalEntry table for this account
    const { count, error } = await supabase
      .from("JournalEntry")
      .select("*", { count: "exact", head: true })
      .or(`account_id.eq.${id},accountId.eq.${id}`);

    if (error) {
      return NextResponse.json({ hasTransactions: false });
    }

    return NextResponse.json({ hasTransactions: (count ?? 0) > 0 });
  } catch (error) {
    return NextResponse.json({ hasTransactions: false });
  }
}

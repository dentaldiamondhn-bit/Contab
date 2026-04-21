import { NextRequest, NextResponse } from "next/server";
import { getGeneralLedger } from "@/lib/actions/accounting";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    
    const generalLedger = await getGeneralLedger(accountId, startDate, endDate);
    
    return NextResponse.json(generalLedger);
  } catch (error) {
    console.error("Error fetching general ledger:", error);
    return NextResponse.json(
      { error: "Error fetching general ledger" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getNextVoucherNumber } from "@/lib/actions/accounting";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voucherType = searchParams.get("voucherType");
    const tenantId = searchParams.get("tenantId") || "1";
    
    if (!voucherType) {
      return NextResponse.json(
        { error: "voucherType is required" },
        { status: 400 }
      );
    }
    
    const nextNumber = await getNextVoucherNumber(voucherType, tenantId);
    
    return NextResponse.json({ nextNumber });
  } catch (error) {
    console.error("Error getting next voucher number:", error);
    return NextResponse.json(
      { error: "Error getting next voucher number" },
      { status: 500 }
    );
  }
}

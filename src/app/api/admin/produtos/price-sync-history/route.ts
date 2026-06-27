import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { listPriceSyncHistory } from "@/lib/db/price-sync-history";

export async function GET(request: NextRequest) {
  return withAdminAuth(async () => {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const productId = searchParams.get("productId") || undefined;

    const data = await listPriceSyncHistory({
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
      productId,
    });

    return NextResponse.json(data);
  });
}

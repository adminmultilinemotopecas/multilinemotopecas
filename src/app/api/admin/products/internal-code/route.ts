import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { peekNextProductInternalCode } from "@/lib/db/admin-codes";

export async function GET() {
  return withAdminAuth(async (userId) => {
    const code = await peekNextProductInternalCode(userId);
    return NextResponse.json({ code });
  });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function withAdminAuth(
  handler: (userId: string) => Promise<NextResponse>
) {
  const { user, error } = await requireAdmin();

  if (error || !user) {
    const status = error === "Não autenticado" ? 401 : 403;
    return NextResponse.json({ error }, { status });
  }

  return handler(user.id);
}
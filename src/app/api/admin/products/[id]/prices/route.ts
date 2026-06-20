import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { updateProductPrices } from "@/lib/db/products-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    try {
      const body = (await request.json()) as {
        price?: unknown;
        promotional_price?: unknown | null;
      };

      const product = await updateProductPrices(id, {
        price: body.price,
        promotional_price: body.promotional_price,
      });

      return NextResponse.json({ product });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao atualizar preços";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}

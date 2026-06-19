import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { syncMercadoLivrePrice } from "@/lib/ml-price-sync/html/sync-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapResult(result: Awaited<ReturnType<typeof syncMercadoLivrePrice>>) {
  return {
    success: result.status === "success",
    updated: result.updated,
    message: result.message,
    status: result.status,
    oldPrice: result.oldPrice,
    newPrice: result.newPrice,
    oldPromotionalPrice: result.oldPromotionalPrice,
    newPromotionalPrice: result.newPromotionalPrice,
    lastSyncedPrice: result.lastSyncedPrice,
    sourceUrl: result.sourceUrl,
    checkedAt: result.checkedAt,
    extractionSource: result.extractionSource,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    try {
      const result = await syncMercadoLivrePrice(id, "manual");
      return NextResponse.json(mapResult(result));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao sincronizar preço";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}

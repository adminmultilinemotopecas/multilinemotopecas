import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import {
  EXTENSION_CORS_HEADERS,
  extensionOptionsResponse,
} from "@/lib/admin/extension-cors";
import { syncProductPrice } from "@/lib/ml-price-sync/price-sync-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return extensionOptionsResponse();
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async (userId) => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        forceUpdate?: boolean;
        manualPrice?: number;
        manualPromotionalPrice?: number | null;
        afterBrowserValidation?: boolean;
        browserScraped?: boolean;
      };

      const result = await syncProductPrice({
        productId: id,
        adminUserId: userId,
        triggerSource: "manual",
        forceUpdate: body.forceUpdate === true,
        manualPrice: body.manualPrice,
        manualPromotionalPrice: body.manualPromotionalPrice,
        afterBrowserValidation: body.afterBrowserValidation === true,
        browserScraped: body.browserScraped === true,
      });

      return NextResponse.json(
        {
          success: result.scrape.status === "success",
          updated: result.updated,
          message: result.message,
          oldPrice: result.oldPrice,
          newPrice: result.newPrice,
          oldPromotionalPrice: result.oldPromotionalPrice,
          newPromotionalPrice: result.newPromotionalPrice,
          status: result.scrape.status,
          confidenceScore: result.scrape.confidenceScore,
          sourceUrl: result.scrape.sourceUrl,
          checkedAt: result.scrape.checkedAt,
          evidence: result.scrape.evidence,
          requiresBrowserValidation: result.scrape.status === "blocked",
        },
        { headers: EXTENSION_CORS_HEADERS }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao sincronizar preço";
      return NextResponse.json(
        { error: message },
        { status: 400, headers: EXTENSION_CORS_HEADERS }
      );
    }
  });
}

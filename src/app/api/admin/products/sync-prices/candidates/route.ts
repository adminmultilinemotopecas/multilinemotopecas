import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { EXTENSION_CORS_HEADERS } from "@/lib/admin/extension-cors";
import {
  listSyncCandidates,
} from "@/lib/ml-price-sync/price-sync-service";
import { resolveProductSyncUrl } from "@/lib/ml-price-sync/url-validator";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: EXTENSION_CORS_HEADERS });
}

export async function GET() {
  return withAdminAuth(async () => {
    const candidates = await listSyncCandidates();

    return NextResponse.json(
      {
        products: candidates.map((product) => ({
          id: product.id,
          name: product.name,
          sourceUrl: resolveProductSyncUrl(product),
          mercadoLivreId: product.mercado_livre_id,
        })),
      },
      { headers: EXTENSION_CORS_HEADERS }
    );
  });
}

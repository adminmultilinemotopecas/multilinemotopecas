import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { applyVerificationToProductDb } from "@/lib/apply-ml-verification";
import { verifyMercadoLivreListingViaAffiliate } from "@/lib/ml-price-sync/html/verify-listing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();

    if (authError) {
      const status = authError === "Não autenticado" ? 401 : 403;
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const productId = body.productId as string | undefined;

    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório" },
        { status: 400 }
      );
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        mercado_livre_url: true,
        ml_source_url: true,
        mercado_livre_id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    const result = await verifyMercadoLivreListingViaAffiliate({
      mercado_livre_url: product.mercado_livre_url,
      ml_source_url: product.ml_source_url,
      productName: product.name,
      mercado_livre_id: product.mercado_livre_id,
    });

    let productDeactivated = false;
    let productReactivated = false;

    try {
      const applied = await applyVerificationToProductDb(product.id, result);
      productDeactivated = applied.productDeactivated;
      productReactivated = applied.productReactivated;
    } catch {
      return NextResponse.json(
        { error: "Verificação concluída, mas falha ao atualizar o produto" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      productDeactivated,
      productReactivated,
      ...result,
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao verificar link do Mercado Livre" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { verifyMercadoLivreListing } from "@/lib/mercado-livre-verify";
import { applyVerificationToProductDb } from "@/lib/apply-ml-verification";
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
        mercado_livre_id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    const result = await verifyMercadoLivreListing(
      product.mercado_livre_url,
      product.name,
      product.mercado_livre_id
    );

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

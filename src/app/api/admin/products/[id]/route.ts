import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { mapProduct } from "@/lib/db/mappers";
import { deleteProduct, getAdminProductById, saveProduct } from "@/lib/db/products-admin";
import type { SaveProductInput } from "@/lib/db/products-admin";
import { MlValidationError } from "@/lib/ml-url-validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    const record = await getAdminProductById(id);
    if (!record) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      product: mapProduct(record),
      compatibilities: record.product_motorcycle_compatibility.map((item) => ({
        modelId: item.motorcycle_model_id,
        year: item.year ?? new Date().getFullYear(),
        yearEnd: item.year_end ?? item.year ?? new Date().getFullYear(),
      })),
    });
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async (userId) => {
    try {
      const body = (await request.json()) as SaveProductInput;
      const result = await saveProduct(body, id, userId);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof MlValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            sourceUrl: error.sourceUrl,
          },
          { status: 409 }
        );
      }
      const message = error instanceof Error ? error.message : "Erro ao salvar produto";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(async () => {
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  });
}

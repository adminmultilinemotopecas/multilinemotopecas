import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import { mapProduct } from "@/lib/db/mappers";
import { listAdminProducts, saveProduct } from "@/lib/db/products-admin";
import type { SaveProductInput } from "@/lib/db/products-admin";
import { MlValidationError } from "@/lib/ml-url-validation";

function handleSaveError(error: unknown) {
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

export async function GET() {
  return withAdminAuth(async () => {
    const records = await listAdminProducts();
    return NextResponse.json(records.map(mapProduct));
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (userId) => {
    try {
      const body = (await request.json()) as SaveProductInput;
      const result = await saveProduct(body, undefined, userId);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleSaveError(error);
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { importProductFromExtension } from "@/lib/extension-import";
import type { ExtensionImportInput } from "@/lib/extension-import";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExtensionImportInput;
    const result = await importProductFromExtension(body);

    return NextResponse.json(result, {
      status: 201,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao importar produto";

    return NextResponse.json(
      { error: message },
      {
        status: message.includes("já foi importado") ? 409 : 400,
        headers: CORS_HEADERS,
      }
    );
  }
}

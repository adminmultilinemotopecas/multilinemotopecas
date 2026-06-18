import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries/products";
import { insertSearchLog } from "@/lib/db/analytics";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const results = await searchProducts(query, limit, offset);

  await insertSearchLog({
    query: query.trim().toLowerCase(),
    resultsCount: results.length,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json(
    { results, total: results.length, query },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

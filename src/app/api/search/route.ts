import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries/products";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const results = await searchProducts(query, limit, offset);

  const supabase = await createClient();
  await supabase.from("search_logs").insert({
    query: query.trim().toLowerCase(),
    results_count: results.length,
    user_agent: request.headers.get("user-agent"),
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

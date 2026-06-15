import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const eventTypeMap: Record<string, string> = {
      purchase_click: "purchase_click",
      product_view: "product_view",
      search: "search",
      share: "share",
      whatsapp_click: "whatsapp_click",
    };

    const eventType = eventTypeMap[body.type];
    if (!eventType) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    await supabase.from("analytics_events").insert({
      event_type: eventType,
      product_id: body.productId || null,
      metadata: body,
    });

    if (body.type === "purchase_click" && body.productId) {
      const { data: product } = await supabase
        .from("products")
        .select("purchase_click_count")
        .eq("id", body.productId)
        .single();

      if (product) {
        await supabase
          .from("products")
          .update({ purchase_click_count: (product.purchase_click_count || 0) + 1 })
          .eq("id", body.productId);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}

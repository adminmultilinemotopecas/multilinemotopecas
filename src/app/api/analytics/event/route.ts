import { NextRequest, NextResponse } from "next/server";
import {
  incrementPurchaseClickCount,
  insertAnalyticsEvent,
} from "@/lib/db/analytics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventTypeMap = {
      purchase_click: "purchase_click",
      product_view: "product_view",
      search: "search",
      share: "share",
      whatsapp_click: "whatsapp_click",
    } as const;

    const eventType = eventTypeMap[body.type as keyof typeof eventTypeMap];
    if (!eventType) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    await insertAnalyticsEvent({
      eventType,
      productId: body.productId || null,
      metadata: body,
    });

    if (body.type === "purchase_click" && body.productId) {
      try {
        await incrementPurchaseClickCount(body.productId);
      } catch {
        // Produto pode ter sido removido; evento já foi registrado.
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}

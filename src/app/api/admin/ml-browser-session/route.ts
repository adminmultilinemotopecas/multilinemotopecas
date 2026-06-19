import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin/api-auth";
import {
  getMlBrowserSession,
  setMlBrowserSession,
} from "@/lib/ml-price-sync/ml-browser-session";

export async function GET() {
  return withAdminAuth(async (userId) => {
    const session = getMlBrowserSession(userId);
    return NextResponse.json({
      active: Boolean(session),
      capturedAt: session?.capturedAt
        ? new Date(session.capturedAt).toISOString()
        : null,
      sourceUrl: session?.sourceUrl ?? null,
      hasCookies: Boolean(session?.cookieHeader),
      hasScrapedPrice: session?.scrapedPrice != null,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (userId) => {
    const body = (await request.json()) as {
      cookieHeader?: string;
      sourceUrl?: string;
      userAgent?: string;
      scrapedPrice?: number | null;
      scrapedPromotionalPrice?: number | null;
      pageTitle?: string | null;
    };

    const cookieHeader = body.cookieHeader?.trim();
    if (!cookieHeader) {
      return NextResponse.json(
        { error: "cookieHeader é obrigatório." },
        { status: 400 }
      );
    }

    if (cookieHeader.length > 16_000) {
      return NextResponse.json({ error: "Cookies inválidos." }, { status: 400 });
    }

    setMlBrowserSession(userId, {
      cookieHeader,
      userAgent: body.userAgent?.trim() || null,
      sourceUrl: body.sourceUrl?.trim() || null,
      scrapedPrice:
        body.scrapedPrice != null && Number.isFinite(body.scrapedPrice)
          ? body.scrapedPrice
          : null,
      scrapedPromotionalPrice:
        body.scrapedPromotionalPrice != null &&
        Number.isFinite(body.scrapedPromotionalPrice)
          ? body.scrapedPromotionalPrice
          : null,
      pageTitle: body.pageTitle?.trim() || null,
    });

    return NextResponse.json({
      success: true,
      message: "Sessão do Mercado Livre capturada.",
      hasScrapedPrice: body.scrapedPrice != null,
    });
  });
}

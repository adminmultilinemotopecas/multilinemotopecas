import { prisma } from "@/lib/prisma";
import type { analytics_event_type, Prisma } from "@prisma/client";

export async function insertSearchLog(input: {
  query: string;
  resultsCount: number;
  userAgent?: string | null;
}) {
  await prisma.search_logs.create({
    data: {
      query: input.query,
      results_count: input.resultsCount,
      user_agent: input.userAgent ?? null,
    },
  });
}

export async function insertAnalyticsEvent(input: {
  eventType: analytics_event_type;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.analytics_events.create({
    data: {
      event_type: input.eventType,
      product_id: input.productId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function incrementPurchaseClickCount(productId: string) {
  await prisma.products.update({
    where: { id: productId },
    data: { purchase_click_count: { increment: 1 } },
  });
}

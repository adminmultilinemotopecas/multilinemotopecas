import { prisma } from "@/lib/prisma";

export async function listPriceSyncHistory(options: {
  limit?: number;
  productId?: string;
  offset?: number;
}) {
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where = options.productId ? { product_id: options.productId } : {};

  const [logs, total] = await Promise.all([
    prisma.price_sync_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
      include: {
        products: {
          select: { id: true, name: true, sku: true },
        },
      },
    }),
    prisma.price_sync_logs.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      productId: log.product_id,
      productName: log.products.name,
      productSku: log.products.sku,
      oldPrice: log.old_price != null ? Number(log.old_price) : null,
      newPrice: log.new_price != null ? Number(log.new_price) : null,
      oldPromotionalPrice:
        log.old_promotional_price != null ? Number(log.old_promotional_price) : null,
      newPromotionalPrice:
        log.new_promotional_price != null ? Number(log.new_promotional_price) : null,
      status: log.status,
      error: log.error,
      triggerSource: log.trigger_source,
      createdAt: log.created_at.toISOString(),
    })),
    total,
  };
}

export async function logManualPriceChange(input: {
  productId: string;
  oldPrice: number;
  newPrice: number;
  oldPromotionalPrice: number | null;
  newPromotionalPrice: number | null;
  triggerSource?: string;
}) {
  const priceChanged = input.oldPrice !== input.newPrice;
  const promoChanged = input.oldPromotionalPrice !== input.newPromotionalPrice;
  if (!priceChanged && !promoChanged) return;

  await prisma.price_sync_logs.create({
    data: {
      product_id: input.productId,
      old_price: input.oldPrice,
      new_price: input.newPrice,
      old_promotional_price: input.oldPromotionalPrice,
      new_promotional_price: input.newPromotionalPrice,
      status: "success",
      trigger_source: input.triggerSource ?? "manual_admin",
    },
  });
}

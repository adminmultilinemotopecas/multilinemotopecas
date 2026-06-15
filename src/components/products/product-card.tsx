import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
import { Badge } from "@/components/ui/badge";
import { MercadoLivreButton } from "@/components/products/mercado-livre-button";
import { cn, formatPrice, getDisplayPrice, calculateDiscount } from "@/lib/utils";
import type { Product, SearchResult } from "@/types/database";

type ProductCardData = Product | SearchResult;

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
  priority?: boolean;
}

function isProduct(p: ProductCardData): p is Product {
  return "status" in p;
}

export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const imageUrl = isProduct(product)
    ? product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url
    : product.primary_image_url;

  const brandName = isProduct(product) ? product.brand?.name : product.brand_name;
  const { current, original, hasDiscount } = getDisplayPrice(
    product.price,
    product.promotional_price
  );

  const badges = isProduct(product)
    ? [
        product.is_promotion && { label: "Promoção", variant: "promo" as const },
        product.is_new && { label: "Novo", variant: "success" as const },
        product.is_launch && { label: "Lançamento", variant: "warning" as const },
        product.is_bestseller && { label: "Mais Vendido", variant: "secondary" as const },
      ].filter(Boolean)
    : [];

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
        className
      )}
    >
      <Link href={`/produtos/${product.slug}`} className="flex flex-col flex-1">
        <div className="relative aspect-square overflow-hidden bg-white border-b border-border/30">
          {imageUrl ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <RemoteImage
                src={imageUrl}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.03]"
                priority={priority}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Sem imagem
            </div>
          )}
          {badges.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {badges.map(
                (badge) =>
                  badge && (
                    <Badge key={badge.label} variant={badge.variant} className="text-[10px] uppercase">
                      {badge.label}
                    </Badge>
                  )
              )}
            </div>
          )}
          {hasDiscount && original && (
            <Badge variant="promo" className="absolute top-2 right-2">
              -{calculateDiscount(original, current)}%
            </Badge>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4 gap-1">
          {brandName && (
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
              {brandName}
            </span>
          )}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto pt-3">
            {hasDiscount && original && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(original)}
              </span>
            )}
            <p className="text-xl font-extrabold text-primary">
              {formatPrice(current)}
            </p>
          </div>
        </div>
      </Link>

      {product.mercado_livre_url && (
        <div className="px-3 pb-3 pt-0 sm:p-4 sm:pt-0">
          <MercadoLivreButton
            url={product.mercado_livre_url}
            productId={product.id}
            productName={product.name}
            price={current}
            size="sm"
            className="w-full"
          />
        </div>
      )}
    </article>
  );
}

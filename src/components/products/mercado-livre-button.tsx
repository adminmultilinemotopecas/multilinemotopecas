"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackMLPurchase } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface MercadoLivreButtonProps {
  url: string;
  productId: string;
  productName: string;
  price: number;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
  showIcon?: boolean;
}

export function MercadoLivreButton({
  url,
  productId,
  productName,
  price,
  size = "default",
  className,
  showIcon = true,
}: MercadoLivreButtonProps) {
  function handleClick() {
    trackMLPurchase(productId, productName, price, url);
  }

  const isCompact = size === "sm";

  return (
    <Button
      variant="ml"
      size={size}
      className={cn(
        "gap-1.5",
        isCompact && "text-[10px] sm:text-xs tracking-normal sm:tracking-wide px-2 sm:px-3",
        className
      )}
      asChild
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Comprar ${productName} no Mercado Livre`}
      >
        {showIcon && (
          <ExternalLink
            className={cn(
              "shrink-0",
              isCompact ? "hidden h-3.5 w-3.5 sm:block sm:h-4 sm:w-4" : "h-4 w-4"
            )}
          />
        )}
        {isCompact ? (
          <span className="leading-tight text-center">
            <span className="sm:hidden">Comprar</span>
            <span className="hidden sm:inline md:hidden">Comprar ML</span>
            <span className="hidden md:inline">Comprar no Mercado Livre</span>
          </span>
        ) : (
          "Comprar no Mercado Livre"
        )}
      </a>
    </Button>
  );
}

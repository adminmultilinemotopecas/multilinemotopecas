"use client";

import { useState } from "react";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/database";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (sortedImages.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        Sem imagem disponível
      </div>
    );
  }

  const currentImage = sortedImages[selectedIndex];

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative aspect-square rounded-xl overflow-hidden bg-muted cursor-zoom-in",
          isZoomed && "cursor-zoom-out"
        )}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <RemoteImage
          src={currentImage.url}
          alt={currentImage.alt_text || productName}
          fill
          className={cn(
            "object-contain transition-transform duration-300",
            isZoomed && "scale-150"
          )}
          priority
        />
      </div>

      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => {
                setSelectedIndex(index);
                setIsZoomed(false);
              }}
              className={cn(
                "relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                index === selectedIndex
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              aria-label={`Imagem ${index + 1}`}
            >
              <RemoteImage
                src={image.url}
                alt={image.alt_text || `${productName} - ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

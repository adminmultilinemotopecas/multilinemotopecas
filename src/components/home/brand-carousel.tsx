"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Brand } from "@/types/database";

interface BrandCarouselProps {
  brands: Brand[];
}

export function BrandCarousel({ brands }: BrandCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateScrollState();
    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);
    return () => {
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi, updateScrollState]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (brands.length === 0) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Marcas anteriores"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex",
          "h-10 w-10 rounded-full border-border/80 bg-card/95 shadow-lg backdrop-blur-sm",
          "hover:border-primary/40 hover:bg-card disabled:opacity-30"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div
        ref={emblaRef}
        className="overflow-hidden md:mx-12 touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="min-w-0 shrink-0 grow-0 basis-[140px] sm:basis-[160px]"
            >
              <Link
                href={`/marcas/${brand.slug}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card px-6 py-5 sm:px-8 hover:border-primary/40 transition-all h-full select-none"
                draggable={false}
              >
                <div className="relative h-12 w-24 pointer-events-none">
                  {brand.logo_url ? (
                    <RemoteImage
                      src={brand.logo_url}
                      alt={brand.name}
                      fill
                      className="object-contain opacity-90"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-extrabold text-primary uppercase tracking-wide text-center text-xs">
                      {brand.name}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center line-clamp-2 pointer-events-none">
                  {brand.name}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Próximas marcas"
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex",
          "h-10 w-10 rounded-full border-border/80 bg-card/95 shadow-lg backdrop-blur-sm",
          "hover:border-primary/40 hover:bg-card disabled:opacity-30"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

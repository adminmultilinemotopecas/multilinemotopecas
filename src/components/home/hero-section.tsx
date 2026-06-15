import { Badge } from "@/components/ui/badge";
import { SmartSearchCard } from "@/components/home/smart-search-card";
import type { MotorcycleModel } from "@/types/database";

interface HeroSectionProps {
  motorcycleModels: MotorcycleModel[];
}

export function HeroSection({ motorcycleModels }: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden border-b border-border/40 bg-cover bg-no-repeat bg-[center_right] min-h-[520px] md:min-h-[560px]"
      style={{ backgroundImage: "url('/hero-motorcycle.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-background from-30% via-background/85 via-55% to-background/25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40 pointer-events-none" />

      <div className="container relative mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="max-w-xl">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/20 uppercase tracking-widest text-[10px] font-bold px-3 py-1">
              Catálogo 2026
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold uppercase tracking-tight leading-[1.1] text-balance">
              Peças de{" "}
              <span className="text-primary">Alta Performance</span>
              <br />
              para sua moto.
            </h1>

            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
              Encontre a peça exata para o seu modelo com nossa busca inteligente.
              Qualidade garantida e entrega rápida.
            </p>
          </div>

          <div className="w-full max-w-md lg:max-w-none lg:ml-auto">
            <SmartSearchCard motorcycleModels={motorcycleModels} />
          </div>
        </div>
      </div>
    </section>
  );
}

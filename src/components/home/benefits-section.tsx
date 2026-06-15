import { Search, Package, ShoppingCart, MessageCircle } from "lucide-react";
import { BENEFITS } from "@/lib/constants";

const ICON_MAP = {
  Search,
  Package,
  ShoppingCart,
  MessageCircle,
};

export function BenefitsSection() {
  return (
    <section className="py-14 my-4 rounded-2xl border border-border/60 bg-card/50">
      <div className="text-center mb-10 px-4">
        <h2 className="section-title">
          Por que comprar <span className="section-title-accent">conosco?</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          A melhor experiência para encontrar peças da sua moto
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {BENEFITS.map((benefit) => {
          const Icon = ICON_MAP[benefit.icon as keyof typeof ICON_MAP];
          return (
            <div key={benefit.title} className="text-center p-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-4 ring-1 ring-primary/20">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold uppercase tracking-wide text-sm mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

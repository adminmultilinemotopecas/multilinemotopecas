import Link from "next/link";
import { Shield, Truck, RefreshCw, Award } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layout/logo";
import { SITE_CONFIG } from "@/lib/constants";

const FOOTER_LINKS = {
  catalogo: [
    { href: "/produtos", label: "Todos os Produtos" },
    { href: "/categorias", label: "Categorias" },
    { href: "/marcas", label: "Marcas" },
    { href: "/busca", label: "Busca Avançada" },
  ],
  empresa: [
    { href: "/sobre", label: "Sobre Nós" },
    { href: "/contato", label: "Contato" },
    { href: "/politica-privacidade", label: "Política de Privacidade" },
    { href: "/termos", label: "Termos de Uso" },
  ],
};

const TRUST_ICONS = [Shield, Truck, RefreshCw, Award];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo size="lg" className="mb-5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              A maior vitrine de motopeças do Brasil. Encontre a peça certa para sua moto e compre com segurança no Mercado Livre.
            </p>
          </div>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-5 text-primary">Catálogo</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.catalogo.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-5 text-primary">Empresa</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.empresa.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-5 text-primary">Garantias</h3>
            <ul className="space-y-3">
              {["Compra Segura via ML", "Entrega para todo Brasil", "Troca em 7 dias", "Peças de Qualidade"].map(
                (text, i) => {
                  const Icon = TRUST_ICONS[i];
                  return (
                    <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      {text}
                    </li>
                  );
                }
              )}
            </ul>
          </div>
        </div>

        <Separator className="my-10 bg-border/60" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.name}. Todos os direitos reservados.</p>
          <p>Compre com segurança no Mercado Livre</p>
        </div>
      </div>
    </footer>
  );
}

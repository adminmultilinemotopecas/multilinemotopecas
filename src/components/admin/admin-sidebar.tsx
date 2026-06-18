"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  FolderTree,
  Bike,
  LogOut,
  BarChart3,
  Store,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/catalogo", label: "Catálogo do Site", icon: Store },
  { href: "/admin/marcas", label: "Marcas", icon: Tag },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/modelos", label: "Modelos de Motos", icon: Bike },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 hidden md:flex flex-col">
      <div className="p-4 border-b">
        <Link href="/admin" className="font-bold text-lg">
          Admin
        </Link>
        <p className="text-xs text-muted-foreground">{SITE_CONFIG.name}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Ver site
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}

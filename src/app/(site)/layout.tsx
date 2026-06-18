import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { ConditionalAnalytics } from "@/components/analytics/conditional-analytics";
import { getBrands, getCategories } from "@/lib/queries/catalog";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header brands={brands} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
      <CookieBanner />
      <ConditionalAnalytics />
    </div>
  );
}

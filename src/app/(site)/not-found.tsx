import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Página não encontrada</h2>
      <p className="text-muted-foreground mb-8">
        A peça ou página que você procura não existe. Tente buscar no catálogo.
      </p>
      <div className="max-w-md mx-auto mb-8">
        <SearchBar />
      </div>
      <Button asChild>
        <Link href="/">Voltar para a Home</Link>
      </Button>
    </div>
  );
}

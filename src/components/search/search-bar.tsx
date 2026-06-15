"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import type { SearchResult } from "@/types/database";

interface SearchBarProps {
  variant?: "default" | "hero" | "compact" | "header";
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  variant = "default",
  placeholder = "Busque por peça, modelo, marca, SKU ou código...",
  className,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < SEARCH_MIN_CHARS) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      const data = await res.json();
      setResults(data.results || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= SEARCH_MIN_CHARS) {
      trackEvent({ type: "search", query: query.trim(), resultsCount: results.length });
      setIsOpen(false);
      router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const inputClasses = cn(
    "w-full pr-12 bg-secondary border-border/60",
    variant === "hero" && "h-14 text-lg rounded-xl border-2 border-primary/30 focus-visible:border-primary shadow-lg",
    variant === "header" && "h-10 rounded-full text-sm",
    variant === "compact" && "h-9 text-sm rounded-full",
    variant === "default" && "h-11 rounded-xl"
  );

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            variant === "hero" ? "h-5 w-5" : "h-4 w-4"
          )}
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= SEARCH_MIN_CHARS && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(inputClasses, "pl-10")}
          autoFocus={autoFocus}
          aria-label="Buscar produtos"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </form>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
          <ul role="listbox" className="max-h-[400px] overflow-y-auto">
            {results.map((result) => (
              <li key={result.id} role="option">
                <Link
                  href={`/produtos/${result.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                >
                  <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                    {result.primary_image_url ? (
                      <RemoteImage
                        src={result.primary_image_url}
                        alt={result.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.brand_name && `${result.brand_name} · `}
                      SKU: {result.sku}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">
                    {formatPrice(result.promotional_price || result.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t p-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false);
                router.push(`/busca?q=${encodeURIComponent(query)}`);
              }}
            >
              Ver todos os resultados para &quot;{query}&quot;
            </Button>
          </div>
        </div>
      )}

      {isOpen && query.length >= SEARCH_MIN_CHARS && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card p-6 text-center shadow-2xl">
          <p className="text-muted-foreground">
            Nenhum resultado para &quot;{query}&quot;
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente buscar por modelo da moto, marca ou código da peça
          </p>
        </div>
      )}
    </div>
  );
}

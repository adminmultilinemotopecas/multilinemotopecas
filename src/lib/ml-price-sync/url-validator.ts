import { isMercadoLivreUrl } from "@/lib/mercado-livre-verify";

const PRODUCT_PAGE_HOST_PATTERN =
  /^(?:www\.)?(?:produto\.)?mercadolivre\.com\.br$|^(?:www\.)?mercadolibre\.com(?:\.ar|\.mx)?$/i;

const BLOCKED_HOST_PATTERN =
  /^(localhost|127(?:\.\d+){3}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})$/i;

const AFFILIATE_PATH_PATTERN = /\/sec\/|\/social\/|\/perfil\//i;

export function isMercadoLivreAffiliateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!isMercadoLivreUrl(url)) return false;
    const target = `${parsed.hostname}${parsed.pathname}${parsed.href}`;
    return (
      AFFILIATE_PATH_PATTERN.test(target) ||
      /meli\.la|me2\.do|merca\.do/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function isMercadoLivreProductPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (BLOCKED_HOST_PATTERN.test(parsed.hostname)) return false;
    if (!PRODUCT_PAGE_HOST_PATTERN.test(parsed.hostname)) return false;

    const path = parsed.pathname.toLowerCase();
    if (/\/MLB-?\d+/i.test(path)) return true;
    if (/\/p\/MLB/i.test(path)) return true;
    if (path.includes("/up/") && /MLB/i.test(path)) return true;

    return false;
  } catch {
    return false;
  }
}

export function resolveProductSyncUrl(input: {
  ml_source_url?: string | null;
  mercado_livre_url?: string | null;
}): string | null {
  const candidates = [input.mercado_livre_url, input.ml_source_url].filter(Boolean) as string[];

  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (isMercadoLivreAffiliateUrl(trimmed)) {
      return normalizeSyncUrl(trimmed);
    }
  }

  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (isMercadoLivreUrl(trimmed) && !isMercadoLivreProductPageUrl(trimmed)) {
      return normalizeSyncUrl(trimmed);
    }
  }

  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (isMercadoLivreProductPageUrl(trimmed)) {
      return normalizeSyncUrl(trimmed);
    }
  }

  return null;
}

export function normalizeSyncUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

export function assertSafeMercadoLivreUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL inválida para sincronização.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Apenas URLs HTTP(S) são permitidas.");
  }

  if (BLOCKED_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error("URL bloqueada por segurança.");
  }

  if (!isMercadoLivreUrl(url)) {
    throw new Error("Somente URLs do Mercado Livre são permitidas.");
  }
}

export function isRedirectAwayFromProductPage(
  originalUrl: string,
  finalUrl: string,
  html: string
): boolean {
  if (isMercadoLivreAffiliateUrl(originalUrl)) {
    return false;
  }

  if (!isMercadoLivreProductPageUrl(finalUrl) && isMercadoLivreUrl(finalUrl)) {
    return true;
  }

  if (/parece\s+que\s+esta\s+p[aá]gina\s+n[aã]o\s+existe/i.test(html)) {
    return true;
  }

  try {
    const original = new URL(originalUrl);
    const final = new URL(finalUrl);
    if (original.hostname !== final.hostname && !isMercadoLivreProductPageUrl(finalUrl)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

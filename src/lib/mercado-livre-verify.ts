export type MlVerificationStatus =
  | "active"
  | "inactive"
  | "not_found"
  | "no_url"
  | "invalid_url"
  | "blocked"
  | "error"
  | "unknown";

export interface MlVerificationResult {
  status: MlVerificationStatus;
  message: string;
  itemId?: string;
  pageTitle?: string;
  nameMatch?: boolean;
  matchScore?: number;
  checkedAt: string;
}

const ML_LINK_HOST_PATTERN =
  /(?:^|\.)mercadolivre\.com(?:\.br)?$|(?:^|\.)mercadolibre\.com$|^meli\.la$|^me2\.do$|^merca\.do$/i;

const BLOCKED_HTML_PATTERNS = [
  /captcha/i,
  /account-verification/i,
  /robot/i,
  /access denied/i,
  /cf-browser-verification/i,
  /validate\s+your\s+identity/i,
  /verifique\s+que\s+voc[eê]\s+n[aã]o\s+[eé]\s+um\s+rob[oô]/i,
];

const INACTIVE_HTML_PATTERNS = [
  /publica[cç][aã]o\s+pausada/i,
  /publica[cç][aã]o\s+finalizada/i,
  /an[uú]ncio\s+pausado/i,
  /an[uú]ncio\s+finalizado/i,
  /produto\s+n[aã]o\s+est[aá]\s+dispon[ií]vel/i,
  /parece\s+que\s+esta\s+p[aá]gina\s+n[aã]o\s+existe/i,
  /algo\s+(?:deu\s+errado|sal[ií]o\s+mal)/i,
  /p[aá]gina\s+n[aã]o\s+encontrada/i,
  /"item_status"\s*:\s*"(?:paused|closed)"/i,
];

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

export function extractMercadoLivreId(
  url: string,
  storedId?: string | null
): string | null {
  if (storedId) {
    const normalized = storedId.trim().toUpperCase();
    const directMatch = normalized.match(/^(MLB\d+)$/);
    if (directMatch) return directMatch[1];
  }

  const patterns = [
    /MLB-?(\d+)/i,
    /[?&]wid=(MLB\d+)/i,
    /item_id(?:%3A|:)(MLB\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1].startsWith("MLB")
        ? match[1].toUpperCase()
        : `MLB${match[1]}`;
    }
  }

  return null;
}

export function extractMercadoLivreIdFromHtml(html: string): string | null {
  const patterns = [
    /[?&]wid=(MLB\d+)/i,
    /item_id(?:%3A|:)(MLB\d+)/i,
    /"item_id"\s*:\s*"(MLB\d+)"/i,
    /\b(MLB-?\d{6,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/-/g, "").toUpperCase();
    }
  }

  return null;
}

export function isMercadoLivreUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ML_LINK_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isMercadoLivrePageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /mercadolivre|mercadolibre/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isMercadoLivrePage(html: string, finalUrl: string): boolean {
  return (
    isMercadoLivrePageUrl(finalUrl) ||
    html.includes("poly-card") ||
    html.includes("poly-component__title") ||
    html.includes("ui-pdp-title") ||
    /property=["']og:title["']/i.test(html)
  );
}

function extractOgTitle(html: string): string | null {
  const match =
    html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

export function normalizeProductText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const POLY_CARD_CLASSES = [
  "poly-card",
  "poly-card--list",
  "poly-card--xlarge",
];

function elementHasClasses(classAttr: string, required: string[]): boolean {
  const classes = classAttr.split(/\s+/).filter(Boolean);
  return required.every((name) => classes.includes(name));
}

function findElementInnerHtml(
  html: string,
  tagName: string,
  requiredClasses: string[]
): string | null {
  const openTagRegex = new RegExp(`<${tagName}\\b([^>]*)>`, "gi");
  let match: RegExpExecArray | null;

  while ((match = openTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i);
    if (!classMatch || !elementHasClasses(classMatch[1], requiredClasses)) {
      continue;
    }

    const contentStart = match.index + match[0].length;
    let depth = 1;
    let pos = contentStart;
    const openRe = new RegExp(`<${tagName}\\b`, "gi");
    const closeRe = new RegExp(`</${tagName}>`, "gi");

    while (depth > 0 && pos < html.length) {
      openRe.lastIndex = pos;
      closeRe.lastIndex = pos;

      const openMatch = openRe.exec(html);
      const closeMatch = closeRe.exec(html);

      if (!closeMatch) {
        return null;
      }

      if (openMatch && openMatch.index < closeMatch.index) {
        depth += 1;
        pos = openMatch.index + openMatch[0].length;
      } else {
        depth -= 1;
        if (depth === 0) {
          return html.slice(contentStart, closeMatch.index);
        }
        pos = closeMatch.index + closeMatch[0].length;
      }
    }
  }

  return null;
}

function extractTitleFromPolyCard(innerHtml: string): string | null {
  const candidates: string[] = [];

  const titlePatterns = [
    /<h1[^>]*class=["'][^"']*poly-component__title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
    /<h2[^>]*class=["'][^"']*poly-component__title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
    /<a[^>]*class=["'][^"']*poly-component__title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /<span[^>]*class=["'][^"']*poly-component__title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2[^>]*>([\s\S]*?)<\/h2>/i,
  ];

  for (const pattern of titlePatterns) {
    const match = innerHtml.match(pattern);
    if (match?.[1]) {
      candidates.push(stripHtmlTags(match[1]));
    }
  }

  const cleaned = candidates.filter((c) => c.length > 3);
  return cleaned[0] ?? null;
}

interface PolyCardExtraction {
  fullText: string;
  displayTitle: string | null;
}

function extractPolyCardContent(html: string): PolyCardExtraction | null {
  const innerHtml =
    findElementInnerHtml(html, "div", POLY_CARD_CLASSES) ??
    findElementInnerHtml(html, "article", POLY_CARD_CLASSES) ??
    findElementInnerHtml(html, "section", POLY_CARD_CLASSES);

  if (!innerHtml) {
    return null;
  }

  const fullText = stripHtmlTags(innerHtml);
  const displayTitle = extractTitleFromPolyCard(innerHtml);

  if (!fullText) {
    return null;
  }

  return { fullText, displayTitle };
}

export function extractPageProductContent(html: string): PolyCardExtraction | null {
  const polyCard = extractPolyCardContent(html);
  if (polyCard) {
    return polyCard;
  }

  const pdpTitle = html.match(
    /<h1[^>]*class=["'][^"']*ui-pdp-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i
  );

  if (pdpTitle?.[1]) {
    const title = stripHtmlTags(pdpTitle[1]);
    return { fullText: title, displayTitle: title };
  }

  const ogTitle = extractOgTitle(html);
  if (ogTitle) {
    return { fullText: ogTitle, displayTitle: ogTitle };
  }

  return null;
}

export function compareProductNames(
  expectedName: string,
  pageTitle: string
): { match: boolean; score: number } {
  const expected = normalizeProductText(expectedName);
  const found = normalizeProductText(pageTitle);

  if (!expected || !found) {
    return { match: false, score: 0 };
  }

  if (expected === found) {
    return { match: true, score: 1 };
  }

  if (found.includes(expected) || expected.includes(found)) {
    return { match: true, score: 0.95 };
  }

  const expectedTokens = expected.split(" ").filter((t) => t.length > 2);
  const foundTokens = new Set(found.split(" ").filter((t) => t.length > 2));

  if (expectedTokens.length === 0) {
    return { match: false, score: 0 };
  }

  const matched = expectedTokens.filter((token) => foundTokens.has(token)).length;
  const score = matched / expectedTokens.length;

  return { match: score >= 0.65, score };
}

function hasActiveProductMarkup(html: string): boolean {
  return (
    html.includes("poly-card--list") ||
    html.includes("ui-pdp-title") ||
    (html.includes("poly-component__title") &&
      html.includes("andes-money-amount"))
  );
}

function isBlockedPage(html: string, status: number): boolean {
  return status === 403 || BLOCKED_HTML_PATTERNS.some((pattern) => pattern.test(html));
}

function isInactiveListingPage(html: string): boolean {
  if (hasActiveProductMarkup(html)) {
    return /"item_status"\s*:\s*"(?:paused|closed)"/i.test(html);
  }

  return INACTIVE_HTML_PATTERNS.some((pattern) => pattern.test(html));
}

function isNotFoundPage(html: string, status: number): boolean {
  if (status === 404) return true;
  if (hasActiveProductMarkup(html)) return false;

  return /parece\s+que\s+esta\s+p[aá]gina\s+n[aã]o\s+existe|p[aá]gina\s+n[aã]o\s+encontrada|error\s+404/i.test(
    html
  );
}

export async function verifyMercadoLivreListing(
  url: string | null | undefined,
  productName: string,
  storedId?: string | null,
  options?: {
    cookieHeader?: string | null;
    userAgent?: string | null;
  }
): Promise<MlVerificationResult> {
  const checkedAt = new Date().toISOString();

  if (!url?.trim()) {
    return {
      status: "no_url",
      message: "Produto sem link do Mercado Livre",
      checkedAt,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      status: "invalid_url",
      message: "URL inválida",
      checkedAt,
    };
  }

  if (!isMercadoLivreUrl(url)) {
    return {
      status: "invalid_url",
      message:
        "URL não reconhecida como link do Mercado Livre (use meli.la, mercadolivre.com.br, etc.)",
      checkedAt,
    };
  }

  let itemId: string | null =
    extractMercadoLivreId(url, storedId) ?? extractMercadoLivreId(parsedUrl.href, storedId);

  try {
    const headers: Record<string, string> = { ...FETCH_HEADERS };
    if (options?.cookieHeader) {
      headers.Cookie = options.cookieHeader;
    }
    if (options?.userAgent) {
      headers["User-Agent"] = options.userAgent;
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });

    const html = await response.text();
    const finalUrl = response.url;

    if (isBlockedPage(html, response.status)) {
      return {
        status: "blocked",
        message:
          "Mercado Livre exigiu verificação (captcha). Abra o link no navegador, conclua a validação e tente novamente.",
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    itemId =
      extractMercadoLivreId(finalUrl, storedId) ??
      extractMercadoLivreIdFromHtml(html) ??
      itemId;

    if (!isMercadoLivrePage(html, finalUrl)) {
      return {
        status: "invalid_url",
        message: "Link não levou a uma página do Mercado Livre",
        checkedAt,
      };
    }

    if (isNotFoundPage(html, response.status)) {
      return {
        status: "not_found",
        message: "Página do anúncio não encontrada",
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    if (!response.ok && response.status >= 400) {
      return {
        status: "error",
        message: `Erro ao abrir o link (HTTP ${response.status})`,
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    if (isInactiveListingPage(html)) {
      return {
        status: "inactive",
        message: "Anúncio indisponível ou pausado no Mercado Livre",
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    const polyCard = extractPageProductContent(html);

    if (!polyCard) {
      return {
        status: "unknown",
        message:
          "Página do Mercado Livre aberta, mas o nome do produto não foi encontrado",
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    const pageTitle =
      polyCard.displayTitle ??
      (polyCard.fullText.length > 120
        ? `${polyCard.fullText.slice(0, 120)}…`
        : polyCard.fullText);

    const { match, score } = compareProductNames(
      productName,
      polyCard.fullText
    );

    if (match) {
      return {
        status: "active",
        message: `Nome encontrado na página ML (${Math.round(score * 100)}% de correspondência)`,
        itemId: itemId ?? undefined,
        pageTitle,
        nameMatch: true,
        matchScore: score,
        checkedAt,
      };
    }

    const redirectedAway =
      finalUrl &&
      !isMercadoLivrePageUrl(finalUrl) &&
      !html.includes("poly-card");

    if (redirectedAway) {
      return {
        status: "not_found",
        message: "Link redirecionou para fora do Mercado Livre",
        itemId: itemId ?? undefined,
        pageTitle,
        nameMatch: false,
        matchScore: score,
        checkedAt,
      };
    }

    return {
      status: "inactive",
      message: `Nome não encontrado na página ML (${Math.round(score * 100)}% de correspondência)`,
      itemId: itemId ?? undefined,
      pageTitle,
      nameMatch: false,
      matchScore: score,
      checkedAt,
    };
  } catch {
    return {
      status: "error",
      message: "Falha ao abrir e analisar a página do Mercado Livre",
      itemId: itemId ?? undefined,
      checkedAt,
    };
  }
}

export function getVerificationBadgeVariant(
  status: MlVerificationStatus
): "success" | "destructive" | "warning" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
    case "not_found":
      return "destructive";
    case "no_url":
    case "invalid_url":
      return "warning";
    case "blocked":
      return "warning";
    case "error":
    case "unknown":
    default:
      return "secondary";
  }
}

export function getVerificationLabel(status: MlVerificationStatus): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "not_found":
      return "Não encontrado";
    case "no_url":
      return "Sem link";
    case "invalid_url":
      return "Link inválido";
    case "blocked":
      return "Verificação necessária";
    case "error":
      return "Erro";
    case "unknown":
    default:
      return "Indefinido";
  }
}

export function shouldDeactivateProductOnVerification(
  status: MlVerificationStatus
): boolean {
  return status === "not_found" || status === "invalid_url" || status === "inactive";
}

export function shouldReactivateProductOnVerification(
  status: MlVerificationStatus
): boolean {
  return status === "active";
}

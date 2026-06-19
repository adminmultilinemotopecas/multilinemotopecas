import type { TechnicalSpec } from "@/types/database";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  extractMercadoLivreId,
  isMercadoLivreUrl,
} from "@/lib/mercado-livre-verify";
import {
  isMercadoLivreProductPageUrl,
  normalizeSyncUrl,
} from "@/lib/ml-price-sync/url-validator";
import { slugify } from "@/lib/utils";

export interface ExtensionScrapedProduct {
  name: string;
  mercadoLivreId: string | null;
  price: number;
  promotionalPrice: number | null;
  shortDescription: string | null;
  fullDescription: string | null;
  technicalSpecs: TechnicalSpec[];
  applications: string | null;
  compatibilities: string | null;
  productReferences: string | null;
  tags: string[];
  images: string[];
  stock: number;
  sellerName: string | null;
  condition: string | null;
  categoryPath: string | null;
}

export interface ExtensionImportInput {
  affiliateUrl: string;
  sourcePageUrl: string;
  scraped: ExtensionScrapedProduct;
}

export interface ExtensionImportResult {
  success: true;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  imagesCount: number;
  message: string;
}

const PENDING_REVIEW_MESSAGE =
  "Importado pela extensão — pendente de revisão manual para publicação";

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value !== "string") return null;

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function getMlImageKey(url: string): string | null {
  const normalized = url.trim().replace(/\?.*$/, "");
  if (!normalized) return null;

  const fileMatch = normalized.match(
    /\/(D_NQ_(?:NP_|MP_)?[A-Za-z0-9_-]+?)(?:-\d+)?\.(?:jpg|jpeg|webp|png)$/i
  );
  if (fileMatch?.[1]) {
    return fileMatch[1]
      .replace(/-(O|F|V|I|D)$/i, "")
      .toLowerCase();
  }

  const structuredMatch = normalized.match(
    /\/D_(?:NQ|NP)_(?:NP_|MP_)?([A-Za-z0-9_-]+)/i
  );
  if (structuredMatch?.[1]) {
    return structuredMatch[1].toLowerCase();
  }

  return normalized
    .replace(/-(?:O|F|V|I|D)\.(jpg|jpeg|webp|png)$/i, "")
    .toLowerCase();
}

function dedupeImportedImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawUrl of urls) {
    const url = rawUrl?.trim();
    if (!url) continue;

    const key = getMlImageKey(url);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(url);
  }

  return result;
}

function normalizePrices(scraped: ExtensionScrapedProduct) {
  const basePrice = parsePrice(scraped.price);
  const promoPrice = parsePrice(scraped.promotionalPrice);

  if (basePrice == null && promoPrice == null) {
    return { price: 0, promotional_price: null as number | null };
  }

  if (
    promoPrice != null &&
    basePrice != null &&
    promoPrice < basePrice &&
    basePrice - promoPrice >= 0.5
  ) {
    return { price: basePrice, promotional_price: promoPrice };
  }

  const single = basePrice ?? promoPrice ?? 0;
  return { price: single, promotional_price: null as number | null };
}

async function slugIsAvailable(candidate: string): Promise<boolean> {
  const existing = await prisma.products.findFirst({
    where: { slug: candidate },
    select: { id: true },
  });
  return !existing;
}

async function generateUniqueSlug(
  baseSlug: string,
  mercadoLivreId: string | null
): Promise<string> {
  const suffix = mercadoLivreId
    ? mercadoLivreId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : null;

  const candidates = [
    baseSlug,
    suffix ? `${baseSlug}-${suffix}` : null,
    `${baseSlug}-importado`,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (await slugIsAvailable(candidate)) return candidate;
  }

  let counter = 2;
  while (counter < 100) {
    const candidate = `${baseSlug}-${counter}`;
    if (await slugIsAvailable(candidate)) return candidate;
    counter += 1;
  }

  return `${baseSlug}-${Date.now()}`;
}

function buildShortDescription(scraped: ExtensionScrapedProduct): string | null {
  if (scraped.shortDescription?.trim()) {
    return scraped.shortDescription.trim().slice(0, 500);
  }

  if (scraped.fullDescription?.trim()) {
    return scraped.fullDescription.trim().slice(0, 280);
  }

  return null;
}

function buildFullDescription(scraped: ExtensionScrapedProduct): string | null {
  const sections: string[] = [];

  if (scraped.fullDescription?.trim()) {
    sections.push(scraped.fullDescription.trim());
  }

  if (scraped.applications?.trim()) {
    sections.push(`Aplicações:\n${scraped.applications.trim()}`);
  }

  if (scraped.compatibilities?.trim()) {
    sections.push(`Compatibilidades:\n${scraped.compatibilities.trim()}`);
  }

  if (scraped.sellerName?.trim()) {
    sections.push(`Vendedor no Mercado Livre: ${scraped.sellerName.trim()}`);
  }

  if (scraped.condition?.trim()) {
    sections.push(`Condição: ${scraped.condition.trim()}`);
  }

  if (scraped.categoryPath?.trim()) {
    sections.push(`Categoria ML: ${scraped.categoryPath.trim()}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}

function buildTags(scraped: ExtensionScrapedProduct): string[] {
  const tags = new Set<string>(["importado-extensao", "pendente-revisao"]);

  for (const tag of scraped.tags) {
    const normalized = tag.trim();
    if (normalized.length > 1) tags.add(normalized);
  }

  if (scraped.categoryPath) {
    scraped.categoryPath
      .split(">")
      .map((part) => part.trim())
      .filter((part) => part.length > 1)
      .forEach((part) => tags.add(part));
  }

  return Array.from(tags).slice(0, 30);
}

function validatePayload(input: ExtensionImportInput): string | null {
  if (!input.affiliateUrl?.trim()) {
    return "Informe o link de afiliado do Mercado Livre.";
  }

  if (!isMercadoLivreUrl(input.affiliateUrl.trim())) {
    return "O link de afiliado não é um URL válido do Mercado Livre.";
  }

  if (!input.sourcePageUrl?.trim()) {
    return "URL da página de origem não informada.";
  }

  if (!input.scraped?.name?.trim()) {
    return "Não foi possível identificar o nome do produto na página.";
  }

  if (!Array.isArray(input.scraped.images) || input.scraped.images.length === 0) {
    return "Não foi possível identificar imagens do produto na página.";
  }

  return null;
}

export async function importProductFromExtension(
  input: ExtensionImportInput
): Promise<ExtensionImportResult> {
  const validationError = validatePayload(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const scraped = input.scraped;
  const affiliateUrl = input.affiliateUrl.trim();
  const sourcePageUrl = input.sourcePageUrl.trim();
  const mlSourceUrl = isMercadoLivreProductPageUrl(sourcePageUrl)
    ? normalizeSyncUrl(sourcePageUrl)
    : null;
  const mercadoLivreId =
    scraped.mercadoLivreId ||
    extractMercadoLivreId(affiliateUrl) ||
    extractMercadoLivreId(input.sourcePageUrl);

  if (mercadoLivreId) {
    const existing = await prisma.products.findFirst({
      where: { mercado_livre_id: mercadoLivreId },
      select: { id: true, name: true },
    });

    if (existing) {
      throw new Error(
        `Este anúncio já foi importado (${existing.name}). Revise o produto no admin.`
      );
    }
  }

  const name = scraped.name.trim();
  const baseSlug = slugify(name);
  const slug = await generateUniqueSlug(baseSlug, mercadoLivreId);
  const sku = mercadoLivreId || `ML-IMPORT-${Date.now()}`;
  const { price, promotional_price } = normalizePrices(scraped);
  const tags = buildTags(scraped);

  const productData = {
    name,
    slug,
    sku,
    internal_code: null,
    brand_id: null,
    category_id: null,
    subcategory_id: null,
    price,
    promotional_price,
    stock: Number.isFinite(scraped.stock) ? Math.max(0, scraped.stock) : 0,
    weight: null,
    dimensions: null,
    short_description: buildShortDescription(scraped),
    full_description: buildFullDescription(scraped),
    technical_specs: (scraped.technicalSpecs?.slice(0, 80) ??
      []) as unknown as Prisma.InputJsonValue,
    applications: scraped.applications?.trim() || null,
    compatibilities: scraped.compatibilities?.trim() || null,
    product_references: scraped.productReferences?.trim() || null,
    tags,
    seo_keywords: tags,
    mercado_livre_url: affiliateUrl,
    mercado_livre_id: mercadoLivreId,
    ml_source_url: mlSourceUrl,
    price_sync_enabled: true,
    listing_status: "not_listed" as const,
    status: "inactive" as const,
    is_featured: false,
    is_bestseller: false,
    is_new: false,
    is_promotion: promotional_price != null,
    is_launch: false,
    is_recommended: false,
    ml_verification_pending: true,
    ml_verification_message: PENDING_REVIEW_MESSAGE,
    ml_verified_at: null,
  };

  let product;

  try {
    product = await prisma.products.create({
      data: productData,
      select: { id: true, name: true, slug: true, sku: true, internal_code: true },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new Error("Produto duplicado (slug ou SKU já existente).");
    }
    throw new Error("Falha ao salvar o produto importado.");
  }

  const uniqueImages = dedupeImportedImages(scraped.images).slice(0, 20);

  try {
    await prisma.product_images.createMany({
      data: uniqueImages.map((url, index) => ({
        product_id: product.id,
        url,
        alt_text: name,
        sort_order: index,
        is_primary: index === 0,
      })),
    });
  } catch {
    await prisma.products.delete({ where: { id: product.id } });
    throw new Error("Produto criado, mas falhou ao salvar as imagens.");
  }

  return {
    success: true,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    imagesCount: uniqueImages.length,
    message: PENDING_REVIEW_MESSAGE,
  };
}

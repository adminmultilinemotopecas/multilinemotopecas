/**
 * Scraper detalhado para páginas de produto do Mercado Livre (Brasil).
 * Cobre layout clássico (ui-pdp-*) e layout poly-component mais recente.
 */
(function initMercadoLivreScraper(globalScope) {
  const ML_HOST_PATTERN =
    /(?:^|\.)mercadolivre\.com(?:\.br)?$|(?:^|\.)mercadolibre\.com$/i;

  function decodeHtmlEntities(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  function cleanText(text) {
    return decodeHtmlEntities(
      String(text || "")
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  function parseBrazilianPrice(text) {
    if (!text) return null;
    const normalized = String(text)
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }

  function normalizeImageUrl(url) {
    if (!url) return null;
    let normalized = String(url).trim().split(/\s+/)[0];
    if (normalized.startsWith("//")) normalized = `https:${normalized}`;
    if (!/^https?:\/\//i.test(normalized)) return null;
    normalized = normalized.replace(/-(O|V|I|D)\.(jpg|jpeg|webp|png)/i, "-F.$2");
    normalized = normalized.replace(/\?.*$/, "");
    return normalized;
  }

  function getMlImageKey(url) {
    const normalized = normalizeImageUrl(url);
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

  function dedupeImages(urls) {
    const seen = new Set();
    const result = [];

    for (const url of urls) {
      const normalized = normalizeImageUrl(url);
      if (!normalized) continue;

      const key = getMlImageKey(normalized);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      result.push(normalized);
    }

    return result;
  }

  function uniqueList(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function findPriceRoot() {
    const candidates = [
      document.querySelector(".ui-pdp-price"),
      document.querySelector(".poly-price"),
      document.querySelector("[data-testid='price-part']")?.closest(
        ".ui-pdp-price, .poly-price, .ui-pdp-container__row--price"
      ),
      document.querySelector(".ui-pdp-container__row--price"),
      document.querySelector(".ui-pdp-buybox"),
    ];

    return candidates.find(Boolean) || null;
  }

  function isInstallmentPriceNode(node) {
    return Boolean(
      node.closest(
        ".ui-pdp-price__installments, .poly-price__installments, .ui-pdp-price__subtitles, .poly-price__installments"
      )
    );
  }

  function hasDiscountIndicator(priceRoot) {
    if (!priceRoot) return false;

    return Boolean(
      priceRoot.querySelector(
        ".andes-money-amount--previous, .ui-pdp-price__original-value, .poly-price__previous, s.andes-money-amount"
      ) ||
        /%\s*OFF|off\b|desconto|de\s+r\$\s*[\d.]+\s+por/i.test(
          cleanText(priceRoot.textContent)
        )
    );
  }

  function isMercadoLivreProductPage() {
    try {
      return ML_HOST_PATTERN.test(window.location.hostname);
    } catch {
      return false;
    }
  }

  function extractMercadoLivreId() {
    const patterns = [/MLB-?(\d+)/i, /[?&]wid=(MLB\d+)/i, /item_id(?:%3A|:)(MLB\d+)/i];
    const sources = [window.location.href, document.documentElement.innerHTML];

    for (const source of sources) {
      for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match?.[1]) {
          return match[1].startsWith("MLB")
            ? match[1].toUpperCase()
            : `MLB${match[1]}`;
        }
      }
    }

    return null;
  }

  function readJsonLdProducts() {
    const products = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
      try {
        const parsed = JSON.parse(node.textContent || "");
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        for (const entry of entries) {
          if (entry?.["@type"] === "Product") products.push(entry);
          if (Array.isArray(entry?.["@graph"])) {
            entry["@graph"].forEach((item) => {
              if (item?.["@type"] === "Product") products.push(item);
            });
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });
    return products;
  }

  function readMetaContent(selector) {
    const node = document.querySelector(selector);
    return node ? cleanText(node.getAttribute("content")) : null;
  }

  function extractTitle(jsonLdProducts) {
    const selectors = [
      "h1.ui-pdp-title",
      "h1.poly-component__title",
      "h1[class*='ui-pdp-title']",
      "h1[class*='poly-component__title']",
      ".ui-pdp-header__title",
      "h1",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = cleanText(node?.textContent);
      if (text.length > 3) return text;
    }

    for (const product of jsonLdProducts) {
      if (product?.name) return cleanText(product.name);
    }

    return readMetaContent('meta[property="og:title"]');
  }

  function extractSubtitle() {
    const selectors = [
      ".ui-pdp-subtitle",
      ".poly-component__subtitle",
      ".ui-pdp-header__subtitle",
      "[class*='subtitle']",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = cleanText(node?.textContent);
      if (text.length > 3 && text.length < 500) return text;
    }

    return null;
  }

  function extractMoneyAmount(root) {
    const ariaLabel = root.getAttribute("aria-label");
    if (ariaLabel) {
      const ariaMatch = ariaLabel.match(
        /(\d[\d.]*)\s*reais?(?:\s+com\s+(\d{1,2})\s*centavos?)?/i
      );
      if (ariaMatch) {
        const reais = parseBrazilianPrice(ariaMatch[1]);
        const centavos = ariaMatch[2] ? Number.parseInt(ariaMatch[2], 10) : 0;
        if (reais != null) {
          return Math.round((reais + centavos / 100) * 100) / 100;
        }
      }
    }

    const fraction = cleanText(
      root.querySelector(".andes-money-amount__fraction")?.textContent
    );
    const cents = cleanText(
      root.querySelector(".andes-money-amount__cents")?.textContent
    );

    if (!fraction) return null;

    if (cents) {
      return parseBrazilianPrice(`${fraction},${cents}`);
    }

    return parseBrazilianPrice(fraction);
  }

  function extractPricesFromAriaLabels(root) {
    if (!root) return null;

    let originalPrice = null;
    let currentPrice = null;

    root.querySelectorAll("[aria-label]").forEach((node) => {
      const label = node.getAttribute("aria-label") || "";
      if (!/antes|agora/i.test(label)) return;

      const value = extractMoneyAmount(node);
      if (value == null) return;

      if (/antes/i.test(label)) originalPrice = value;
      if (/agora/i.test(label)) currentPrice = value;
    });

    if (
      originalPrice != null &&
      currentPrice != null &&
      originalPrice > currentPrice &&
      originalPrice - currentPrice >= 0.5
    ) {
      return { price: originalPrice, promotionalPrice: currentPrice };
    }

    return null;
  }

  function extractPrices(jsonLdProducts) {
    const priceRoot = findPriceRoot();
    const ariaPrices = extractPricesFromAriaLabels(priceRoot);
    if (ariaPrices) return ariaPrices;

    let currentPrice = null;
    let originalPrice = null;

    if (priceRoot) {
      const currentSelectors = [
        ".ui-pdp-price__second-line .andes-money-amount",
        ".ui-pdp-price__main .andes-money-amount",
        ".poly-price__current .andes-money-amount",
        ".poly-price .andes-money-amount--cents-superscript",
        "[data-testid='price-part'] .andes-money-amount",
        ".andes-money-amount:not(.andes-money-amount--previous)",
      ];

      for (const selector of currentSelectors) {
        const nodes = priceRoot.querySelectorAll(selector);
        for (const node of nodes) {
          if (
            node.classList.contains("andes-money-amount--previous") ||
            isInstallmentPriceNode(node)
          ) {
            continue;
          }

          const value = extractMoneyAmount(node);
          if (value != null) {
            currentPrice = value;
            break;
          }
        }

        if (currentPrice != null) break;
      }

      const previousNode = priceRoot.querySelector(
        ".andes-money-amount--previous, .ui-pdp-price__original-value .andes-money-amount, .poly-price__previous .andes-money-amount, s.andes-money-amount"
      );

      if (previousNode && !isInstallmentPriceNode(previousNode)) {
        originalPrice = extractMoneyAmount(previousNode);
      }
    }

    if (currentPrice == null) {
      for (const product of jsonLdProducts) {
        const offers = product?.offers;
        const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
        for (const offer of offerList) {
          const offerPrice = parseBrazilianPrice(offer?.price ?? offer?.lowPrice);
          if (offerPrice != null) {
            currentPrice = offerPrice;
            break;
          }
        }
        if (currentPrice != null) break;
      }
    }

    const discountIndicator = hasDiscountIndicator(priceRoot);
    const hasRealDiscount =
      discountIndicator &&
      originalPrice != null &&
      currentPrice != null &&
      originalPrice > currentPrice &&
      originalPrice - currentPrice >= 0.5;

    if (!hasRealDiscount) {
      const singlePrice = currentPrice ?? originalPrice ?? 0;
      return {
        price: singlePrice,
        promotionalPrice: null,
      };
    }

    return {
      price: originalPrice,
      promotionalPrice: currentPrice,
    };
  }

  function extractDescription(jsonLdProducts) {
    const selectors = [
      "#description .ui-pdp-description__content",
      ".ui-pdp-description__content",
      "#description",
      ".ui-pdp-description",
      ".poly-description__content",
      "[data-testid='content']",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = cleanText(node?.textContent);
      if (text.length > 20) return text;
    }

    for (const product of jsonLdProducts) {
      if (product?.description) return cleanText(product.description);
    }

    return readMetaContent('meta[property="og:description"]');
  }

  function extractHighlightedFeatures() {
    const bullets = [];
    const selectors = [
      "#highlighted_specs_attrs li",
      ".ui-vpp-highlighted-specs__attribute-columns li",
      ".ui-pdp-highlighted-specs__features li",
      ".poly-highlight__list li",
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const text = cleanText(node.textContent);
        if (text.length > 2) bullets.push(text);
      });
    });

    return uniqueList(bullets);
  }

  function extractTechnicalSpecs() {
    const specs = [];
    const seen = new Set();

    function addSpec(label, value) {
      const cleanLabel = cleanText(label);
      const cleanValue = cleanText(value);
      if (!cleanLabel || !cleanValue) return;
      const key = `${cleanLabel}::${cleanValue}`;
      if (seen.has(key)) return;
      seen.add(key);
      specs.push({ label: cleanLabel, value: cleanValue });
    }

    document
      .querySelectorAll(
        ".ui-pdp-specs__table tr, .andes-table tr, table.ui-pdp-specs tr, .poly-specs__row"
      )
      .forEach((row) => {
        const cells = row.querySelectorAll("th, td");
        if (cells.length >= 2) {
          addSpec(cells[0].textContent, cells[1].textContent);
        }
      });

    document
      .querySelectorAll(
        ".ui-pdp-specs__attribute, .andes-specs__item, .poly-attributes__item"
      )
      .forEach((item) => {
        const label = item.querySelector(
          ".ui-pdp-specs__attribute-label, .andes-specs__header, .poly-attributes__label"
        );
        const value = item.querySelector(
          ".ui-pdp-specs__attribute-value, .andes-specs__value, .poly-attributes__value"
        );
        if (label && value) addSpec(label.textContent, value.textContent);
      });

    document.querySelectorAll("#highlighted_specs_attrs li").forEach((item) => {
      const text = cleanText(item.textContent);
      const parts = text.split(":");
      if (parts.length >= 2) {
        addSpec(parts[0], parts.slice(1).join(":"));
      } else if (text) {
        addSpec("Destaque", text);
      }
    });

    return specs.slice(0, 80);
  }

  function extractProductReferences(specs) {
    const referenceLabels = [
      "sku",
      "código",
      "codigo",
      "referência",
      "referencia",
      "part number",
      "número de peça",
      "numero de peca",
      "gtin",
      "ean",
      "mpn",
    ];

    for (const spec of specs) {
      const label = spec.label.toLowerCase();
      if (referenceLabels.some((term) => label.includes(term))) {
        return spec.value;
      }
    }

    const html = document.documentElement.innerHTML;
    const patterns = [
      /"seller_custom_field"\s*:\s*"([^"]+)"/i,
      /"catalog_product_id"\s*:\s*"([^"]+)"/i,
      /"item_id"\s*:\s*"(MLB\d+)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }

  function pickBestImageFromNode(node) {
    if (!node) return null;

    const candidates = [
      node.getAttribute?.("data-zoom"),
      node.getAttribute?.("data-src"),
      node.getAttribute?.("src"),
    ].filter(Boolean);

    if (node.querySelector) {
      const img = node.querySelector("img");
      if (img) {
        candidates.unshift(
          img.getAttribute("data-zoom"),
          img.getAttribute("data-src"),
          img.getAttribute("src")
        );
      }
    }

    for (const candidate of candidates) {
      const normalized = normalizeImageUrl(candidate);
      if (normalized) return normalized;
    }

    return null;
  }

  function extractGalleryFigures() {
    const images = [];
    const figureSelectors = [
      ".ui-pdp-gallery__figure",
      ".ui-pdp-gallery__clip",
      "[data-testid='gallery'] figure",
      ".poly-gallery__figure",
      ".poly-gallery__carousel-item",
      ".poly-gallery figure",
    ];

    for (const selector of figureSelectors) {
      const figures = document.querySelectorAll(selector);
      if (figures.length === 0) continue;

      figures.forEach((figure) => {
        const best = pickBestImageFromNode(figure);
        if (best) images.push(best);
      });

      if (images.length > 0) break;
    }

    if (images.length > 0) {
      return dedupeImages(images);
    }

    const thumbnailSelectors = [
      ".ui-pdp-thumbnail__picture img",
      ".ui-pdp-gallery__thumbnail img",
      ".poly-gallery__thumbnail img",
      ".poly-gallery__thumb img",
    ];

    for (const selector of thumbnailSelectors) {
      document.querySelectorAll(selector).forEach((img) => {
        const best = pickBestImageFromNode(img);
        if (best) images.push(best);
      });
      if (images.length > 0) break;
    }

    return dedupeImages(images);
  }

  function extractImagesFromJsonLd(jsonLdProducts) {
    const images = [];

    for (const product of jsonLdProducts) {
      const productImages = product?.image;
      if (typeof productImages === "string") images.push(productImages);
      if (Array.isArray(productImages)) images.push(...productImages);
    }

    return dedupeImages(images);
  }

  function extractImages(jsonLdProducts) {
    const galleryImages = extractGalleryFigures();

    if (galleryImages.length > 0) {
      return galleryImages;
    }

    const jsonLdImages = extractImagesFromJsonLd(jsonLdProducts);
    if (jsonLdImages.length > 0) {
      return jsonLdImages;
    }

    const ogImage = readMetaContent('meta[property="og:image"]');
    return ogImage ? dedupeImages([ogImage]) : [];
  }

  function extractSellerName() {
    const selectors = [
      ".ui-pdp-seller__link-trigger-button span",
      ".ui-pdp-seller__header__title",
      ".ui-pdp-seller__link-trigger",
      "[data-testid='seller-link']",
      ".poly-component__seller",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = cleanText(node?.textContent);
      if (text.length > 1) return text;
    }

    return null;
  }

  function extractCondition() {
    const selectors = [
      ".ui-pdp-subtitle",
      ".ui-pdp-condition",
      ".poly-component__condition",
    ];

    for (const selector of selectors) {
      const text = cleanText(document.querySelector(selector)?.textContent);
      if (/novo|usado|recondicionado/i.test(text)) return text;
    }

    const specs = extractTechnicalSpecs();
    const conditionSpec = specs.find((spec) =>
      /condi/i.test(spec.label)
    );
    return conditionSpec?.value || null;
  }

  function extractStock() {
    const patterns = [
      /(\d+)\s+dispon[ií]ve/i,
      /estoque:\s*(\d+)/i,
      /quantidade:\s*(\d+)/i,
    ];

    const textSources = [
      document.querySelector(".ui-pdp-buybox__quantity__available")?.textContent,
      document.querySelector("[data-testid='quantity-available']")?.textContent,
      document.body?.textContent?.slice(0, 50000),
    ];

    for (const source of textSources) {
      if (!source) continue;
      for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match?.[1]) return Number.parseInt(match[1], 10);
      }
    }

    return 0;
  }

  function extractCategoryPath() {
    const crumbs = [];
    document
      .querySelectorAll(
        ".andes-breadcrumb__item a, .andes-breadcrumb__item span, .ui-pdp-breadcrumb a, .ui-pdp-breadcrumb span"
      )
      .forEach((node) => {
        const text = cleanText(node.textContent);
        if (text.length > 1 && !/mercado livre|início|inicio|voltar/i.test(text)) {
          crumbs.push(text);
        }
      });

    if (crumbs.length > 0) return crumbs.join(" > ");

    const categoryMeta = readMetaContent('meta[name="category"]');
    return categoryMeta || null;
  }

  function extractCompatibilities(specs, description) {
    const labels = ["compat", "aplica", "veículo", "veiculo", "moto", "modelo"];
    const values = specs
      .filter((spec) => labels.some((term) => spec.label.toLowerCase().includes(term)))
      .map((spec) => `${spec.label}: ${spec.value}`);

    if (values.length > 0) return values.join("\n");

    if (description && /compat|aplica|serve para|indicad/i.test(description)) {
      const lines = description
        .split(/\n+/)
        .filter((line) => /compat|aplica|serve para|indicad/i.test(line))
        .slice(0, 8);
      if (lines.length > 0) return lines.join("\n");
    }

    return null;
  }

  function extractApplications(highlights, description) {
    if (highlights.length > 0) {
      return highlights.slice(0, 12).join("\n");
    }

    if (description) {
      const lines = description
        .split(/\n+/)
        .filter((line) => /aplica|uso|ideal|indicad/i.test(line))
        .slice(0, 8);
      if (lines.length > 0) return lines.join("\n");
    }

    return null;
  }

  function isMercadoLivreSocialPage() {
    const path = window.location.pathname.toLowerCase();
    return (
      /\/social\//i.test(path) ||
      /\/perfil\//i.test(path) ||
      Boolean(
        document.querySelector(
          '[class*="social-post"], [data-testid*="social"], .recommendation-card, [class*="SocialPost"]'
        )
      )
    );
  }

  function findProductPageLinks() {
    const links = new Set();

    document.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.href || "";
      if (/\/MLB-?\d+/i.test(href) || /\/p\/MLB/i.test(href)) {
        try {
          links.add(new URL(href).href.split("#")[0]);
        } catch {
          links.add(href.split("#")[0].split("?")[0]);
        }
      }
    });

    return Array.from(links);
  }

  function extractMercadoLivreIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/MLB-?(\d+)/i);
    if (!match?.[1]) return null;
    return match[1].startsWith("MLB") ? match[1].toUpperCase() : `MLB${match[1]}`;
  }

  function scrapeMercadoLivreSocialProduct() {
    const jsonLdProducts = readJsonLdProducts();
    const cardRoot =
      document.querySelector('[class*="social-post"]') ||
      document.querySelector('[class*="SocialPost"]') ||
      document.querySelector(".poly-card") ||
      document.body;

    let title = extractTitle(jsonLdProducts);
    if (!title) {
      const titleNode = cardRoot.querySelector(
        'h2, h3, p[class*="title"], [class*="title"], [class*="name"]'
      );
      title = cleanText(titleNode?.textContent);
    }

    let prices = extractPrices(jsonLdProducts);
    if (prices.price == null && prices.promotionalPrice == null) {
      const ariaPrices = extractPricesFromAriaLabels(cardRoot);
      if (ariaPrices) {
        prices = ariaPrices;
      } else {
        const priceNodes = cardRoot.querySelectorAll(".andes-money-amount");
        for (const node of priceNodes) {
          if (
            node.classList.contains("andes-money-amount--previous") ||
            isInstallmentPriceNode(node)
          ) {
            continue;
          }

          const value = extractMoneyAmount(node);
          if (value != null) {
            prices = { price: value, promotionalPrice: null };
            break;
          }
        }
      }
    }

    let images = extractImages(jsonLdProducts);
    if (images.length === 0) {
      const ogImage = readMetaContent('meta[property="og:image"]');
      if (ogImage) {
        images = dedupeImages([ogImage]);
      } else {
        const collected = [];
        cardRoot.querySelectorAll('img[src*="mlstatic"]').forEach((img) => {
          if (img.src) collected.push(img.src);
        });
        images = dedupeImages(collected);
      }
    }

    const productLinks = findProductPageLinks();
    const productPageUrl = productLinks[0] || null;
    const mercadoLivreId =
      extractMercadoLivreId() || extractMercadoLivreIdFromUrl(productPageUrl);

    if (!title) {
      throw new Error("Não foi possível ler o título na página de perfil social.");
    }

    const price = prices.price ?? prices.promotionalPrice ?? 0;

    return {
      name: title,
      mercadoLivreId,
      price,
      promotionalPrice:
        prices.promotionalPrice != null &&
        prices.price != null &&
        prices.promotionalPrice < prices.price
          ? prices.promotionalPrice
          : null,
      shortDescription: extractSubtitle() || readMetaContent('meta[property="og:description"]'),
      fullDescription: null,
      technicalSpecs: [],
      applications: null,
      compatibilities: null,
      productReferences: null,
      tags: mercadoLivreId ? [mercadoLivreId] : [],
      images,
      stock: 0,
      sellerName: null,
      condition: null,
      categoryPath: null,
      sourcePageUrl: productPageUrl || window.location.href,
      affiliateLandingUrl: window.location.href,
      productPageUrl,
      needsProductPage: Boolean(productPageUrl && images.length === 0),
    };
  }

  function scrapeMercadoLivrePage() {
    if (isMercadoLivreSocialPage()) {
      return scrapeMercadoLivreSocialProduct();
    }

    const product = scrapeMercadoLivreProduct();
    return {
      ...product,
      affiliateLandingUrl: null,
      productPageUrl: product.sourcePageUrl,
      needsProductPage: false,
    };
  }

  function scrapeMercadoLivreProduct() {
    if (!isMercadoLivreProductPage()) {
      throw new Error("Abra uma página de produto do Mercado Livre para importar.");
    }

    const jsonLdProducts = readJsonLdProducts();
    const title = extractTitle(jsonLdProducts);
    if (!title) {
      throw new Error("Não foi possível ler o título do produto nesta página.");
    }

    const subtitle = extractSubtitle();
    const prices = extractPrices(jsonLdProducts);
    const description = extractDescription(jsonLdProducts);
    const highlights = extractHighlightedFeatures();
    const technicalSpecs = extractTechnicalSpecs();
    const images = extractImages(jsonLdProducts);

    if (images.length === 0) {
      throw new Error("Não foi possível encontrar imagens do produto.");
    }

    const mercadoLivreId = extractMercadoLivreId();
    const categoryPath = extractCategoryPath();
    const tags = uniqueList([
      ...(categoryPath ? categoryPath.split(">").map((part) => cleanText(part)) : []),
      mercadoLivreId || "",
    ]).filter(Boolean);

    return {
      name: title,
      mercadoLivreId,
      price: prices.price,
      promotionalPrice: prices.promotionalPrice,
      shortDescription: subtitle || (description ? description.slice(0, 280) : null),
      fullDescription: description,
      technicalSpecs,
      applications: extractApplications(highlights, description),
      compatibilities: extractCompatibilities(technicalSpecs, description),
      productReferences: extractProductReferences(technicalSpecs),
      tags,
      images,
      stock: extractStock(),
      sellerName: extractSellerName(),
      condition: extractCondition(),
      categoryPath,
      sourcePageUrl: window.location.href,
    };
  }

  globalScope.scrapeMercadoLivreProduct = scrapeMercadoLivreProduct;
  globalScope.scrapeMercadoLivrePage = scrapeMercadoLivrePage;

  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "SCRAPE_ML_PRODUCT") {
        try {
          const data = scrapeMercadoLivreProduct();
          sendResponse({ ok: true, data });
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Falha ao analisar produto.",
          });
        }
        return true;
      }

      if (message?.type === "SCRAPE_ML_PAGE") {
        try {
          const data = scrapeMercadoLivrePage();
          sendResponse({ ok: true, data });
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Falha ao analisar página.",
          });
        }
        return true;
      }

      if (message?.type !== "SCRAPE_ML_PRICE") return;

      try {
        const data = scrapeMercadoLivrePage();
        sendResponse({
          ok: true,
          price: data.price,
          promotionalPrice: data.promotionalPrice,
          sourcePageUrl: data.sourcePageUrl,
          pageTitle: data.name,
          mercadoLivreId: data.mercadoLivreId,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao ler preço.",
        });
      }

      return true;
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

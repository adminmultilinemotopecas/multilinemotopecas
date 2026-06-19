const SCRAPE_LOAD_MS = 1800;
const PRODUCT_LOAD_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProductPageUrl(url) {
  if (!url) return false;
  return /\/MLB-?\d+/i.test(url) || /\/p\/MLB/i.test(url);
}

function normalizePageUrl(url) {
  try {
    return new URL(url).href.split("#")[0];
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

function waitForTabComplete(tabId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timeout ao carregar página do Mercado Livre."));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeout);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeout);
        resolve();
      }
    }).catch(reject);
  });
}

function isMercadoLivreHost(url) {
  try {
    return /mercadolivre|mercadolibre/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isAffiliateShortUrl(url) {
  try {
    return /meli\.la|mer\.li|merc\.li|me2\.do|merca\.do/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isMercadoLivreRelatedUrl(url) {
  return isMercadoLivreHost(url) || isAffiliateShortUrl(url);
}

function normalizeScrapePayload(data, affiliateUrl) {
  if (!data.name) {
    throw new Error("Título do produto não encontrado.");
  }

  if (!data.images?.length) {
    throw new Error("Não foi possível encontrar imagens do produto.");
  }

  if (!data.price && data.promotionalPrice) {
    data.price = data.promotionalPrice;
    data.promotionalPrice = null;
  }

  const sourcePageUrl =
    data.sourcePageUrl || data.productPageUrl || affiliateUrl;

  return {
    ok: true,
    data: {
      ...data,
      affiliateUrl,
      sourcePageUrl,
      productPageUrl: data.productPageUrl || sourcePageUrl,
    },
  };
}

async function findAffiliateLinkOnTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const pattern = /https?:\/\/(?:[\w-]+\.)?(?:meli\.la|mer\.li|merc\.li|me2\.do|merca\.do)\/[^\s"'<>]+/i;
      const found = new Set();

      document.querySelectorAll("a[href], input, textarea").forEach((node) => {
        const value =
          node instanceof HTMLAnchorElement
            ? node.href
            : "value" in node
              ? String(node.value || "")
              : "";

        const match = value.match(pattern);
        if (match?.[0]) found.add(match[0]);
      });

      const html = document.documentElement?.innerHTML || "";
      const htmlMatch = html.match(pattern);
      if (htmlMatch?.[0]) found.add(htmlMatch[0]);

      return Array.from(found)[0] || null;
    },
  });

  return results?.[0]?.result ?? null;
}

async function findProductPageUrl(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const candidates = [];

      document.querySelectorAll('a[href*="MLB"]').forEach((anchor) => {
        const href = anchor.href || "";
        if (/\/MLB-?\d+/i.test(href) || /\/p\/MLB/i.test(href)) {
          candidates.push(href.split("#")[0]);
        }
      });

      if (candidates.length > 0) return candidates[0];

      const current = window.location.href.split("#")[0];
      if (/\/MLB-?\d+/i.test(current) || /\/p\/MLB/i.test(current)) {
        return current;
      }

      return null;
    },
  });

  return results?.[0]?.result ?? null;
}

async function ensureScraperOnTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["scraper.js"],
    });
  } catch {
    // scraper may already be present
  }
}

async function scrapeProductPageFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_ML_PRODUCT" });
    if (response?.ok) return response;
  } catch {
    // content script may not be ready
  }

  await ensureScraperOnTab(tabId);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const scrapeFn =
        typeof scrapeMercadoLivreProduct === "function"
          ? scrapeMercadoLivreProduct
          : typeof globalThis.scrapeMercadoLivreProduct === "function"
            ? globalThis.scrapeMercadoLivreProduct
            : null;

      if (!scrapeFn) {
        return { ok: false, error: "Scraper indisponível nesta página." };
      }

      try {
        const data = scrapeFn();
        return { ok: true, data };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao analisar produto.",
        };
      }
    },
  });

  const result = results?.[0]?.result;
  if (!result?.ok) {
    return result ?? { ok: false, error: "Falha ao executar scraper." };
  }

  return { ok: true, data: result.data };
}

async function scrapeFullPageFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_ML_PAGE" });
    if (response?.ok) return response;
  } catch {
    // content script may not be ready
  }

  await ensureScraperOnTab(tabId);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const scrapeFn =
        typeof scrapeMercadoLivrePage === "function"
          ? scrapeMercadoLivrePage
          : typeof globalThis.scrapeMercadoLivrePage === "function"
            ? globalThis.scrapeMercadoLivrePage
            : null;

      if (!scrapeFn) {
        return { ok: false, error: "Scraper indisponível nesta página." };
      }

      try {
        const data = scrapeFn();
        return { ok: true, data };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao analisar página.",
        };
      }
    },
  });

  const result = results?.[0]?.result;
  if (!result?.ok) {
    return result ?? { ok: false, error: "Falha ao executar scraper." };
  }

  return { ok: true, data: result.data };
}

async function scrapeAffiliateUrl(affiliateUrl) {
  const tab = await chrome.tabs.create({ url: affiliateUrl, active: false });

  try {
    await waitForTabComplete(tab.id);
    await sleep(SCRAPE_LOAD_MS);

    let productPageUrl = await findProductPageUrl(tab.id);
    if (!productPageUrl) {
      throw new Error(
        "Não foi possível encontrar a página do produto a partir do link de afiliado."
      );
    }

    productPageUrl = normalizePageUrl(productPageUrl);
    const currentTab = await chrome.tabs.get(tab.id);
    const currentUrl = normalizePageUrl(currentTab.url || "");

    if (currentUrl !== productPageUrl) {
      await chrome.tabs.update(tab.id, { url: productPageUrl });
      await waitForTabComplete(tab.id);
      await sleep(PRODUCT_LOAD_MS);
    }

    const scrape = await scrapeProductPageFromTab(tab.id);
    if (!scrape.ok || !scrape.data) {
      throw new Error(scrape.error || "Não foi possível ler o produto.");
    }

    return normalizeScrapePayload(
      {
        ...scrape.data,
        sourcePageUrl: scrape.data.sourcePageUrl || productPageUrl,
        productPageUrl: scrape.data.sourcePageUrl || productPageUrl,
      },
      affiliateUrl
    );
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      // tab may already be closed
    }
  }
}

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { ok: false, error: "Nenhuma aba ativa encontrada." };
  }

  const pageUrl = normalizePageUrl(tab.url);
  if (!isMercadoLivreRelatedUrl(pageUrl)) {
    return {
      ok: false,
      error: "Abra uma página de produto ou link de afiliado do Mercado Livre.",
    };
  }

  if (isProductPageUrl(pageUrl) && isMercadoLivreHost(pageUrl)) {
    const affiliateUrl = (await findAffiliateLinkOnTab(tab.id)) || pageUrl;
    const scrape = await scrapeProductPageFromTab(tab.id);
    if (!scrape.ok || !scrape.data) {
      return scrape;
    }

    return normalizeScrapePayload(
      {
        ...scrape.data,
        sourcePageUrl: scrape.data.sourcePageUrl || pageUrl,
        productPageUrl: pageUrl,
      },
      affiliateUrl
    );
  }

  if (isMercadoLivreHost(pageUrl)) {
    const scrape = await scrapeFullPageFromTab(tab.id);
    if (scrape.ok && scrape.data) {
      const affiliateUrl = (await findAffiliateLinkOnTab(tab.id)) || pageUrl;

      if (!scrape.data.needsProductPage) {
        return normalizeScrapePayload(scrape.data, affiliateUrl);
      }

      if (scrape.data.productPageUrl) {
        return scrapeAffiliateUrl(scrape.data.productPageUrl);
      }
    }
  }

  if (isAffiliateShortUrl(pageUrl)) {
    const scrape = await scrapeFullPageFromTab(tab.id);
    if (scrape.ok && scrape.data && !scrape.data.needsProductPage) {
      return normalizeScrapePayload(scrape.data, pageUrl);
    }
  }

  return scrapeAffiliateUrl(pageUrl);
}

const MultilineAffiliateScrape = {
  scrapeAffiliateUrl,
  scrapeActiveTab,
  scrapeProductPageFromTab,
  scrapeFullPageFromTab,
  waitForTabComplete,
  sleep,
};

if (typeof self !== "undefined") {
  self.MultilineAffiliateScrape = MultilineAffiliateScrape;
}

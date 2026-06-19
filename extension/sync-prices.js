const DEFAULT_API_BASE = "https://multilinemotopecas.com.br";
const SYNC_DELAY_MS = 2500;
const ML_URL_PATTERN = /mercadolivre|mercadolibre|meli\.la/i;
const ML_LOGIN_URL =
  "https://www.mercadolivre.com/jms/mlb/lgz/login?platform_id=ml&go";
const ML_LOGIN_WARMUP_MS = 800;
const ML_PRODUCT_LOAD_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getApiBaseUrl() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
  return stored.apiBaseUrl || DEFAULT_API_BASE;
}

async function getSiteCookieHeader(origin) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  const cookies = await chrome.cookies.getAll({ url: base });
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function adminApiFetch(path, options = {}) {
  const apiBase = await getApiBaseUrl();
  const cookieHeader = await getSiteCookieHeader(apiBase);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Erro HTTP ${response.status}`
    );
  }

  return data;
}

async function scrapePriceFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_ML_PRICE" });
    if (response?.ok) return response;
  } catch {
    // content script may not be ready
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["scraper.js"],
    });
  } catch {
    // scraper may already be present
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const scrapeFn =
        typeof scrapeMercadoLivreProduct === "function"
          ? scrapeMercadoLivreProduct
          : typeof window.scrapeMercadoLivreProduct === "function"
            ? window.scrapeMercadoLivreProduct
            : null;

      if (!scrapeFn) {
        return { ok: false, error: "Scraper indisponível nesta página." };
      }

      try {
        const data = scrapeFn();
        return {
          ok: true,
          price: data.price,
          promotionalPrice: data.promotionalPrice,
          sourcePageUrl: data.sourcePageUrl,
          pageTitle: data.name,
          mercadoLivreId: data.mercadoLivreId,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao ler preço.",
        };
      }
    },
  });

  return results?.[0]?.result ?? { ok: false, error: "Falha ao executar scraper." };
}

function waitForTabComplete(tabId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timeout ao carregar página do Mercado Livre."));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(listener);
      window.clearTimeout(timeout);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        window.clearTimeout(timeout);
        resolve();
      }
    }).catch(reject);
  });
}

async function navigateTabAndWait(tabId, url) {
  await chrome.tabs.update(tabId, { url });
  await waitForTabComplete(tabId);
}

async function warmUpMlLoginSession(tabId) {
  await navigateTabAndWait(tabId, ML_LOGIN_URL);
  await sleep(ML_LOGIN_WARMUP_MS);
}

async function fetchMlPriceInBrowser(sourceUrl, active = false, options = {}) {
  const existingTabId = options.existingTabId ?? null;
  const skipLogin = options.skipLogin === true;

  let tabId = existingTabId;
  let shouldCloseTab = false;

  if (!tabId) {
    const tab = await chrome.tabs.create({
      url: skipLogin ? sourceUrl : ML_LOGIN_URL,
      active,
    });
    tabId = tab.id;
    shouldCloseTab = true;

    await waitForTabComplete(tabId);

    if (!skipLogin) {
      await sleep(ML_LOGIN_WARMUP_MS);
      await navigateTabAndWait(tabId, sourceUrl);
    }
  } else if (!skipLogin) {
    await warmUpMlLoginSession(tabId);
    await navigateTabAndWait(tabId, sourceUrl);
  } else {
    await navigateTabAndWait(tabId, sourceUrl);
  }

  try {
    await sleep(ML_PRODUCT_LOAD_MS);
    return await scrapePriceFromTab(tabId);
  } finally {
    if (shouldCloseTab) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        // tab may already be closed
      }
    }
  }
}

async function syncProductOnServer(productId, scrape) {
  return adminApiFetch(`/api/admin/products/${productId}/sync-price`, {
    method: "POST",
    body: JSON.stringify({
      manualPrice: scrape.price,
      manualPromotionalPrice: scrape.promotionalPrice ?? null,
      afterBrowserValidation: true,
      browserScraped: true,
    }),
  });
}

async function syncProductByBrowser(productId, sourceUrl) {
  const scrape = await fetchMlPriceInBrowser(sourceUrl, false);
  if (!scrape?.ok || scrape.price == null) {
    throw new Error(scrape?.error || "Preço não encontrado na página do Mercado Livre.");
  }

  const result = await syncProductOnServer(productId, scrape);
  return { scrape, result };
}

function normalizeUrl(url) {
  try {
    return new URL(url).href.split("?")[0].replace(/\/$/, "");
  } catch {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

async function syncCurrentTabProduct() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !ML_URL_PATTERN.test(tab.url)) {
    throw new Error("Abra um anúncio do Mercado Livre para sincronizar o preço.");
  }

  const scrape = await scrapePriceFromTab(tab.id);
  if (!scrape?.ok || scrape.price == null) {
    throw new Error(scrape?.error || "Preço não identificado nesta página.");
  }

  const { products } = await adminApiFetch("/api/admin/products/sync-prices/candidates");
  const pageUrl = normalizeUrl(scrape.sourcePageUrl || tab.url);
  const mlbId = scrape.mercadoLivreId?.toUpperCase() ?? null;

  const match = products.find((product) => {
    if (mlbId && product.mercadoLivreId?.toUpperCase() === mlbId) return true;
    if (product.sourceUrl && normalizeUrl(product.sourceUrl) === pageUrl) return true;
    return false;
  });

  if (!match) {
    throw new Error(
      "Este anúncio não está no catálogo. Importe o produto antes de sincronizar o preço."
    );
  }

  const result = await syncProductOnServer(match.id, scrape);
  return { product: match, scrape, result };
}

async function syncAllProducts(onProgress) {
  const { products } = await adminApiFetch("/api/admin/products/sync-prices/candidates");
  const stats = {
    total: products.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    currentProductName: null,
    lastError: null,
  };

  if (products.length === 0) {
    onProgress?.({ ...stats });
    return stats;
  }

  const sessionTab = await chrome.tabs.create({ url: ML_LOGIN_URL, active: false });

  try {
    await waitForTabComplete(sessionTab.id);
    await sleep(ML_LOGIN_WARMUP_MS);

    for (const product of products) {
      stats.processed += 1;
      stats.currentProductName = product.name;
      onProgress?.({ ...stats });

      try {
        const scrape = await fetchMlPriceInBrowser(product.sourceUrl, false, {
          existingTabId: sessionTab.id,
          skipLogin: true,
        });

        if (!scrape?.ok || scrape.price == null) {
          throw new Error(scrape?.error || "Preço não encontrado na página do Mercado Livre.");
        }

        await syncProductOnServer(product.id, scrape);
        stats.succeeded += 1;
        stats.lastError = null;
      } catch (error) {
        stats.failed += 1;
        stats.lastError = error instanceof Error ? error.message : "Falha ao sincronizar";
        onProgress?.({ ...stats });
      }

      if (stats.processed < stats.total) {
        await sleep(SYNC_DELAY_MS);
      }
    }
  } finally {
    try {
      await chrome.tabs.remove(sessionTab.id);
    } catch {
      // tab may already be closed
    }
  }

  stats.currentProductName = null;
  onProgress?.({ ...stats });
  return stats;
}

const MultilinePriceSync = {
  getApiBaseUrl,
  adminApiFetch,
  scrapePriceFromTab,
  fetchMlPriceInBrowser,
  syncProductByBrowser,
  syncProductOnServer,
  syncCurrentTabProduct,
  syncAllProducts,
  sleep,
};

if (typeof self !== "undefined") {
  self.MultilinePriceSync = MultilinePriceSync;
}

if (typeof window !== "undefined") {
  window.MultilinePriceSync = MultilinePriceSync;
}

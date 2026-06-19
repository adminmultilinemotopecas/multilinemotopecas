const validationSessions = new Map();
const SESSION_STORAGE_KEY = "mlValidationSessions";

const ML_COOKIE_URLS = [
  "https://www.mercadolivre.com.br/",
  "https://produto.mercadolivre.com.br/",
  "https://mercadolivre.com.br/",
  "https://www.mercadolibre.com/",
];

const ADMIN_URL_PATTERN = /\/admin(?:\/|$)/i;
const ML_URL_PATTERN = /mercadolivre|mercadolibre|meli\.la/i;

async function loadValidationSessions() {
  try {
    const stored = await chrome.storage.session.get(SESSION_STORAGE_KEY);
    const sessions = stored[SESSION_STORAGE_KEY];
    if (!sessions || typeof sessions !== "object") return;

    validationSessions.clear();
    for (const [tabId, session] of Object.entries(sessions)) {
      validationSessions.set(Number(tabId), session);
    }
  } catch {
    // storage unavailable
  }
}

async function saveValidationSessions() {
  try {
    const sessions = Object.fromEntries(validationSessions);
    await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: sessions });
  } catch {
    // storage unavailable
  }
}

async function setValidationSession(tabId, session) {
  validationSessions.set(tabId, session);
  await saveValidationSessions();
}

async function deleteValidationSession(tabId) {
  validationSessions.delete(tabId);
  await saveValidationSessions();
}

function isAdminPageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ADMIN_URL_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

async function ensureAdminBridge(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["admin-bridge.js"],
    });
  } catch {
    // already injected or restricted
  }
}

async function injectAdminBridgeOnTab(tabId, url) {
  if (!isAdminPageUrl(url)) return;
  await ensureAdminBridge(tabId);
}

async function getAllMercadoLivreCookies() {
  const seen = new Set();
  const cookies = [];

  for (const url of ML_COOKIE_URLS) {
    const batch = await chrome.cookies.getAll({ url });
    for (const cookie of batch) {
      const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cookies.push(cookie);
    }
  }

  const domainQueries = ["mercadolivre.com.br", ".mercadolivre.com.br"];
  for (const domain of domainQueries) {
    const batch = await chrome.cookies.getAll({ domain });
    for (const cookie of batch) {
      const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cookies.push(cookie);
    }
  }

  return cookies;
}

function buildCookieHeader(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function findAdminTabs(adminOrigin) {
  const tabs = await chrome.tabs.query({});
  return tabs.filter(
    (tab) =>
      tab.id &&
      tab.url &&
      tab.url.startsWith(adminOrigin) &&
      isAdminPageUrl(tab.url)
  );
}

async function findMlTabForCapture(sourceUrl, preferredTabId) {
  if (preferredTabId) {
    try {
      const tab = await chrome.tabs.get(preferredTabId);
      if (tab?.id && tab.url && ML_URL_PATTERN.test(tab.url)) {
        return tab.id;
      }
    } catch {
      // tab closed
    }
  }

  for (const [tabId] of validationSessions) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.id && tab.url && ML_URL_PATTERN.test(tab.url)) {
        return tab.id;
      }
    } catch {
      // tab closed
    }
  }

  const tabs = await chrome.tabs.query({});
  const mlTabs = tabs.filter((tab) => tab.id && tab.url && ML_URL_PATTERN.test(tab.url));

  if (sourceUrl) {
    const normalizedSource = sourceUrl.split("?")[0];
    const match = mlTabs.find((tab) => tab.url?.split("?")[0] === normalizedSource);
    if (match?.id) return match.id;
  }

  const activeMl = mlTabs.find((tab) => tab.active);
  if (activeMl?.id) return activeMl.id;

  return mlTabs[0]?.id ?? null;
}

async function scrapePriceFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_ML_PRICE" });
    if (response?.ok) return response;
  } catch {
    // content script may not be ready yet
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["scraper.js"],
    });
  } catch {
    // scraper may already be present
  }

  try {
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
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao executar scraper.",
    };
  }
}

async function persistSessionViaAdminPage(adminOrigin, payload, notifyDetail) {
  const adminTabs = await findAdminTabs(adminOrigin);

  if (adminTabs.length === 0) {
    throw new Error(
      "Aba do admin não encontrada. Mantenha o painel admin aberto e recarregue a página."
    );
  }

  let lastError = "Não foi possível enviar sessão ao admin.";

  for (const tab of adminTabs) {
    await ensureAdminBridge(tab.id);

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "ML_SESSION_PERSIST",
        adminOrigin,
        payload,
        notifyDetail,
      });

      if (response?.ok) {
        return response;
      }

      lastError = response?.error || lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}

async function captureAndPersistSession(tabId, session) {
  if (session.persisted) {
    return { scrape: session.lastScrape, cookieCount: 0, alreadyPersisted: true };
  }

  let scrape = session.lastScrape ?? null;
  const resolvedTabId = tabId || (await findMlTabForCapture(session.sourceUrl, session.tabId));

  if (resolvedTabId) {
    try {
      const freshScrape = await scrapePriceFromTab(resolvedTabId);
      if (freshScrape?.ok) {
        scrape = freshScrape;
        session.lastScrape = freshScrape;
        session.sourceUrl = freshScrape.sourcePageUrl || session.sourceUrl;
      }
    } catch {
      // tab may be closing
    }
  }

  const cookies = await getAllMercadoLivreCookies();
  const cookieHeader = buildCookieHeader(cookies);

  if (!cookieHeader) {
    throw new Error(
      "Nenhum cookie do Mercado Livre encontrado. Conclua login/captcha na página do ML."
    );
  }

  const payload = {
    cookieHeader,
    sourceUrl: scrape?.sourcePageUrl || session.sourceUrl,
    userAgent: navigator.userAgent,
    scrapedPrice: scrape?.price ?? null,
    scrapedPromotionalPrice: scrape?.promotionalPrice ?? null,
    pageTitle: scrape?.pageTitle ?? null,
  };

  const notifyDetail = {
    sourceUrl: payload.sourceUrl || session.sourceUrl,
    hasScrapedPrice: payload.scrapedPrice != null,
    hasCookies: true,
    scrapedPrice: payload.scrapedPrice,
    scrapedPromotionalPrice: payload.scrapedPromotionalPrice,
  };

  await persistSessionViaAdminPage(session.adminOrigin, payload, notifyDetail);

  session.persisted = true;
  if (tabId) {
    await setValidationSession(tabId, session);
  }

  return { scrape, cookieCount: cookies.length };
}

async function notifyScrapeResult(adminOrigin, notifyDetail) {
  const adminTabs = await findAdminTabs(adminOrigin);
  if (adminTabs.length === 0) {
    throw new Error(
      "Aba do admin não encontrada. Mantenha o painel admin aberto e recarregue a página."
    );
  }

  let lastError = "Não foi possível enviar preço ao admin.";

  for (const tab of adminTabs) {
    await ensureAdminBridge(tab.id);
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "ML_SCRAPE_RESULT",
        notifyDetail,
      });
      if (response?.ok) return response;
      lastError = response?.error || lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}

async function closeValidationTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // tab may already be closed
  }
}

async function tryAutoCompleteValidation(tabId, session) {
  if (session.persisted || session.finalizing) return;

  const scrape = session.lastScrape;
  if (!scrape?.ok || scrape.price == null) return;

  session.finalizing = true;
  await setValidationSession(tabId, session);

  const notifyDetail = {
    sourceUrl: scrape.sourcePageUrl || session.sourceUrl,
    hasScrapedPrice: true,
    hasCookies: false,
    scrapedPrice: scrape.price,
    scrapedPromotionalPrice: scrape.promotionalPrice ?? null,
    persisted: true,
  };

  try {
    await notifyScrapeResult(session.adminOrigin, notifyDetail);
    session.persisted = true;
    await closeValidationTab(tabId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao capturar preço";
    await notifyCaptureError(session, message);
  } finally {
    await deleteValidationSession(tabId);
  }
}

async function notifyCaptureError(session, message) {
  const adminOrigin = session.adminOrigin;

  try {
    await persistSessionViaAdminPage(adminOrigin, null, {
      sourceUrl: session.sourceUrl,
      hasScrapedPrice: Boolean(session.lastScrape?.price),
      hasCookies: false,
      error: message,
    });
  } catch {
    const adminTabs = await findAdminTabs(adminOrigin);
    for (const tab of adminTabs) {
      await ensureAdminBridge(tab.id);
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "ML_SESSION_CAPTURED",
          sourceUrl: session.sourceUrl,
          hasScrapedPrice: false,
          hasCookies: false,
          error: message,
        });
      } catch {
        // ignore
      }
    }
  }
}

async function finalizeValidationTab(tabId, reason) {
  await loadValidationSessions();

  const session = validationSessions.get(tabId);
  if (!session || session.persisted || session.finalizing) return;

  session.finalizing = true;
  await setValidationSession(tabId, session);

  try {
    await captureAndPersistSession(tabId, session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao capturar sessão";
    await notifyCaptureError(session, message);
  } finally {
    await deleteValidationSession(tabId);
  }
}

async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    await injectAdminBridgeOnTab(tabId, tab.url);
  }

  if (changeInfo.status !== "complete") return;

  await loadValidationSessions();

  const session = validationSessions.get(tabId);
  if (!session || session.persisted) return;

  if (!tab.url || !ML_URL_PATTERN.test(tab.url)) return;

  try {
    const scrape = await scrapePriceFromTab(tabId);
    if (scrape?.ok && scrape.price != null) {
      session.lastScrape = scrape;
      session.sourceUrl = scrape.sourcePageUrl || session.sourceUrl;
      await setValidationSession(tabId, session);
      void tryAutoCompleteValidation(tabId, session);
      return;
    }

    if (scrape?.ok) {
      session.lastScrape = scrape;
      session.sourceUrl = scrape.sourcePageUrl || session.sourceUrl;
      await setValidationSession(tabId, session);
    }
  } catch {
    // user may still be on captcha/login
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void loadValidationSessions();
});

chrome.runtime.onStartup.addListener(() => {
  void loadValidationSessions();
});

void loadValidationSessions();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ML_VALIDATION_START") {
    const sourceUrl = message.sourceUrl;
    const adminOrigin = message.adminOrigin;

    if (!sourceUrl || !adminOrigin) {
      sendResponse({ ok: false, error: "Parâmetros inválidos." });
      return true;
    }

    void loadValidationSessions().then(() => {
      chrome.tabs.create({ url: sourceUrl, active: true }, async (tab) => {
        if (!tab?.id) {
          sendResponse({ ok: false, error: "Não foi possível abrir a aba do Mercado Livre." });
          return;
        }

        await setValidationSession(tab.id, {
          tabId: tab.id,
          adminOrigin,
          sourceUrl,
          lastScrape: null,
          persisted: false,
        });

        sendResponse({ ok: true, tabId: tab.id });
      });
    });

    return true;
  }

  if (message?.type === "ML_VALIDATION_CAPTURE_NOW") {
    void loadValidationSessions().then(async () => {
      const preferredTabId = message.tabId ?? null;
      const sessionFromMap =
        preferredTabId != null ? validationSessions.get(preferredTabId) : null;

      const adminOrigin = message.adminOrigin || sessionFromMap?.adminOrigin;
      const sourceUrl = message.sourceUrl || sessionFromMap?.sourceUrl;

      if (!adminOrigin) {
        sendResponse({ ok: false, error: "Origem do admin não informada." });
        return;
      }

      const resolvedTabId = await findMlTabForCapture(sourceUrl, preferredTabId);
      const session = sessionFromMap || {
        tabId: resolvedTabId,
        adminOrigin,
        sourceUrl,
        lastScrape: null,
        persisted: false,
      };

      try {
        const result = await captureAndPersistSession(resolvedTabId, session);
        sendResponse({ ok: true, ...result });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao capturar sessão",
        });
      }
    });

    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void handleTabUpdated(tabId, changeInfo, tab);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void finalizeValidationTab(tabId, "tab-closed");
});

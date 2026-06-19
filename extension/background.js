importScripts("affiliate-scrape.js");

const ADMIN_URL_PATTERN = /\/admin(?:\/|$)/i;

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

async function injectBridgeIntoOpenAdminTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && isAdminPageUrl(tab.url)) {
        await ensureAdminBridge(tab.id);
      }
    }
  } catch {
    // ignore
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void injectBridgeIntoOpenAdminTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void injectBridgeIntoOpenAdminTabs();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCRAPE_ACTIVE_TAB") {
    MultilineAffiliateScrape.scrapeActiveTab()
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao analisar página.",
        });
      });

    return true;
  }

  if (message?.type === "SCRAPE_AFFILIATE_URL") {
    const affiliateUrl = message.affiliateUrl;
    if (!affiliateUrl) {
      sendResponse({ ok: false, error: "Link de afiliado não informado." });
      return false;
    }

    MultilineAffiliateScrape.scrapeAffiliateUrl(affiliateUrl)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao analisar link.",
        });
      });

    return true;
  }

  if (message?.type === "ML_VALIDATION_START") {
    const sourceUrl = message.sourceUrl;
    if (!sourceUrl) {
      sendResponse({ ok: false, error: "URL não informada." });
      return false;
    }

    chrome.tabs.create({ url: sourceUrl, active: true }, (tab) => {
      if (!tab?.id) {
        sendResponse({ ok: false, error: "Não foi possível abrir a página do Mercado Livre." });
        return;
      }
      sendResponse({ ok: true, tabId: tab.id });
    });

    return true;
  }

  if (message?.type === "ML_VALIDATION_CAPTURE_NOW") {
    const sourceUrl = message.sourceUrl;
    if (!sourceUrl) {
      sendResponse({ ok: false, error: "URL não informada." });
      return false;
    }

    MultilineAffiliateScrape.scrapeAffiliateUrl(sourceUrl)
      .then((result) => {
        if (!result.ok || !result.data) {
          sendResponse({
            ok: false,
            error: result.error || "Não foi possível ler o produto.",
          });
          return;
        }

        sendResponse({
          ok: true,
          scrape: {
            price: result.data.price,
            promotionalPrice: result.data.promotionalPrice,
            sourcePageUrl: result.data.sourcePageUrl,
            pageTitle: result.data.name,
          },
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao capturar produto.",
        });
      });

    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    void injectAdminBridgeOnTab(tabId, tab.url);
  }
});

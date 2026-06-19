/**
 * Bridge entre o admin web e a extensão Chrome Multiline Motopeças.
 * Injeta API no contexto da página (main world) via script tag.
 */
(function initAdminBridgeIsolated() {
  if (globalThis.__multilineMlBridgeIsolatedInstalled) {
    return;
  }

  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return;
  }

  const pathname = window.location.pathname || "";
  if (!pathname.startsWith("/admin")) {
    return;
  }

  globalThis.__multilineMlBridgeIsolatedInstalled = true;

  const SESSION_EVENT = "multiline-ml-session-captured";
  const READY_EVENT = "multiline-ml-bridge-ready";
  const REQUEST_EVENT = "multiline-ml-bridge-request";
  const RESPONSE_EVENT = "multiline-ml-bridge-response";

  function dispatchSessionEvent(detail) {
    window.dispatchEvent(
      new CustomEvent(SESSION_EVENT, {
        detail: detail || {},
      })
    );
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;

    if (message.type === "ML_SESSION_PERSIST") {
      if (!message.payload) {
        dispatchSessionEvent(message.notifyDetail);
        sendResponse({ ok: false, error: message.notifyDetail?.error || "Falha na captura." });
        return true;
      }

      fetch(`${message.adminOrigin}/api/admin/ml-browser-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              typeof data.error === "string"
                ? data.error
                : `Falha ao salvar sessão (HTTP ${response.status}).`
            );
          }

          dispatchSessionEvent({
            ...(message.notifyDetail || {}),
            persisted: true,
          });
          sendResponse({ ok: true, data });
        })
        .catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : "Falha ao salvar sessão ML.";
          dispatchSessionEvent({
            ...(message.notifyDetail || {}),
            error: errorMessage,
            persisted: false,
          });
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "ML_SCRAPE_RESULT") {
      dispatchSessionEvent({
        ...(message.notifyDetail || {}),
        persisted: true,
      });
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "ML_SESSION_CAPTURED") {
      dispatchSessionEvent({
        sourceUrl: message.sourceUrl || null,
        hasScrapedPrice: Boolean(message.hasScrapedPrice),
        hasCookies: Boolean(message.hasCookies),
        error: message.error || null,
        persisted: false,
      });
      return false;
    }

    if (message.type === "ML_BRIDGE_PING") {
      sendResponse({ ok: true, bridge: true });
      return false;
    }

    return false;
  });

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        resolve(response ?? { ok: false, error: "Resposta vazia da extensão." });
      });
    });
  }

  async function handleBridgeRequest(detail) {
    const payload = detail.payload || {};

    switch (detail.method) {
      case "startValidation":
        return sendRuntimeMessage({
          type: "ML_VALIDATION_START",
          sourceUrl: payload.sourceUrl,
          adminOrigin: payload.adminOrigin,
        });

      case "captureNow":
        return sendRuntimeMessage({
          type: "ML_VALIDATION_CAPTURE_NOW",
          tabId: payload.tabId,
          adminOrigin: payload.adminOrigin,
          sourceUrl: payload.sourceUrl,
        });

      case "scrapeAffiliateUrl":
        return sendRuntimeMessage({
          type: "SCRAPE_AFFILIATE_URL",
          affiliateUrl: payload.affiliateUrl,
        });

      case "ping":
        return sendRuntimeMessage({ type: "ML_BRIDGE_PING" });

      default:
        return { ok: false, error: `Método desconhecido: ${detail.method}` };
    }
  }

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail;
    if (!detail?.requestId || !detail?.method) return;

    void handleBridgeRequest(detail).then((result) => {
      window.dispatchEvent(
        new CustomEvent(RESPONSE_EVENT, {
          detail: {
            requestId: detail.requestId,
            ok: Boolean(result?.ok),
            data: result,
            error: result?.error || null,
          },
        })
      );
    });
  });

  function injectPageBridge() {
    if (document.getElementById("multiline-ml-page-bridge-installed")) {
      window.dispatchEvent(new CustomEvent(READY_EVENT));
      return;
    }

    const marker = document.createElement("meta");
    marker.id = "multiline-ml-page-bridge-installed";
    marker.name = "multiline-ml-bridge";
    marker.content = "1";
    (document.head || document.documentElement).appendChild(marker);

    const script = document.createElement("script");
    script.id = "multiline-ml-page-bridge";
    script.textContent = `
(function () {
  if (window.__multilineMlPageBridgeInstalled) {
    window.dispatchEvent(new CustomEvent("${READY_EVENT}"));
    return;
  }
  window.__multilineMlPageBridgeInstalled = true;

  var REQUEST_EVENT = "${REQUEST_EVENT}";
  var RESPONSE_EVENT = "${RESPONSE_EVENT}";
  var SESSION_EVENT = "${SESSION_EVENT}";
  var READY_EVENT = "${READY_EVENT}";

  function callBridge(method, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var requestId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      var timeout = window.setTimeout(function () {
        window.removeEventListener(RESPONSE_EVENT, onResponse);
        reject(new Error("Extensão não respondeu a tempo."));
      }, timeoutMs || 120000);

      function onResponse(event) {
        var detail = event.detail || {};
        if (detail.requestId !== requestId) return;
        window.clearTimeout(timeout);
        window.removeEventListener(RESPONSE_EVENT, onResponse);
        if (detail.ok) {
          resolve(detail.data);
        } else {
          reject(new Error(detail.error || "Erro na extensão."));
        }
      }

      window.addEventListener(RESPONSE_EVENT, onResponse);
      window.dispatchEvent(
        new CustomEvent(REQUEST_EVENT, {
          detail: { requestId: requestId, method: method, payload: payload || {} },
        })
      );
    });
  }

  window.multilineMlBridge = {
    isAvailable: function () {
      return true;
    },

    startValidation: function (payload) {
      return callBridge("startValidation", payload, 60000);
    },

    captureNow: function (payload) {
      return callBridge("captureNow", payload, 60000);
    },

    scrapeAffiliateUrl: function (payload) {
      return callBridge("scrapeAffiliateUrl", payload, 120000);
    },

    onSessionCaptured: function (callback) {
      function handler(event) {
        callback(event.detail || {});
      }
      window.addEventListener(SESSION_EVENT, handler);
      return function () {
        window.removeEventListener(SESSION_EVENT, handler);
      };
    },
  };

  window.dispatchEvent(new CustomEvent(READY_EVENT));
})();
`;

    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  window.addEventListener("multiline-ml-bridge-reinject", injectPageBridge);

  if (document.documentElement) {
    injectPageBridge();
  } else {
    document.addEventListener("DOMContentLoaded", injectPageBridge, { once: true });
  }
})();

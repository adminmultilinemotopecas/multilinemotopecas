/**
 * Bridge entre o admin web e a extensão Chrome Multiline Motopeças.
 */
(function initAdminBridge() {
  if (window.__multilineMlBridgeInstalled) {
    return;
  }

  if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) {
    return;
  }

  const pathname = window.location.pathname || "";
  if (!pathname.startsWith("/admin")) {
    return;
  }

  window.__multilineMlBridgeInstalled = true;

  const EVENT_NAME = "multiline-ml-session-captured";
  const READY_EVENT = "multiline-ml-bridge-ready";

  function dispatchSessionEvent(detail) {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
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

  window.multilineMlBridge = {
    isAvailable() {
      return true;
    },

    startValidation({ sourceUrl, adminOrigin }) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "ML_VALIDATION_START",
            sourceUrl,
            adminOrigin,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response?.ok) {
              reject(new Error(response?.error || "Falha ao abrir validação ML."));
              return;
            }
            resolve(response);
          }
        );
      });
    },

    captureNow({ tabId, adminOrigin, sourceUrl }) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "ML_VALIDATION_CAPTURE_NOW",
            tabId,
            adminOrigin,
            sourceUrl,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response?.ok) {
              reject(new Error(response?.error || "Falha ao capturar sessão ML."));
              return;
            }
            resolve(response);
          }
        );
      });
    },

    onSessionCaptured(callback) {
      function handler(event) {
        callback(event.detail || {});
      }
      window.addEventListener(EVENT_NAME, handler);
      return () => window.removeEventListener(EVENT_NAME, handler);
    },
  };

  window.dispatchEvent(new CustomEvent(READY_EVENT));
})();

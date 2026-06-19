const DEFAULT_API_BASE = "https://multilinemotopecas.com.br";

const affiliateInput = document.getElementById("affiliateUrl");
const importBtn = document.getElementById("importBtn");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const previewNameEl = document.getElementById("previewName");
const previewPriceEl = document.getElementById("previewPrice");
const previewImagesEl = document.getElementById("previewImages");
const previewIdEl = document.getElementById("previewId");
const previewImageEl = document.getElementById("previewImage");
const pageHintEl = document.getElementById("pageHint");

let scrapedData = null;
let analyzeTimer = null;
let analyzing = false;

function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return "Preço não identificado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ""}`;
}

function isMercadoLivreUrl(url) {
  try {
    const parsed = new URL(url);
    return /mercadolivre|mercadolibre|meli\.la|mer\.li|merc\.li|me2\.do|merca\.do/i.test(
      parsed.hostname
    );
  } catch {
    return false;
  }
}

function clearPreview() {
  previewEl.classList.add("hidden");
  previewImageEl.classList.add("hidden");
  previewImageEl.removeAttribute("src");
}

function renderPreview(data) {
  previewEl.classList.remove("hidden");
  const imageUrl = data.images?.[0];
  if (imageUrl) {
    previewImageEl.src = imageUrl;
    previewImageEl.alt = data.name || "Produto";
    previewImageEl.classList.remove("hidden");
  } else {
    previewImageEl.removeAttribute("src");
    previewImageEl.classList.add("hidden");
  }
  previewNameEl.textContent = data.name;

  const displayPrice =
    data.promotionalPrice != null &&
    data.price != null &&
    data.promotionalPrice < data.price
      ? `${formatPrice(data.promotionalPrice)} (de ${formatPrice(data.price)})`
      : formatPrice(data.price || data.promotionalPrice);

  previewPriceEl.textContent = displayPrice;
  previewImagesEl.textContent = `${data.images.length} imagem(ns)`;
  previewIdEl.textContent = data.mercadoLivreId
    ? `ID: ${data.mercadoLivreId}`
    : "ID MLB não detectado";
}

async function getApiBaseUrl() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
  return stored.apiBaseUrl || DEFAULT_API_BASE;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function requestActiveTabScrape() {
  const response = await sendRuntimeMessage({ type: "SCRAPE_ACTIVE_TAB" });
  if (!response?.ok || !response.data) {
    throw new Error(response?.error || "Falha ao analisar a aba atual.");
  }
  return response.data;
}

async function requestAffiliateScrape(affiliateUrl) {
  const response = await sendRuntimeMessage({
    type: "SCRAPE_AFFILIATE_URL",
    affiliateUrl,
  });
  if (!response?.ok || !response.data) {
    throw new Error(response?.error || "Falha ao analisar link de afiliado.");
  }
  return response.data;
}

async function applyScrapedData(data, affiliateUrl, statusMessage) {
  scrapedData = data;
  affiliateInput.value = affiliateUrl;
  renderPreview(data);
  setStatus(statusMessage);
  importBtn.disabled = false;
  if (pageHintEl) {
    pageHintEl.textContent = "URL detectada automaticamente da aba aberta.";
  }
  await chrome.storage.sync.set({ lastAffiliateUrl: affiliateUrl });
}

async function analyzeAffiliateLink(options = {}) {
  const { preferActiveTab = false } = options;
  const manualUrl = affiliateInput.value.trim();

  if (analyzing) return;
  analyzing = true;
  importBtn.disabled = true;
  scrapedData = null;
  clearPreview();
  setStatus("Analisando página do Mercado Livre...");

  try {
    let data;

    if (preferActiveTab) {
      data = await requestActiveTabScrape();
    } else if (manualUrl) {
      if (!isMercadoLivreUrl(manualUrl)) {
        throw new Error("O link precisa ser um URL do Mercado Livre.");
      }
      data = await requestAffiliateScrape(manualUrl);
    } else {
      throw new Error("Informe o link de afiliado do Mercado Livre.");
    }

    const affiliateUrl = data.affiliateUrl || manualUrl;
    await applyScrapedData(
      data,
      affiliateUrl,
      preferActiveTab
        ? "Produto detectado automaticamente. Revise a prévia e importe."
        : "Página analisada. Revise a prévia e importe."
    );
  } catch (error) {
    setStatus(error.message || "Falha ao analisar link.", "error");
    importBtn.disabled = true;
    throw error;
  } finally {
    analyzing = false;
  }
}

async function importProduct() {
  const affiliateUrl = affiliateInput.value.trim();

  if (!affiliateUrl) {
    setStatus("Informe o link de afiliado do Mercado Livre.", "error");
    affiliateInput.focus();
    return;
  }

  if (!scrapedData) {
    setStatus("Aguarde a análise da página ou cole o link novamente.", "error");
    return;
  }

  importBtn.disabled = true;
  setStatus("Enviando produto para revisão...");

  try {
    const apiBaseUrl = await getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/extension/import-product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliateUrl,
        sourcePageUrl: scrapedData.sourcePageUrl,
        scraped: {
          name: scrapedData.name,
          mercadoLivreId: scrapedData.mercadoLivreId,
          price: scrapedData.price,
          promotionalPrice: scrapedData.promotionalPrice,
          shortDescription: scrapedData.shortDescription,
          fullDescription: scrapedData.fullDescription,
          technicalSpecs: scrapedData.technicalSpecs,
          applications: scrapedData.applications,
          compatibilities: scrapedData.compatibilities,
          productReferences: scrapedData.productReferences,
          tags: scrapedData.tags,
          images: scrapedData.images,
          stock: scrapedData.stock,
          sellerName: scrapedData.sellerName,
          condition: scrapedData.condition,
          categoryPath: scrapedData.categoryPath,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Falha ao importar produto.");
    }

    setStatus(
      `Importado com sucesso (${payload.imagesCount} imagens). Status: pendente de revisão.`,
      "success"
    );
  } catch (error) {
    setStatus(error.message || "Erro ao importar produto.", "error");
    importBtn.disabled = false;
  }
}

function scheduleAnalyze() {
  if (analyzeTimer) {
    clearTimeout(analyzeTimer);
  }

  analyzeTimer = setTimeout(() => {
    const value = affiliateInput.value.trim();
    if (value && isMercadoLivreUrl(value)) {
      void analyzeAffiliateLink();
    }
  }, 600);
}

importBtn.addEventListener("click", importProduct);
affiliateInput.addEventListener("input", scheduleAnalyze);
affiliateInput.addEventListener("change", scheduleAnalyze);
affiliateInput.addEventListener("paste", scheduleAnalyze);

document.addEventListener("DOMContentLoaded", async () => {
  setStatus("Detectando produto na aba aberta...");

  try {
    await analyzeAffiliateLink({ preferActiveTab: true });
  } catch {
    const stored = await chrome.storage.sync.get(["lastAffiliateUrl"]);
    if (stored.lastAffiliateUrl) {
      affiliateInput.value = stored.lastAffiliateUrl;
      if (pageHintEl) {
        pageHintEl.textContent = "Usando o último link salvo.";
      }
      try {
        await analyzeAffiliateLink();
      } catch {
        setStatus(
          "Abra uma página de produto do Mercado Livre e abra a extensão novamente.",
          "error"
        );
      }
    } else {
      setStatus(
        "Abra uma página de produto do Mercado Livre e abra a extensão novamente.",
        "error"
      );
    }
  }
});

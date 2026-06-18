const DEFAULT_API_BASE = "https://multilinemotopecas.com.br";

const affiliateInput = document.getElementById("affiliateUrl");
const importBtn = document.getElementById("importBtn");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const previewNameEl = document.getElementById("previewName");
const previewPriceEl = document.getElementById("previewPrice");
const previewImagesEl = document.getElementById("previewImages");
const previewIdEl = document.getElementById("previewId");

let scrapedData = null;

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
    return /mercadolivre|mercadolibre|meli\.la|me2\.do|merca\.do/i.test(
      parsed.hostname
    );
  } catch {
    return false;
  }
}

function isMercadoLivreProductTab(url) {
  try {
    const parsed = new URL(url);
    return /mercadolivre|mercadolibre/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function renderPreview(data) {
  previewEl.classList.remove("hidden");
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

async function scrapeActiveTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (typeof window.scrapeMercadoLivreProduct !== "function") {
        throw new Error(
          "Scraper não carregado. Recarregue a página do Mercado Livre e tente novamente."
        );
      }
      return window.scrapeMercadoLivreProduct();
    },
  });

  return result;
}

async function loadPagePreview() {
  setStatus("Analisando página do Mercado Livre...");
  importBtn.disabled = true;
  scrapedData = null;
  previewEl.classList.add("hidden");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      throw new Error("Não foi possível identificar a aba ativa.");
    }

    if (!isMercadoLivreProductTab(tab.url)) {
      throw new Error("Abra um anúncio do Mercado Livre antes de importar.");
    }

    scrapedData = await scrapeActiveTab(tab.id);
    renderPreview(scrapedData);
    setStatus("Página analisada. Informe o link de afiliado e importe.");
    importBtn.disabled = false;
  } catch (error) {
    setStatus(error.message || "Falha ao analisar a página.", "error");
    importBtn.disabled = true;
  }
}

async function importProduct() {
  const affiliateUrl = affiliateInput.value.trim();

  if (!affiliateUrl) {
    setStatus("Informe o link de afiliado do Mercado Livre.", "error");
    affiliateInput.focus();
    return;
  }

  if (!isMercadoLivreUrl(affiliateUrl)) {
    setStatus("O link de afiliado precisa ser um URL do Mercado Livre.", "error");
    affiliateInput.focus();
    return;
  }

  if (!scrapedData) {
    setStatus("A página ainda não foi analisada. Aguarde ou recarregue o popup.", "error");
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
    await chrome.storage.sync.set({ lastAffiliateUrl: affiliateUrl });
  } catch (error) {
    setStatus(error.message || "Erro ao importar produto.", "error");
    importBtn.disabled = false;
  }
}

async function restoreAffiliateUrl() {
  const stored = await chrome.storage.sync.get(["lastAffiliateUrl"]);
  if (stored.lastAffiliateUrl) {
    affiliateInput.value = stored.lastAffiliateUrl;
  }
}

importBtn.addEventListener("click", importProduct);
document.addEventListener("DOMContentLoaded", async () => {
  await restoreAffiliateUrl();
  await loadPagePreview();
});

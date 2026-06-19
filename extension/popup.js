const DEFAULT_API_BASE = "https://multilinemotopecas.com.br";

const affiliateInput = document.getElementById("affiliateUrl");
const importBtn = document.getElementById("importBtn");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const previewNameEl = document.getElementById("previewName");
const previewPriceEl = document.getElementById("previewPrice");
const previewImagesEl = document.getElementById("previewImages");
const previewIdEl = document.getElementById("previewId");
const importPanel = document.getElementById("importPanel");
const syncPanel = document.getElementById("syncPanel");
const syncCurrentBtn = document.getElementById("syncCurrentBtn");
const syncAllBtn = document.getElementById("syncAllBtn");
const syncStatusEl = document.getElementById("syncStatus");
const syncProgressEl = document.getElementById("syncProgress");
const footerNoteEl = document.getElementById("footerNote");
const tabButtons = document.querySelectorAll(".tab");

let scrapedData = null;
let syncProgressInterval = null;

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

function setSyncStatus(message, type = "") {
  syncStatusEl.textContent = message;
  syncStatusEl.className = `status${type ? ` ${type}` : ""}`;
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
  return MultilinePriceSync.scrapePriceFromTab(tabId).then((result) => {
    if (!result?.ok) {
      throw new Error(result?.error || "Falha ao analisar página.");
    }

    return {
      name: result.pageTitle,
      mercadoLivreId: result.mercadoLivreId,
      price: result.price,
      promotionalPrice: result.promotionalPrice,
      sourcePageUrl: result.sourcePageUrl,
      images: [],
      shortDescription: null,
      fullDescription: null,
      technicalSpecs: null,
      applications: null,
      compatibilities: null,
      productReferences: null,
      tags: [],
      stock: null,
      sellerName: null,
      condition: null,
      categoryPath: null,
    };
  });
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

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  importPanel.classList.toggle("hidden", tabName !== "import");
  syncPanel.classList.toggle("hidden", tabName !== "sync");
  footerNoteEl.innerHTML =
    tabName === "sync"
      ? "Sincronização usa cookies do <strong>Mercado Livre</strong> logado neste navegador."
      : "Produtos importados entram como <strong>pendente de revisão</strong>.";
}

function startSyncProgressPolling() {
  if (syncProgressInterval) {
    window.clearInterval(syncProgressInterval);
  }

  syncProgressInterval = window.setInterval(async () => {
    const stored = await chrome.storage.session.get(["multilineSyncAllProgress"]);
    const progress = stored.multilineSyncAllProgress;
    if (!progress) return;

    syncProgressEl.textContent = progress.currentProductName
      ? `${progress.processed}/${progress.total} — ${progress.currentProductName}`
      : `${progress.processed}/${progress.total} — Sucesso: ${progress.succeeded} · Falhas: ${progress.failed}`;
  }, 800);
}

function stopSyncProgressPolling() {
  if (syncProgressInterval) {
    window.clearInterval(syncProgressInterval);
    syncProgressInterval = null;
  }
}

async function handleSyncCurrent() {
  syncCurrentBtn.disabled = true;
  syncAllBtn.disabled = true;
  setSyncStatus("Sincronizando anúncio atual...");
  syncProgressEl.textContent = "";

  try {
    const payload = await MultilinePriceSync.syncCurrentTabProduct();
    setSyncStatus(
      `${payload.product.name}: ${payload.result.message || "Preço sincronizado."}`,
      "success"
    );
  } catch (error) {
    setSyncStatus(error.message || "Falha ao sincronizar anúncio.", "error");
  } finally {
    syncCurrentBtn.disabled = false;
    syncAllBtn.disabled = false;
  }
}

async function handleSyncAll() {
  syncCurrentBtn.disabled = true;
  syncAllBtn.disabled = true;
  setSyncStatus("Sincronizando todos os produtos via navegador...");
  syncProgressEl.textContent = "Iniciando...";
  startSyncProgressPolling();

  try {
    const stats = await MultilinePriceSync.syncAllProducts((progress) => {
      syncProgressEl.textContent = progress.currentProductName
        ? `${progress.processed}/${progress.total} — ${progress.currentProductName}`
        : `${progress.processed}/${progress.total}`;
    });

    setSyncStatus(
      `Concluído: ${stats.succeeded} sucesso · ${stats.failed} falhas de ${stats.total}.`,
      stats.failed > 0 ? "error" : "success"
    );
  } catch (error) {
    setSyncStatus(error.message || "Falha ao sincronizar todos.", "error");
  } finally {
    stopSyncProgressPolling();
    syncCurrentBtn.disabled = false;
    syncAllBtn.disabled = false;
  }
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

importBtn.addEventListener("click", importProduct);
syncCurrentBtn.addEventListener("click", handleSyncCurrent);
syncAllBtn.addEventListener("click", handleSyncAll);

document.addEventListener("DOMContentLoaded", async () => {
  await restoreAffiliateUrl();
  await loadPagePreview();
});

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeProductDescription(value?: string | null): string | null {
  if (value == null) return null;

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function formatPlainProductDescription(text: string): string {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function sanitizeLegacyProductHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

/** Converte descrição salva (texto + **negrito** ou HTML legado) para HTML seguro. */
export function formatProductDescriptionHtml(text: string): string {
  if (HTML_TAG_PATTERN.test(text)) {
    return sanitizeLegacyProductHtml(text);
  }

  return formatPlainProductDescription(text);
}

export function stripProductDescriptionMarkup(text: string): string {
  return text
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

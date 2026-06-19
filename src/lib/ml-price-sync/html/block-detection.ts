const BLOCKED_HTTP_STATUSES = new Set([403, 429, 503]);

const BLOCKED_URL_PATTERNS = [
  /account-verification/i,
  /\/gz\/captcha/i,
  /challenge-platform/i,
];

const BLOCKED_HTML_PATTERNS = [
  /account-verification/i,
  /cf-browser-verification/i,
  /unusual traffic/i,
  /tr[aá]fego\s+incomum/i,
  /g-recaptcha|hcaptcha|recaptcha/i,
  /validate\s+your\s+identity/i,
  /parece\s+que\s+esta\s+p[aá]gina\s+n[aã]o\s+existe/i,
];

const BLOCKED_MESSAGE = "Mercado Livre bloqueou ou exigiu verificação.";

export function detectMercadoLivreBlock(
  html: string,
  status: number,
  finalUrl?: string
): { blocked: boolean; message?: string } {
  if (BLOCKED_HTTP_STATUSES.has(status)) {
    return {
      blocked: true,
      message: BLOCKED_MESSAGE,
    };
  }

  if (finalUrl && BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(finalUrl))) {
    return {
      blocked: true,
      message: BLOCKED_MESSAGE,
    };
  }

  if (BLOCKED_HTML_PATTERNS.some((pattern) => pattern.test(html))) {
    return {
      blocked: true,
      message: BLOCKED_MESSAGE,
    };
  }

  return { blocked: false };
}

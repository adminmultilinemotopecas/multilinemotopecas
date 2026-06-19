const ML_VALIDATION_TTL_MS = 30 * 60 * 1000;

export interface MlBrowserSession {
  cookieHeader: string;
  userAgent: string | null;
  sourceUrl: string | null;
  scrapedPrice: number | null;
  scrapedPromotionalPrice: number | null;
  pageTitle: string | null;
  capturedAt: number;
}

const sessions = new Map<string, MlBrowserSession>();

function isExpired(session: MlBrowserSession): boolean {
  return Date.now() - session.capturedAt > ML_VALIDATION_TTL_MS;
}

export function setMlBrowserSession(
  userId: string,
  session: Omit<MlBrowserSession, "capturedAt"> & { capturedAt?: number }
) {
  sessions.set(userId, {
    ...session,
    capturedAt: session.capturedAt ?? Date.now(),
  });
}

export function getMlBrowserSession(userId: string): MlBrowserSession | null {
  const session = sessions.get(userId);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(userId);
    return null;
  }
  return session;
}

export function clearMlBrowserSession(userId: string) {
  sessions.delete(userId);
}

export function getMlBrowserSessionTtlMs() {
  return ML_VALIDATION_TTL_MS;
}

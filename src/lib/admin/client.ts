export class AdminApiError extends Error {
  code?: string;
  sourceUrl?: string | null;

  constructor(
    message: string,
    extras?: { code?: string; sourceUrl?: string | null }
  ) {
    super(message);
    this.name = "AdminApiError";
    this.code = extras?.code;
    this.sourceUrl = extras?.sourceUrl;
  }
}

export async function adminFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    sourceUrl?: string | null;
  };

  if (!response.ok) {
    throw new AdminApiError(
      typeof data.error === "string" ? data.error : "Erro na requisição",
      { code: data.code, sourceUrl: data.sourceUrl }
    );
  }

  return data as T;
}

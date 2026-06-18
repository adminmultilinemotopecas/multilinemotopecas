export class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminApiError";
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AdminApiError(
      typeof data.error === "string" ? data.error : "Erro na requisição"
    );
  }

  return data as T;
}

export const EXTENSION_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization",
};

export function extensionOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: EXTENSION_CORS_HEADERS,
  });
}

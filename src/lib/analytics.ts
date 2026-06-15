export type AnalyticsEvent =
  | { type: "purchase_click"; productId: string; productName: string; price: number }
  | { type: "product_view"; productId: string; productName: string }
  | { type: "search"; query: string; resultsCount: number }
  | { type: "share"; productId: string; platform: string }
  | { type: "whatsapp_click"; context: string };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;

  const eventMap: Record<string, string> = {
    purchase_click: "ml_purchase_click",
    product_view: "product_view",
    search: "search",
    share: "share",
    whatsapp_click: "whatsapp_click",
  };

  const eventName = eventMap[event.type];

  if (window.gtag) {
    window.gtag("event", eventName, {
      ...("productId" in event && { product_id: event.productId }),
      ...("productName" in event && { product_name: event.productName }),
      ...("price" in event && { value: event.price, currency: "BRL" }),
      ...("query" in event && { search_term: event.query }),
      ...("resultsCount" in event && { results_count: event.resultsCount }),
      ...("platform" in event && { platform: event.platform }),
      ...("context" in event && { context: event.context }),
    });
  }

  if (window.fbq && event.type === "purchase_click") {
    window.fbq("track", "InitiateCheckout", {
      content_name: "productName" in event ? event.productName : undefined,
      value: "price" in event ? event.price : undefined,
      currency: "BRL",
    });
  }

  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}

export function trackMLPurchase(
  productId: string,
  productName: string,
  price: number,
  mlUrl: string
) {
  trackEvent({ type: "purchase_click", productId, productName, price });

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "click", {
      event_category: "Mercado Livre",
      event_label: productName,
      value: price,
      transport_url: mlUrl,
    });
  }
}

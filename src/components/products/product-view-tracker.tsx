"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

interface ProductViewTrackerProps {
  productId: string;
  productName: string;
}

export function ProductViewTracker({ productId, productName }: ProductViewTrackerProps) {
  useEffect(() => {
    trackEvent({ type: "product_view", productId, productName });
  }, [productId, productName]);

  return null;
}

"use client";

import type { MultilineMlBridge } from "@/types/ml-extension-bridge";

const BRIDGE_READY_EVENT = "multiline-ml-bridge-ready";

export function getAdminOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getMlExtensionBridge() {
  if (typeof window === "undefined") return null;
  return window.multilineMlBridge?.isAvailable?.() ? window.multilineMlBridge : null;
}

export function waitForMlExtensionBridge(timeoutMs = 15000): Promise<MultilineMlBridge | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const existing = getMlExtensionBridge();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const startedAt = Date.now();

    function finish(bridge: MultilineMlBridge | null) {
      window.removeEventListener(BRIDGE_READY_EVENT, onReady);
      window.clearInterval(interval);
      resolve(bridge);
    }

    function onReady() {
      const bridge = getMlExtensionBridge();
      if (bridge) finish(bridge);
    }

    window.addEventListener(BRIDGE_READY_EVENT, onReady);

    const interval = window.setInterval(() => {
      const bridge = getMlExtensionBridge();
      if (bridge) {
        finish(bridge);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        finish(null);
      }
    }, 100);
  });
}

export async function ensureMlExtensionBridge(
  timeoutMs = 15000
): Promise<MultilineMlBridge | null> {
  const bridge = await waitForMlExtensionBridge(timeoutMs);
  if (bridge) return bridge;

  if (typeof document !== "undefined" && !document.getElementById("multiline-ml-page-bridge-installed")) {
    window.dispatchEvent(new CustomEvent("multiline-ml-bridge-reinject"));
  }

  return waitForMlExtensionBridge(3000);
}

export function subscribeMlExtensionBridge(
  callback: (bridge: MultilineMlBridge | null) => void
): () => void {
  if (typeof window === "undefined") {
    callback(null);
    return () => {};
  }

  function notify() {
    callback(getMlExtensionBridge());
  }

  notify();

  function onReady() {
    notify();
  }

  window.addEventListener(BRIDGE_READY_EVENT, onReady);

  const interval = window.setInterval(notify, 1000);

  return () => {
    window.removeEventListener(BRIDGE_READY_EVENT, onReady);
    window.clearInterval(interval);
  };
}

export type { MultilineMlBridge };

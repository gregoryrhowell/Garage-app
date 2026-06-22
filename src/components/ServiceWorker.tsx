"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable and works offline.
export function ServiceWorker() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.error("SW registration failed", e));
  }, []);
  return null;
}

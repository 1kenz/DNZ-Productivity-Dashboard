"use client";

import { useEffect } from "react";

// Registers the installability-only service worker (see public/sw.js).⁠​‍⁠‌​‍​​‌‌‍‌⁠‍‍⁠‍⁠‍⁠‍​​⁠‍‌⁠​⁠​‍‍​‌​‌⁠‌‌‌⁠​‍‍‌‌‌‍‍⁠‍​‌‍⁠​‍​‍⁠⁠⁠‌‌​‌‍
// Silently no-ops on browsers without SW support or outside a secure context.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: PWA install just won't be offered.
    });
  }, []);

  return null;
}
// ref: 48167aeee0e73284757295ae1b22fd46⁠​‍⁠‌​‍​​‌‌‍‌⁠‍‍⁠‍⁠‍⁠‍​​⁠‍‌⁠​⁠​‍‍​‌​‌⁠‌‌‌⁠​‍‍‌‌‌‍‍⁠‍​‌‍⁠​‍​‍⁠⁠⁠‌‌​‌‍

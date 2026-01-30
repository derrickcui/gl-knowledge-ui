"use client";

import { useEffect } from "react";
import { resolveLocale, setLocale, LOCALE_STORAGE_KEY } from "@/i18n";

function applyLocale(locale: string) {
  const resolved = resolveLocale(locale);
  setLocale(resolved);
  if (typeof document !== "undefined") {
    document.documentElement.lang = resolved.startsWith("zh") ? "zh" : "en";
  }
}

export default function LocaleBootstrap() {
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
        : null;
    if (stored) {
      applyLocale(stored);
    } else if (typeof navigator !== "undefined") {
      const candidate =
        navigator.languages?.[0] ??
        navigator.language ??
        "zh-CN";
      applyLocale(candidate);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LOCALE_STORAGE_KEY) return;
      applyLocale(event.newValue ?? "zh-CN");
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}

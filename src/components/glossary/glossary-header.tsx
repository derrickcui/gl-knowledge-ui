"use client";

import { useEffect, useState } from "react";
import { GlossaryTabs } from "@/components/glossary/glossary-tabs";
import {
  getLocale,
  resolveLocale,
  setLocale,
  Locale,
  LOCALE_STORAGE_KEY,
  t,
} from "@/i18n";

export function GlossaryHeader({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
        : null;
    if (stored) {
      const next = resolveLocale(stored);
      setLocale(next);
      setLocaleState(next);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LOCALE_STORAGE_KEY) return;
      const next = resolveLocale(event.newValue ?? "zh-CN");
      setLocale(next);
      setLocaleState(next);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div className="font-semibold">{t("glossary.title")}</div>
      <GlossaryTabs pendingCount={pendingCount} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  getLocale,
  LOCALE_STORAGE_KEY,
  resolveLocale,
  setLocalePreference,
  Locale,
  t,
} from "@/i18n";

export default function SettingsPage() {
  const [locale, setLocale] = useState<Locale>(getLocale());

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
        : null;
    if (stored) {
      setLocale(resolveLocale(stored));
    }
  }, []);

  return (
    <div className="p-6">
      <div className="text-xl font-semibold">{t("settings.title")}</div>
      <p className="mt-2 text-sm opacity-80">{t("settings.subtitle")}</p>
      <div className="mt-6 max-w-sm space-y-2">
        <div className="text-sm font-medium">{t("settings.language")}</div>
        <select
          className="h-9 w-full rounded-md border px-3 text-sm"
          value={locale}
          onChange={(event) => {
            const next = resolveLocale(event.target.value) as Locale;
            setLocale(next);
            setLocalePreference(next);
            window.location.reload();
          }}
        >
          <option value="zh-CN">{t("app.locale.zh")}</option>
          <option value="en-US">{t("app.locale.en")}</option>
        </select>
        <div className="text-xs text-muted-foreground">
          {t("settings.languageHint")}
        </div>
      </div>
    </div>
  );
}

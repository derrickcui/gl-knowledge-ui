import { zhCN } from "./zh-CN";
import { enUS } from "./en-US";

export type Locale = "zh-CN" | "en-US";
type Dictionary = typeof zhCN;

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

let currentLocale: Locale = "zh-CN";
export const LOCALE_STORAGE_KEY = "ui.locale";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale() {
  return currentLocale;
}

export function resolveLocale(input?: string | null): Locale {
  if (!input) return "zh-CN";
  const normalized = input.replace("_", "-").toLowerCase();
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("zh")) return "zh-CN";
  return "zh-CN";
}

export function setLocalePreference(locale: Locale) {
  setLocale(locale);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

export function t(
  key: keyof Dictionary,
  vars?: Record<string, string | number>
) {
  const dict = dictionaries[currentLocale] ?? zhCN;
  let template = dict[key] ?? String(key);
  if (!vars) return template;
  Object.entries(vars).forEach(([name, value]) => {
    template = template.replaceAll(`{${name}}`, String(value));
  });
  return template;
}

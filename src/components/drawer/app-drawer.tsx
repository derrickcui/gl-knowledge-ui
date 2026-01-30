"use client";

import { useEffect, useState } from "react";
import { useDrawerStore } from "@/store/drawer-store";
import { DrawerGroup } from "./drawer-group";
import { DrawerItem } from "./drawer-item";

import {
  Search,
  MessageSquare,
  Book,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  Languages,
} from "lucide-react";
import {
  getLocale,
  resolveLocale,
  setLocalePreference,
  Locale,
  LOCALE_STORAGE_KEY,
  t,
} from "@/i18n";

export function AppDrawer() {
  const { collapsed, toggle } = useDrawerStore();
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
    <aside
      className={[
        "h-full border-r bg-muted/30",
        collapsed ? "w-14" : "w-56",
        "transition-all duration-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 py-2">
        {!collapsed && <div className="font-semibold">Geelink</div>}

        <button
          className="rounded-md p-1 hover:bg-accent"
          onClick={toggle}
          type="button"
          title={collapsed ? t("drawer.expand") : t("drawer.collapse")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="px-2 space-y-1">
        <DrawerItem
          href="/search"
          label={t("drawer.search")}
          icon={<Search className="h-4 w-4" />}
          collapsed={collapsed}
        />

        <DrawerItem
          href="/chat"
          label={t("drawer.chat")}
          icon={<MessageSquare className="h-4 w-4" />}
          collapsed={collapsed}
        />

        <DrawerGroup
          label={t("drawer.knowledgeAssets")}
          icon={<Book className="h-4 w-4" />}
          collapsed={collapsed}
          defaultOpen
        >
          <DrawerItem
            href="/knowledge/glossary/candidates"
            label={t("drawer.glossary")}
            icon={<Layers className="h-4 w-4" />}
            collapsed={collapsed}
            nested
          />

          <DrawerItem
            href="/knowledge/topics"
            label={t("drawer.topics")}
            icon={<Layers className="h-4 w-4" />}
            collapsed={collapsed}
            nested
          />
        </DrawerGroup>

        <DrawerItem
          href="/settings"
          label={t("drawer.settings")}
          icon={<Settings className="h-4 w-4" />}
          collapsed={collapsed}
        />
      </nav>

      <div className="mt-auto px-2 pb-3 pt-4">
        <div
          className={[
            "flex items-center gap-2 rounded-md border bg-white px-2 py-2 text-sm",
            collapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 text-slate-600">
            <Languages className="h-4 w-4" />
            {!collapsed && <span>{t("drawer.language")}</span>}
          </div>
          {!collapsed && (
            <select
              className="h-7 rounded-md border bg-white px-2 text-xs"
              value={locale}
              onChange={(event) => {
                const next = resolveLocale(event.target.value) as Locale;
                setLocale(next);
                setLocalePreference(next);
                window.location.reload();
              }}
              aria-label={t("drawer.language")}
            >
              <option value="zh-CN">{t("app.locale.zh")}</option>
              <option value="en-US">{t("app.locale.en")}</option>
            </select>
          )}
        </div>
      </div>
    </aside>
  );
}

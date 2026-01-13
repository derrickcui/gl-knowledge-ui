"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href?: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
  children?: NavItem[];
};

const primaryItems: NavItem[] = [
  { label: "Search", href: "/search", icon: "S" },
  { label: "Chat", href: "/chat", icon: "C" },
  {
    label: "Knowledge Assets",
    icon: "K",
    children: [
      {
        label: "Glossary",
        href: "/knowledge/glossary",
        icon: "G",
        children: [
          { label: "Candidates", href: "/knowledge/glossary/candidates", icon: "C" },
          { label: "Published", href: "/knowledge/glossary/published", icon: "P" },
          { label: "Audit", href: "/knowledge/glossary/audit", icon: "A" },
        ],
      },
      { label: "Topics", href: "/knowledge/topics", icon: "T", badge: "Soon", disabled: true },
      { label: "Rules (GQL)", href: "/knowledge/rules", icon: "R", badge: "Future", disabled: true },
    ],
  },
  { label: "Settings", href: "/settings", icon: "S" },
];

const isActivePath = (pathname: string, href?: string) => {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const renderLink = (
  item: NavItem,
  pathname: string,
  collapsed: boolean,
  indent: boolean,
  keyPrefix: string
) => {
  const active = isActivePath(pathname, item.href);
  const baseClass =
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition" +
    (active ? " bg-slate-800 text-white" : " text-slate-300 hover:bg-slate-900");
  const content = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold">
        {item.icon}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {item.badge}
            </span>
          )}
        </span>
      )}
    </>
  );

  if (item.disabled || !item.href) {
    return (
      <div
        key={`${keyPrefix}-${item.label}`}
        className={`${baseClass} ${indent ? "ml-4" : ""} cursor-not-allowed opacity-60`}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      key={`${keyPrefix}-${item.label}`}
      href={item.href}
      className={`${baseClass} ${indent ? "ml-4" : ""}`}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </Link>
  );
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navTree = useMemo(() => {
    return primaryItems.map((item) => {
      if (!item.children) return { item, children: [] as NavItem[] };
      if (!item.children.some((child) => child.href && pathname.startsWith(child.href))) {
        return { item, children: item.children }; // keep group visible
      }
      return { item, children: item.children };
    });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 text-xs text-slate-200 hover:bg-slate-900"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? ">" : "<"}
        </button>
        <div className="ml-3 text-sm font-semibold tracking-wide text-slate-100">Glossary and Topics</div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:block">Knowledge Ops</span>
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900">
            New Entry
          </button>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`min-h-[calc(100vh-3.5rem)] border-r border-slate-800 bg-slate-950 px-2 py-4 transition-all duration-200 ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <nav className="space-y-2">
            {navTree.map(({ item, children }, index) => {
              const hasChildren = Boolean(item.children?.length);
              const showChildren = hasChildren;
              return (
                <div key={`group-${index}`} className="space-y-1">
                  {item.href ? (
                    renderLink(item, pathname, collapsed, false, "primary")
                  ) : (
                    <div className="px-3 pt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {!collapsed ? item.label : item.icon}
                    </div>
                  )}

                  {showChildren &&
                    children.map((child) => {
                      const childLinks = [renderLink(child, pathname, collapsed, false, "child")];
                      if (!collapsed && child.children && pathname.startsWith(child.href || "")) {
                        childLinks.push(
                          <div key={`sub-${child.label}`} className="space-y-1">
                            {child.children.map((grand) => renderLink(grand, pathname, collapsed, true, "grand"))}
                          </div>
                        );
                      }
                      return childLinks;
                    })}
                </div>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drawer hints</div>
              <div className="mt-2">Hover icons for tooltips. Expand to reveal glossary sections.</div>
            </div>
          )}
        </aside>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


"use client";

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
  ChevronRight
} from "lucide-react";

export function AppDrawer() {
  const { collapsed, toggle } = useDrawerStore();

  return (
    <aside
      className={[
        "h-full border-r bg-muted/30",
        collapsed ? "w-14" : "w-56",
        "transition-all duration-200"
      ].join(" ")}
    >
      {/* 顶部：Logo + 折叠按钮 */}
      <div className="flex items-center justify-between px-3 py-2">
        {!collapsed && <div className="font-semibold">Geelink</div>}

        <button
          className="rounded-md p-1 hover:bg-accent"
          onClick={toggle}
          type="button"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 主导航 */}
      <nav className="px-2 space-y-1">
        <DrawerItem
          href="/search"
          label="Search"
          icon={<Search className="h-4 w-4" />}
          collapsed={collapsed}
        />

        <DrawerItem
          href="/chat"
          label="Chat"
          icon={<MessageSquare className="h-4 w-4" />}
          collapsed={collapsed}
        />

        <DrawerGroup
          label="Knowledge Assets"
          icon={<Book className="h-4 w-4" />}
          collapsed={collapsed}
          defaultOpen
        >
          <DrawerItem
            href="/knowledge/glossary/candidates"
            label="Glossary"
            icon={<Layers className="h-4 w-4" />}
            collapsed={collapsed}
            nested
          />

          <DrawerItem
            href="/knowledge/topics"
            label="Topics"
            icon={<Layers className="h-4 w-4 opacity-60" />}
            collapsed={collapsed}
            nested
            disabled
          />
        </DrawerGroup>

        <DrawerItem
          href="/settings"
          label="Settings"
          icon={<Settings className="h-4 w-4" />}
          collapsed={collapsed}
        />
      </nav>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function DrawerGroup(props: {
  label: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const { label, icon, collapsed, children, defaultOpen = true } = props;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
        )}
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? label : undefined}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-5 w-5 items-center justify-center">
            {icon}
          </span>
          {!collapsed && <span className="truncate">{label}</span>}
        </div>

        {!collapsed && (
          <span className={cn("text-xs opacity-60", open ? "rotate-180" : "")}>
            ▼
          </span>
        )}
      </button>

      {!collapsed && open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

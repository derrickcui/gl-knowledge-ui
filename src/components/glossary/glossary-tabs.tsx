"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActivePath(current: string, href: string) {
  if (current === href) return true;
  return current.startsWith(`${href}/`);
}

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1 text-sm transition ${
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}

export function GlossaryTabs({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/knowledge/glossary/candidates", label: "Candidates" },
    {
      href: "/knowledge/glossary/approvals",
      label: (
        <span className="inline-flex items-center gap-2">
          <span>Approvals</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
              {pendingCount}
            </span>
          )}
        </span>
      ),
    },
    { href: "/knowledge/glossary/published", label: "Publish" },
    {
      href: "/knowledge/glossary/knowbase",
      label: "Knowbase (Published)",
    },
    { href: "/knowledge/glossary/audit", label: "Audit" },
  ];

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <Tab
          key={tab.href}
          href={tab.href}
          label={tab.label}
          active={isActivePath(pathname, tab.href)}
        />
      ))}
    </div>
  );
}

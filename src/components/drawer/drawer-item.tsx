import Link from "next/link";
import { cn } from "@/lib/cn";

export function DrawerItem(props: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
  nested?: boolean;
  disabled?: boolean;
}) {
  const { href, label, icon, collapsed, nested, disabled } = props;

  return (
    <Link
      href={disabled ? "#" : href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent",
        nested && "ml-4",
        disabled && "pointer-events-none opacity-40"
      )}
      title={collapsed ? label : undefined}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">
        {icon}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

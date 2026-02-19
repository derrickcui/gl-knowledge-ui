import { LoaderCircle, Search } from "lucide-react";
import clsx from "clsx";

export function SearchLoadingIndicator({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "inline-flex items-center gap-2 rounded-md border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-3 py-2 text-xs font-medium text-sky-800 shadow-sm",
        className
      )}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Search className="h-4 w-4 text-sky-600" />
        <LoaderCircle className="absolute -right-1 -top-1 h-3 w-3 animate-spin text-cyan-500" />
      </span>
      <span>{text}</span>
    </div>
  );
}

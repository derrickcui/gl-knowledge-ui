import clsx from "clsx";

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "concept" | "keyword" | "evidence" | "default";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-green-100 text-green-700": variant === "concept",
          "bg-purple-100 text-purple-700": variant === "keyword",
          "bg-blue-100 text-blue-700": variant === "evidence",
          "bg-gray-100 text-gray-700": variant === "default",
        }
      )}
    >
      {children}
    </span>
  );
}

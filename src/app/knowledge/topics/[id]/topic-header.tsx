export function TopicHeader({
  name,
  status,
  description,
}: {
  name: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Topics
          </div>
          <div className="mt-1 text-xl font-semibold">
            {name}
          </div>
          {description && (
            <div className="mt-2 text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

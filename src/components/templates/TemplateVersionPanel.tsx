"use client";

export type TemplateVersionItem = {
  version: string;
  status: string;
  updatedAt?: string | null;
};

function getStatusLabel(status: string) {
  const normalized = String(status).toUpperCase();
  if (normalized === "PUBLISHED") return "已发布";
  if (normalized === "DEPRECATED") return "已废弃";
  return "草稿";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function TemplateVersionPanel({
  versions,
  activeVersion,
  busy = false,
  onCreateVersion,
  onPublish,
  onDeprecate,
}: {
  versions: TemplateVersionItem[];
  activeVersion: string | null;
  busy?: boolean;
  onCreateVersion: () => void;
  onPublish: (version: string) => void;
  onDeprecate: (version: string) => void;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">版本管理</div>
        <button
          type="button"
          className="h-8 rounded-md border px-3 text-xs"
          disabled={busy}
          onClick={onCreateVersion}
        >
          新建版本
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {versions.length === 0 && (
          <div className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
            暂无版本
          </div>
        )}
        {versions.map((item) => {
          const isActive = activeVersion === item.version;
          return (
            <div
              key={item.version}
              className={`rounded-md border px-3 py-2 ${isActive ? "bg-slate-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  v{item.version} {getStatusLabel(item.status)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-7 rounded border px-2 text-xs"
                    disabled={busy}
                    onClick={() => onPublish(item.version)}
                  >
                    发布
                  </button>
                  <button
                    type="button"
                    className="h-7 rounded border px-2 text-xs"
                    disabled={busy}
                    onClick={() => onDeprecate(item.version)}
                  >
                    废弃
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                更新时间: {formatDateTime(item.updatedAt)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { t } from "@/i18n";

export function CoveragePage({
  rows,
  onSelect,
  dedup,
  onToggleDedup,
}: {
  rows: Array<{ nodeId?: string; name: string; hitDocs: number }>;
  onSelect: (row: { nodeId?: string; name: string; hitDocs: number }) => void;
  dedup: boolean;
  onToggleDedup: (next: boolean) => void;
}) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("topicSet.analytics.coverage")}</h2>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={dedup}
            onChange={(event) => onToggleDedup(event.target.checked)}
          />
          {t("topicSet.coverage.dedup")}
        </label>
      </div>
      <div className="mt-3 space-y-3">
        {rows.map((row) => {
          const width = Math.max(8, Math.min(100, row.hitDocs / 2));
          return (
            <button
              key={`${row.nodeId ?? row.name}`}
              type="button"
              className="w-full text-left"
              onClick={() => onSelect(row)}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{row.name}</span>
                <span>{row.hitDocs}</span>
              </div>
              <div className="h-2 rounded bg-muted">
                <div className="h-2 rounded bg-black" style={{ width: `${width}%` }} />
              </div>
            </button>
          );
        })}
        {rows.length === 0 && <div className="text-xs text-muted-foreground">{t("topicSet.analytics.empty")}</div>}
      </div>
    </section>
  );
}

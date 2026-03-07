"use client";

import { t } from "@/i18n";

export function CoveragePage({
  rows,
  selectedRow,
  selectedTopics,
  selectedPath,
  selectedTopicsLoading = false,
  selectedTopicsError = null,
  onSelect,
  onOpenTopicDocs,
  onOpenImpact,
  dedup,
  onToggleDedup,
}: {
  rows: Array<{ nodeId?: string; name: string; hitDocs: number }>;
  selectedRow?: { nodeId?: string; name: string; hitDocs: number } | null;
  selectedTopics: Array<{ topicId: string; topicName?: string | null; hitDocs?: number }>;
  selectedPath?: string | null;
  selectedTopicsLoading?: boolean;
  selectedTopicsError?: string | null;
  onSelect: (row: { nodeId?: string; name: string; hitDocs: number }) => void;
  onOpenTopicDocs: (topicId: string, topicName?: string | null) => void;
  onOpenImpact: () => void;
  dedup: boolean;
  onToggleDedup: (next: boolean) => void;
}) {
  const maxDocs = Math.max(1, ...rows.map((row) => row.hitDocs));
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
      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {rows.map((row) => {
            const width = Math.max(8, Math.min(100, (row.hitDocs / maxDocs) * 100));
            const active = selectedRow?.nodeId === row.nodeId && selectedRow?.name === row.name;
            return (
              <button
                key={`${row.nodeId ?? row.name}`}
                type="button"
                className={`w-full rounded-md border px-3 py-3 text-left ${active ? "border-black bg-muted/30" : "hover:bg-muted/20"}`}
                onClick={() => onSelect(row)}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{row.name}</span>
                  <span>
                    {row.hitDocs} {t("topicSet.tree.docs")}
                  </span>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-black" style={{ width: `${width}%` }} />
                </div>
              </button>
            );
          })}
          {rows.length === 0 && <div className="text-xs text-muted-foreground">{t("topicSet.analytics.empty")}</div>}
        </div>

        <aside className="rounded-lg border bg-slate-50/60 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t("topicSet.coverage.nodeCoverage")}
          </div>
          {!selectedRow ? (
            <div className="mt-4 text-sm text-muted-foreground">{t("topicSet.coverage.selectNode")}</div>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-base font-semibold">{selectedRow.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{selectedPath || "-"}</div>
              </div>
              <div className="rounded-lg border bg-white px-3 py-3">
                <div className="text-[11px] text-muted-foreground">{t("topicSet.coverage.documents")}</div>
                <div className="mt-1 text-lg font-semibold">{selectedRow.hitDocs}</div>
              </div>
              <div>
                <div className="mb-2 text-[11px] text-muted-foreground">{t("topicSet.coverage.topics")}</div>
                <div className="space-y-2">
                  {selectedTopicsLoading && (
                    <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  )}
                  {!selectedTopicsLoading && selectedTopicsError && (
                    <div className="rounded-md border border-dashed px-3 py-3 text-xs text-rose-700">
                      {selectedTopicsError}
                    </div>
                  )}
                  {!selectedTopicsLoading && !selectedTopicsError && selectedTopics.map((topic) => (
                    <div key={topic.topicId} className="rounded-md border bg-white px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{topic.topicName ?? topic.topicId}</span>
                        <span className="shrink-0 text-muted-foreground">{topic.hitDocs ?? 0}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-[11px]"
                          onClick={() => onOpenTopicDocs(topic.topicId, topic.topicName)}
                        >
                          {t("topicSet.binding.viewDocs")}
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-[11px]"
                          onClick={onOpenImpact}
                        >
                          {t("topicSet.map.viewImpact")}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!selectedTopicsLoading && !selectedTopicsError && selectedTopics.length === 0 && (
                    <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                      {t("topicSet.binding.empty")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

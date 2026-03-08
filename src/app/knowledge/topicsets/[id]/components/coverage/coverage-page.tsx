"use client";

import { t } from "@/i18n";

type CoverageRow = { nodeId?: string; name: string; hitDocs: number; topics?: number };
type CoverageTopicRow = { topicId: string; topicName?: string | null; hitDocs?: number };
type LowCoverageRow = { nodeId: string; name: string; hitDocs: number; topicCount: number };
type OverlapRow = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
  docsPath?: string | null;
  explainPathTemplate?: string | null;
};

export function CoveragePage({
  dashboard,
  rows,
  selectedRow,
  selectedTopics,
  selectedPath,
  selectedTopicsLoading = false,
  selectedTopicsError = null,
  lowCoverageRows,
  lowCoverageThreshold,
  overlapRows,
  onSelect,
  onOpenNode,
  onViewOverlapDocs,
  onOpenTopicDocs,
  onOpenImpact,
  dedup,
  onToggleDedup,
}: {
  dashboard: {
    totalDocs: number;
    classifiedDocs: number;
    unmappedDocs: number;
    nodes: number;
    topics: number;
  } | null;
  rows: CoverageRow[];
  selectedRow?: CoverageRow | null;
  selectedTopics: CoverageTopicRow[];
  selectedPath?: string | null;
  selectedTopicsLoading?: boolean;
  selectedTopicsError?: string | null;
  lowCoverageRows: LowCoverageRow[];
  lowCoverageThreshold: number;
  overlapRows: OverlapRow[];
  onSelect: (row: CoverageRow) => void;
  onOpenNode: (nodeId: string) => void;
  onViewOverlapDocs: (row: OverlapRow) => void;
  onOpenTopicDocs: (topicId: string, topicName?: string | null) => void;
  onOpenImpact: () => void;
  dedup: boolean;
  onToggleDedup: (next: boolean) => void;
}) {
  const maxDocs = Math.max(1, ...rows.map((row) => row.hitDocs));

  return (
    <section className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("topicSet.coverage.dashboard")}</h2>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={dedup}
              onChange={(event) => onToggleDedup(event.target.checked)}
            />
            {t("topicSet.coverage.dedup")}
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard label={t("topicSet.analytics.kpiTotalDocs")} value={dashboard?.totalDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiCoveredDocs")} value={dashboard?.classifiedDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiUnmappedDocs")} value={dashboard?.unmappedDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiCoveredNodes")} value={dashboard?.nodes ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiTrackedTopics")} value={dashboard?.topics ?? 0} />
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("topicSet.coverage.nodeCoverage")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span>{row.name}</span>
                    <span className="shrink-0">
                      {row.hitDocs} {t("topicSet.coverage.docsUnit")} ({row.topics ?? 0} {t("topicSet.coverage.topicsUnit")})
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-white px-3 py-3">
                    <div className="text-[11px] text-muted-foreground">{t("topicSet.coverage.documents")}</div>
                    <div className="mt-1 text-lg font-semibold">{selectedRow.hitDocs}</div>
                  </div>
                  <div className="rounded-lg border bg-white px-3 py-3">
                    <div className="text-[11px] text-muted-foreground">{t("topicSet.coverage.topics")}</div>
                    <div className="mt-1 text-lg font-semibold">{selectedRow.topics ?? selectedTopics.length}</div>
                  </div>
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

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {t("topicSet.analytics.lowCoverageTitle", { threshold: lowCoverageThreshold })}
          </h2>
        </div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t("topicSet.coverage.columnNode")}</th>
                <th className="px-3 py-2">{t("topicSet.coverage.documents")}</th>
                <th className="px-3 py-2">{t("topicSet.unmapped.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {lowCoverageRows.map((row) => (
                <tr key={row.nodeId} className="border-b">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.hitDocs}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => onOpenNode(row.nodeId)}
                    >
                      {t("topicSet.coverage.openNode")}
                    </button>
                  </td>
                </tr>
              ))}
              {lowCoverageRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                    {t("topicSet.analytics.noLowCoverage")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("topicSet.analytics.overlapTitle")}</h2>
        </div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t("common.topic")} A</th>
                <th className="px-3 py-2">{t("common.topic")} B</th>
                <th className="px-3 py-2">{t("topicSet.analytics.columnOverlapDocs")}</th>
                <th className="px-3 py-2">{t("topicSet.unmapped.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {overlapRows.map((row) => (
                <tr key={`${row.topicAId}:${row.topicBId}`} className="border-b">
                  <td className="px-3 py-2">{row.topicAName ?? row.topicAId}</td>
                  <td className="px-3 py-2">{row.topicBName ?? row.topicBId}</td>
                  <td className="px-3 py-2">{row.overlapDocs}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => onViewOverlapDocs(row)}
                    >
                      {t("topicSet.coverage.viewDocs")}
                    </button>
                  </td>
                </tr>
              ))}
              {overlapRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    {t("topicSet.analytics.noOverlap")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-slate-50/60 p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

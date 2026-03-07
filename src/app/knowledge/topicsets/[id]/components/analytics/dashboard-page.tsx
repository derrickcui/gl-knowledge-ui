"use client";

import { t } from "@/i18n";

type CoverageRow = { nodeId?: string; name: string; hitDocs: number };
type TopicRow = { topicId: string; topicName: string; hitDocs: number; nodeCount?: number; nodeIds?: string[] };
type EmptyLeafRow = { nodeId: string; name: string; path?: string | null };

export function DashboardPage({
  coverageRows,
  summary,
  unmappedTotal,
  unmappedDocs,
  topicRows,
  topicDistributionLoading = false,
  topicDistributionError = null,
  topicDistributionDedup = false,
  emptyLeafRows,
  onOpenCoverage,
  onOpenUnmapped,
  onOpenTopicDocs,
  onOpenTaxonomy,
  onToggleTopicDistributionDedup,
}: {
  coverageRows: CoverageRow[];
  summary: {
    coveredDocs: number;
    coveredNodes: number;
    trackedTopics: number;
    emptyLeaves: number;
  };
  unmappedTotal: number;
  unmappedDocs: Array<{ docId: string; title?: string | null }>;
  topicRows: TopicRow[];
  topicDistributionLoading?: boolean;
  topicDistributionError?: string | null;
  topicDistributionDedup?: boolean;
  emptyLeafRows: EmptyLeafRow[];
  onOpenCoverage: (row?: CoverageRow) => void;
  onOpenUnmapped: () => void;
  onOpenTopicDocs: (topicId: string, topicName: string) => void;
  onOpenTaxonomy: (nodeId: string) => void;
  onToggleTopicDistributionDedup?: (next: boolean) => void;
}) {
  const coverageMax = Math.max(1, ...coverageRows.map((row) => row.hitDocs));

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="text-sm font-semibold">{t("topicSet.analytics.dashboardTitle")}</h2>

      <div className="mt-4 space-y-4">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-[11px] text-muted-foreground">{t("topicSet.analytics.kpiCoveredDocs")}</div>
            <div className="mt-1 text-2xl font-semibold">{summary.coveredDocs}</div>
          </div>
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-[11px] text-muted-foreground">{t("topicSet.analytics.kpiCoveredNodes")}</div>
            <div className="mt-1 text-2xl font-semibold">{summary.coveredNodes}</div>
          </div>
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-[11px] text-muted-foreground">{t("topicSet.analytics.kpiTrackedTopics")}</div>
            <div className="mt-1 text-2xl font-semibold">{summary.trackedTopics}</div>
          </div>
          <div className="rounded-xl border bg-amber-50 p-4">
            <div className="text-[11px] text-amber-700">{t("topicSet.analytics.kpiEmptyLeaves")}</div>
            <div className="mt-1 text-2xl font-semibold text-amber-900">{summary.emptyLeaves}</div>
          </div>
        </section>

        <section className="rounded-xl border bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">{t("topicSet.analytics.coverageOverview")}</div>
            <button
              type="button"
              className="rounded border bg-white px-2 py-1 text-xs"
              onClick={() => onOpenCoverage()}
            >
              {t("topicSet.analytics.openCoverage")}
            </button>
          </div>
          <div className="space-y-3">
            {coverageRows.slice(0, 6).map((row) => {
              const width = Math.max(8, Math.min(100, (row.hitDocs / coverageMax) * 100));
              return (
                <button
                  key={`${row.nodeId ?? row.name}`}
                  type="button"
                  className="w-full rounded-md border bg-white px-3 py-3 text-left hover:bg-muted/20"
                  onClick={() => onOpenCoverage(row)}
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
            {coverageRows.length === 0 && (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                {t("topicSet.analytics.empty")}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">{t("topicSet.unmapped.title")}</div>
            <button
              type="button"
              className="rounded border bg-white px-2 py-1 text-xs"
              onClick={onOpenUnmapped}
            >
              {t("topicSet.map.openUnmapped")}
            </button>
          </div>
          <div className="rounded-md border bg-white px-4 py-4">
            <div className="text-2xl font-semibold">{unmappedTotal}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("topicSet.unmapped.total", { count: unmappedTotal })}
            </div>
            {unmappedDocs.length > 0 && (
              <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {unmappedDocs.slice(0, 3).map((doc) => (
                  <div key={doc.docId} className="truncate">
                    {doc.title || doc.docId}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">{t("topicSet.analytics.topicDistribution")}</div>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={topicDistributionDedup}
                onChange={(event) => onToggleTopicDistributionDedup?.(event.target.checked)}
              />
              {t("topicSet.analytics.distributionDedup")}
            </label>
          </div>
          <div className="overflow-hidden rounded-md border bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">{t("common.topic")}</th>
                  <th className="px-3 py-2">{t("topicSet.analytics.columnDocs")}</th>
                  <th className="px-3 py-2">{t("topicSet.analytics.columnNodes")}</th>
                  <th className="px-3 py-2">{t("topicSet.unmapped.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {topicDistributionLoading && (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                      {t("common.loading")}
                    </td>
                  </tr>
                )}
                {!topicDistributionLoading && topicDistributionError && (
                  <tr>
                    <td className="px-3 py-4 text-rose-700" colSpan={4}>
                      {topicDistributionError}
                    </td>
                  </tr>
                )}
                {!topicDistributionLoading && !topicDistributionError && topicRows.slice(0, 8).map((topic) => (
                  <tr key={topic.topicId} className="border-b">
                    <td className="px-3 py-2">{topic.topicName}</td>
                    <td className="px-3 py-2">{topic.hitDocs}</td>
                    <td className="px-3 py-2">{topic.nodeCount ?? 0}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => onOpenTopicDocs(topic.topicId, topic.topicName)}
                      >
                        {t("topicSet.binding.viewDocs")}
                      </button>
                    </td>
                  </tr>
                ))}
                {!topicDistributionLoading && !topicDistributionError && topicRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                      {t("topicSet.analytics.noTopicDistribution")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-amber-50/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-amber-900">{t("topicSet.analytics.emptyLeavesTitle")}</div>
            <button
              type="button"
              className="rounded border bg-white px-2 py-1 text-xs"
              onClick={() => onOpenCoverage()}
            >
              {t("topicSet.analytics.openCoverage")}
            </button>
          </div>
          <div className="space-y-2">
            {emptyLeafRows.slice(0, 6).map((row) => (
              <button
                key={row.nodeId}
                type="button"
                className="block w-full rounded-md border bg-white px-3 py-2 text-left text-xs hover:bg-muted/20"
                onClick={() => onOpenTaxonomy(row.nodeId)}
              >
                <div className="font-medium">{row.name}</div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">{row.path || row.nodeId}</div>
              </button>
            ))}
            {emptyLeafRows.length === 0 && (
              <div className="rounded-md border border-dashed bg-white px-3 py-3 text-xs text-muted-foreground">
                {t("topicSet.analytics.noEmptyLeaves")}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

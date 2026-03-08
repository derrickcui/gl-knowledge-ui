"use client";

import { t } from "@/i18n";

type CoverageRow = { nodeId?: string; name: string; hitDocs: number; topics?: number };
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

export function GovernanceDashboardPage({
  topicSetName,
  coverage,
  coverageRows,
  lowCoverageRows,
  overlapRows,
  unmapped,
  onOpenCoverageNode,
  onOpenLowCoverageNode,
  onOpenOverlapDocs,
  onOpenUnmapped,
}: {
  topicSetName?: string | null;
  coverage: {
    totalDocs: number;
    classifiedDocs: number;
    unmappedDocs: number;
    nodes: number;
    topics: number;
  } | null;
  coverageRows: CoverageRow[];
  lowCoverageRows: LowCoverageRow[];
  overlapRows: OverlapRow[];
  unmapped: {
    unmappedDocs: number;
    sampleDocuments: Array<{ docId: string; title?: string | null }>;
  } | null;
  onOpenCoverageNode: (row: CoverageRow) => void;
  onOpenLowCoverageNode: (nodeId: string) => void;
  onOpenOverlapDocs: (row: OverlapRow) => void;
  onOpenUnmapped: () => void;
}) {
  const maxDocs = Math.max(1, ...coverageRows.map((row) => row.hitDocs));

  return (
    <section className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">{t("topicSet.dashboard.title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("topicSet.dashboard.topicSet")}: {topicSetName || "-"}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 text-sm font-semibold">{t("topicSet.coverage.dashboard")}</div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard label={t("topicSet.analytics.kpiTotalDocs")} value={coverage?.totalDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiCoveredDocs")} value={coverage?.classifiedDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiUnmappedDocs")} value={coverage?.unmappedDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiCoveredNodes")} value={coverage?.nodes ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiTrackedTopics")} value={coverage?.topics ?? 0} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">{t("topicSet.dashboard.coverageDistribution")}</div>
          <div className="space-y-3">
            {coverageRows.slice(0, 8).map((row) => {
              const width = Math.max(8, Math.min(100, (row.hitDocs / maxDocs) * 100));
              return (
                <button
                  key={`${row.nodeId ?? row.name}`}
                  type="button"
                  className="w-full rounded-md border px-3 py-3 text-left hover:bg-muted/20"
                  onClick={() => onOpenCoverageNode(row)}
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
            {coverageRows.length === 0 && (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                {t("topicSet.analytics.empty")}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">{t("topicSet.analytics.lowCoverageTitle", { threshold: 3 })}</div>
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
                {lowCoverageRows.slice(0, 8).map((row) => (
                  <tr key={row.nodeId} className="border-b">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.hitDocs}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => onOpenLowCoverageNode(row.nodeId)}
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
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 text-sm font-semibold">{t("topicSet.analytics.overlapTitle")}</div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t("topicSet.dashboard.topicA")}</th>
                <th className="px-3 py-2">{t("topicSet.dashboard.topicB")}</th>
                <th className="px-3 py-2">{t("topicSet.analytics.columnOverlapDocs")}</th>
                <th className="px-3 py-2">{t("topicSet.unmapped.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {overlapRows.slice(0, 8).map((row) => (
                <tr key={`${row.topicAId}:${row.topicBId}`} className="border-b">
                  <td className="px-3 py-2">{row.topicAName ?? row.topicAId}</td>
                  <td className="px-3 py-2">{row.topicBName ?? row.topicBId}</td>
                  <td className="px-3 py-2">{row.overlapDocs}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => onOpenOverlapDocs(row)}
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

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">{t("topicSet.unmapped.title")}</div>
        <div className="text-sm text-muted-foreground">
          {t("topicSet.unmapped.total", { count: unmapped?.unmappedDocs ?? 0 })}
        </div>
        <div className="mt-3 space-y-2">
          {(unmapped?.sampleDocuments ?? []).slice(0, 10).map((doc) => (
            <div key={doc.docId} className="rounded-md border px-3 py-2 text-sm">
              {doc.title || doc.docId}
            </div>
          ))}
          {(unmapped?.sampleDocuments ?? []).length === 0 && (
            <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
              {t("topicSet.unmapped.empty")}
            </div>
          )}
        </div>
        <button
          type="button"
          className="mt-4 rounded-md border px-3 py-1.5 text-sm"
          onClick={onOpenUnmapped}
        >
          {t("topicSet.dashboard.openUnmapped")}
        </button>
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

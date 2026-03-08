"use client";

import { t } from "@/i18n";

export function UnmappedPage({
  dashboard,
  total,
  docs,
  page,
  size,
  sort,
  onPageChange,
  onSizeChange,
  onSortChange,
  onViewDocument,
  onBindTopic,
  onIgnore,
}: {
  dashboard?: {
    totalDocs: number;
    classifiedDocs: number;
    unmappedDocs: number;
    sampleDocuments: Array<{ docId: string; title?: string | null }>;
  } | null;
  total: number;
  docs: Array<{ docId: string; title?: string | null }>;
  page: number;
  size: number;
  sort: "score" | "updatedAt" | "publishedAt";
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onSortChange: (sort: "score" | "updatedAt" | "publishedAt") => void;
  onViewDocument: (docId: string) => void;
  onBindTopic: (docId: string) => void;
  onIgnore: (docId: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(size, 1)));
  return (
    <section className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">{t("topicSet.unmapped.title")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard label={t("topicSet.analytics.kpiTotalDocs")} value={dashboard?.totalDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiCoveredDocs")} value={dashboard?.classifiedDocs ?? 0} />
          <MetricCard label={t("topicSet.analytics.kpiUnmappedDocs")} value={dashboard?.unmappedDocs ?? total} />
        </div>
        <div className="mt-4">
          <div className="text-xs text-muted-foreground">{t("topicSet.unmapped.sample")}</div>
          <div className="mt-2 space-y-2">
            {(dashboard?.sampleDocuments ?? []).map((doc) => (
              <button
                key={doc.docId}
                type="button"
                className="block w-full rounded-md border px-3 py-2 text-left text-xs hover:bg-muted/20"
                onClick={() => onViewDocument(doc.docId)}
              >
                {doc.title || doc.docId}
              </button>
            ))}
            {(dashboard?.sampleDocuments ?? []).length === 0 && (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                {t("topicSet.unmapped.empty")}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="text-sm text-muted-foreground">
          {t("topicSet.unmapped.total", { count: total })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <select
            className="h-8 rounded border px-2"
            value={sort}
          onChange={(event) => onSortChange(event.target.value as "score" | "updatedAt" | "publishedAt")}
        >
          <option value="score">{t("topicSet.common.sortScore")}</option>
          <option value="updatedAt">{t("topicSet.common.sortUpdatedAt")}</option>
          <option value="publishedAt">{t("topicSet.common.sortPublishedAt")}</option>
        </select>
        <select
          className="h-8 rounded border px-2"
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
        >
          {[20, 50, 100].map((item) => (
            <option key={item} value={item}>
              {t("topicSet.common.pageSize", { size: item })}
            </option>
          ))}
        </select>
        </div>

        <div className="mt-4 overflow-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t("topicSet.docs.columnTitle")}</th>
                <th className="px-3 py-2">{t("topicSet.unmapped.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.docId} className="border-b">
                  <td className="px-3 py-2">{doc.title || doc.docId}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded border px-2 py-1 text-xs" onClick={() => onViewDocument(doc.docId)}>
                        {t("topicSet.unmapped.view")}
                      </button>
                      <button className="rounded border px-2 py-1 text-xs" onClick={() => onBindTopic(doc.docId)}>
                        {t("topicSet.unmapped.bind")}
                      </button>
                      <button className="rounded border px-2 py-1 text-xs" onClick={() => onIgnore(doc.docId)}>
                        {t("topicSet.unmapped.ignore")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={2}>
                    {t("topicSet.unmapped.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-50"
            disabled={page <= 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
          >
            {t("topicSet.common.prev")}
          </button>
          <span className="text-muted-foreground">
            {t("topicSet.common.page", { page: page + 1, total: totalPages })}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-50"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          >
            {t("topicSet.common.next")}
          </button>
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

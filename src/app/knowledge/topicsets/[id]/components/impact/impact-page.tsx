"use client";

import { TopicSetNode } from "@/lib/topicset-api";
import { t } from "@/i18n";
import { sanitizeHighlightHtml } from "@/lib/highlight-html";

export function ImpactPage({
  selectedNode,
  displayPath,
  selectedTopics,
  loading,
  error,
  docs,
  page,
  size,
  total,
  sort,
  onPageChange,
  onSizeChange,
  onSortChange,
  onOpenTopicDocs,
}: {
  selectedNode: TopicSetNode | null;
  displayPath?: string | null;
  selectedTopics: Array<{ topicId: string; topicName?: string | null; hitDocs?: number }>;
  loading: boolean;
  error: string | null;
  docs: Array<{ docId: string; title: string; summary?: string | null }>;
  page: number;
  size: number;
  total: number;
  sort: "score" | "updatedAt" | "publishedAt";
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onSortChange: (sort: "score" | "updatedAt" | "publishedAt") => void;
  onOpenTopicDocs: (topicId: string, topicName?: string | null) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(size, 1)));
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="text-sm font-semibold">{t("topicSet.impact.title")}</h2>
      <div className="mt-3 text-sm text-muted-foreground">
        {t("topicSet.impact.node")}: {selectedNode?.name ?? "-"}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{displayPath ?? "-"}</div>
      <div className="mt-3">
        <div className="mb-2 text-xs text-muted-foreground">{t("topicSet.coverage.topics")}</div>
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map((topic) => (
            <button
              key={topic.topicId}
              type="button"
              className="rounded-full border px-2 py-1 text-xs hover:bg-muted/30"
              onClick={() => onOpenTopicDocs(topic.topicId, topic.topicName)}
            >
              {topic.topicName ?? topic.topicId}
              <span className="ml-1 text-muted-foreground">{topic.hitDocs ?? 0}</span>
            </button>
          ))}
          {selectedTopics.length === 0 && (
            <span className="text-xs text-muted-foreground">{t("topicSet.binding.empty")}</span>
          )}
        </div>
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

      <div className="mt-4">
        <div className="mb-2 text-xs text-muted-foreground">{t("topicSet.impact.docs")}</div>
        {loading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
        {error && <div className="text-sm text-rose-700">{error}</div>}
        {!loading && !error && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">{t("topicSet.docs.columnTitle")}</th>
                <th className="py-2">{t("topicSet.docs.columnTopic")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((row) => (
                <tr key={row.docId} className="border-b">
                  <td className="py-2">
                    <div
                      className="break-words text-sm leading-6"
                      dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(row.title) }}
                    />
                  </td>
                  <td className="py-2">
                    <div
                      className="break-words text-xs leading-6 text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(row.summary) }}
                    />
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={2}>
                    {t("topicSet.docs.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
  );
}

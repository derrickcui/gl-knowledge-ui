"use client";

import Link from "next/link";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  fetchPortalTopicDetail,
  fetchPortalTopicDocumentExplain,
  searchPortalTopic,
  PortalTopicDetailResponse,
  PortalTopicDocument,
  PortalTopicDocumentExplain,
} from "@/lib/portal-api";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

function toNumber(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatScore(value: number | undefined, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function buildSnippet(doc: PortalTopicDocument) {
  return doc.snippet?.trim() || doc.summary?.trim() || "-";
}

function getDocId(doc: PortalTopicDocument, fallback: string) {
  return doc.id || doc.docId || fallback;
}

function TopicDetailClient() {
  const router = useRouter();
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topicId = decodeURIComponent(params.topicId);
  const datasetName = searchParams.get("datasetName") ?? "policy";
  const currentQuery = searchParams.get("q") ?? "";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Number(searchParams.get("size") ?? "10") || 10);

  const [draftQuery, setDraftQuery] = useState(currentQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortalTopicDetailResponse | null>(null);
  const [results, setResults] = useState<PortalTopicDocument[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [explainLoadingDocId, setExplainLoadingDocId] = useState("");
  const [expandedDocId, setExpandedDocId] = useState("");
  const [explainMap, setExplainMap] = useState<Record<string, PortalTopicDocumentExplain | null>>({});
  const [explainErrorMap, setExplainErrorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [detailRes, searchRes] = await Promise.all([
        fetchPortalTopicDetail(topicId, datasetName),
        searchPortalTopic(topicId, {
          query: currentQuery,
          page: currentPage,
          size: pageSize,
          mode: "LEXICAL",
        }),
      ]);

      if (cancelled) return;

      setLoading(false);
      setError(detailRes.error ?? searchRes.error);
      setDetail(detailRes.data ?? null);
      setResults(searchRes.data?.results ?? []);
      setTotalHits(searchRes.data?.totalHits ?? 0);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [topicId, datasetName, currentQuery, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalHits / pageSize));
  const relatedTopics = detail?.relatedTopics ?? [];
  const relatedDocuments = detail?.relatedDocuments ?? [];
  const previewDocuments = useMemo(
    () => (currentQuery.trim() ? results : relatedDocuments.length ? relatedDocuments : results),
    [currentQuery, relatedDocuments, results]
  );

  function pushQuery(next: { q?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = next.q ?? currentQuery;
    const nextPage = next.page ?? 1;
    if (datasetName) params.set("datasetName", datasetName);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    params.set("size", String(pageSize));
    router.push(`/topics/${encodeURIComponent(topicId)}?${params.toString()}`);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushQuery({ q: draftQuery, page: 1 });
  }

  async function handleExplain(doc: PortalTopicDocument) {
    const docId = getDocId(doc, "");
    if (!docId) return;
    if (expandedDocId === docId) {
      setExpandedDocId("");
      return;
    }
    setExpandedDocId(docId);
    if (explainMap[docId] || explainLoadingDocId) return;
    setExplainLoadingDocId(docId);
    const res = await fetchPortalTopicDocumentExplain(topicId, docId);
    setExplainLoadingDocId("");
    if (!res.data) {
      setExplainErrorMap((prev) => ({
        ...prev,
        [docId]: res.error ?? t("portal.topic.explain.loadFailed"),
      }));
      return;
    }
    setExplainMap((prev) => ({ ...prev, [docId]: res.data }));
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(135deg,_#020617,_#0f172a_58%,_#111827)] text-slate-100">
      <div className="mx-auto max-w-[1480px] p-6">
        <section className="rounded-[30px] border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/topics?datasetName=${encodeURIComponent(datasetName)}`}
                  className="rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs text-slate-200"
                >
                  {t("portal.topic.link.back")}
                </Link>
                <Link
                  href={`/search?q=${encodeURIComponent(detail?.topicName || topicId)}`}
                  className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                >
                  {t("portal.topic.link.search")}
                </Link>
              </div>

              <div className="mt-4 text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                {t("portal.topic.badge")}
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                {detail?.topicName || topicId}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5">
                  {t("portal.topic.meta.dataset", { value: detail?.datasetName || datasetName })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5">
                  {t("portal.topic.meta.namespace", { value: detail?.namespace || "-" })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5">
                  {t("portal.topic.meta.runtime", { value: detail?.runtimeVersion ?? "-" })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5">
                  {t("portal.topic.meta.weight", { value: detail?.weight ?? "-" })}
                </span>
              </div>

              <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/8 p-5">
                <div className="text-xs uppercase tracking-wide text-cyan-200/80">
                  {t("portal.topic.definition.title")}
                </div>
                <p className="mt-3 text-base leading-7 text-slate-100">
                  {detail?.definition?.trim() || t("portal.topic.definition.empty")}
                </p>
              </div>
            </div>

            <div className="min-w-[300px] max-w-[360px] rounded-3xl border border-slate-700 bg-slate-900/80 p-5 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {t("portal.topic.metadata.title")}
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.metadata.gql")}</div>
                  <pre className="mt-2 whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs leading-6 text-slate-200">
                    {detail?.compiledGql || "-"}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.metadata.modes")}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(detail?.deployModes ?? []).length ? (
                      detail?.deployModes?.map((mode) => (
                        <span
                          key={mode}
                          className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300"
                        >
                          {mode}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">{t("portal.topic.metadata.modes.empty")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 lg:flex-row">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder={t("portal.topic.form.placeholder")}
              className="h-12 flex-1 rounded-2xl border border-slate-600 bg-slate-900/85 px-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
            <button
              type="submit"
              className="h-12 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              {t("portal.topic.form.submit")}
            </button>
          </form>
        </section>

        {loading ? <div className="mt-6 text-sm text-slate-400">{t("portal.topic.loading")}</div> : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="text-sm font-semibold text-white">{t("portal.topic.related.title")}</div>
            <div className="mt-2 text-sm text-slate-400">
              {t("portal.topic.related.subtitle")}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedTopics.length ? (
                relatedTopics.map((topic) => (
                  <Link
                    key={topic.topicId}
                    href={`/topics/${encodeURIComponent(topic.topicId)}?datasetName=${encodeURIComponent(datasetName)}`}
                    className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-100"
                  >
                    {topic.topicName} {topic.score != null ? `(${formatScore(topic.score, 2)})` : ""}
                  </Link>
                ))
              ) : (
                <div className="text-sm text-slate-400">{t("portal.topic.related.empty")}</div>
              )}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="text-sm font-semibold text-white">{t("portal.topic.preview.title")}</div>
            <div className="mt-2 text-sm text-slate-400">
              {t("portal.topic.preview.subtitle")}
            </div>
            <div className="mt-4 grid gap-3">
              {previewDocuments.slice(0, 3).length ? (
                previewDocuments.slice(0, 3).map((doc, index) => (
                  <div
                    key={`${getDocId(doc, String(index))}-preview`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <div className="text-base font-medium text-white">
                      {doc.title || getDocId(doc, `Document ${index + 1}`)}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{buildSnippet(doc)}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">{t("portal.topic.preview.empty")}</div>
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">{t("portal.topic.documents.title")}</div>
              <div className="mt-1 text-xs text-slate-400">
                {t("portal.topic.documents.subtitle")}
              </div>
            </div>
            <div className="text-sm text-slate-400">
              {totalHits
                ? t("portal.topic.documents.showing", {
                    count: Math.min(currentPage * pageSize, totalHits),
                    total: totalHits,
                  })
                : t("portal.topic.documents.empty")}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {results.length ? (
              results.map((doc, index) => {
                const docId = getDocId(doc, `doc-${index}`);
                const explain = explainMap[docId];
                const explainError = explainErrorMap[docId];
                const expanded = expandedDocId === docId;
                const breakdown = toRecord(doc.scoreBreakdown) ?? {};
                return (
                  <Fragment key={docId}>
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-xl font-semibold text-white">{doc.title || docId}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{buildSnippet(doc)}</p>
                        </div>
                        <div className="flex flex-col gap-2 text-right">
                          <div className="rounded-2xl border border-slate-700 bg-slate-950/90 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.documents.score")}</div>
                            <div className="mt-1 text-lg font-semibold text-white">{formatScore(doc.score)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExplain(doc)}
                            className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100 hover:bg-blue-500/20"
                          >
                            {explainLoadingDocId === docId
                              ? t("portal.topic.documents.loadingExplain")
                              : expanded
                                ? t("portal.topic.documents.hideExplain")
                                : t("portal.topic.documents.explain")}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.documents.final")}</div>
                          <div className="mt-1 text-sm font-semibold text-white">
                            {formatScore(toNumber(breakdown.finalScore, doc.score == null ? NaN : Number(doc.score)))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.documents.topic")}</div>
                          <div className="mt-1 text-sm font-semibold text-white">
                            {formatScore(
                              breakdown.topicContribution == null ? undefined : toNumber(breakdown.topicContribution)
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.topic.documents.labels")}</div>
                          <div className="mt-1 text-sm font-semibold text-white">
                            {(doc.topicLabels ?? []).join(", ") || "-"}
                          </div>
                        </div>
                      </div>
                    </article>

                    {expanded ? (
                      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
                        {explainError ? (
                          <div className="text-rose-300">{explainError}</div>
                        ) : explain ? (
                          <div className="space-y-3">
                            <div>
                              {t("portal.topic.explain.scoreMatched", {
                                score: formatScore(explain.score),
                                matched: String(Boolean(explain.matched)),
                              })}
                            </div>
                            {explain.finalExplain ? <div>{explain.finalExplain}</div> : null}
                            {(explain.rules ?? []).slice(0, 5).map((rule, explainIndex) => (
                              <div
                                key={`${rule.ruleId || explainIndex}`}
                                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                              >
                                <div className="font-medium text-white">
                                  {rule.ruleName || rule.ruleId || t("portal.topic.explain.ruleFallback", {
                                    index: explainIndex + 1,
                                  })}
                                </div>
                                <div className="mt-1 text-slate-300">
                                  {t("portal.topic.explain.ruleMatchedContribution", {
                                    matched: String(Boolean(rule.matched)),
                                    value: formatScore(rule.weightContribution),
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500">{t("portal.topic.explain.empty")}</div>
                        )}
                      </div>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                {t("portal.topic.documents.empty")}
              </div>
            )}
          </div>

          {results.length ? (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="text-sm text-slate-400">
                {t("portal.topic.documents.page", { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pushQuery({ page: currentPage - 1 })}
                  disabled={currentPage <= 1}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                >
                  {t("portal.topic.documents.previous")}
                </button>
                <button
                  type="button"
                  onClick={() => pushQuery({ page: currentPage + 1 })}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                >
                  {t("portal.topic.documents.next")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default function TopicDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">{t("common.loading")}</div>}>
      <TopicDetailClient />
    </Suspense>
  );
}

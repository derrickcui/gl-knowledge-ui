"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchPortalSearchFacets,
  searchPortal,
  PortalSearchResponse,
  PortalSearchFacetResponse,
  PortalTopicGroup,
  PortalTopicDocument,
} from "@/lib/portal-api";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

type TopicChip = {
  topicId: string;
  topicName: string;
  score: number;
  confidence?: number;
  coverage?: number;
  matchedTerms: string[];
};

type RewriteItem = {
  term: string;
  expansionTerms: string[];
  applied: boolean;
};

type TopicContribution = {
  topicId: string;
  topicName: string;
  queryScore?: number;
  docScore?: number;
  contribution: number;
  matchedTerms: string[];
};

type SearchHit = PortalTopicDocument & {
  fields?: Record<string, unknown>;
  highlights?: Record<string, string>;
  lexicalScore?: number;
  vectorScore?: number;
  queryScore?: number;
  docScore?: number;
};

type SearchResponse = PortalSearchResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => toText(item)).filter(Boolean) : [];
}

function toRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function formatScore(value: number | undefined, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function buildSnippet(hit: SearchHit) {
  const highlights = hit.highlights ?? {};
  const firstHighlight = Object.values(highlights).find((value) => typeof value === "string" && value.trim());
  if (firstHighlight) return firstHighlight;
  return hit.summary?.trim() || toText(hit.fields?.snippet) || toText(hit.fields?.content) || "-";
}

function normalizeDetectedTopics(response: SearchResponse): TopicChip[] {
  const candidates = response.detectedTopics;

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;
      const topicId = toText(record.topicId || record.id);
      const topicName = toText(record.topicName || record.name || record.label);
      if (!topicId && !topicName) return null;
      const normalized: TopicChip = {
        topicId: topicId || topicName,
        topicName: topicName || topicId,
        score: toNumber(record.score ?? record.weight ?? record.signalScore),
        confidence:
          record.confidence == null ? undefined : toNumber(record.confidence),
        coverage: record.coverage == null ? undefined : toNumber(record.coverage),
        matchedTerms: toStringArray(record.matchedTerms ?? record.terms),
      };
      return normalized;
    })
    .filter((item): item is TopicChip => item !== null)
    .sort((a, b) => b.score - a.score);
}

function normalizeRewrite(response: SearchResponse): RewriteItem[] {
  const candidates = response.rewrite;

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;
      const term = toText(record.term || record.sourceTerm || record.queryTerm);
      const expansionTerms = toStringArray(
        record.expansionTerms ?? record.expandedTerms ?? record.terms ?? record.candidates
      );
      if (!term && expansionTerms.length === 0) return null;
      return {
        term,
        expansionTerms,
        applied: Boolean(record.applied ?? record.selected ?? true),
      } satisfies RewriteItem;
    })
    .filter((item): item is RewriteItem => item !== null);
}

function normalizeResults(response: SearchResponse): SearchHit[] {
  return Array.isArray(response.results) ? response.results : [];
}

function normalizeFacetGroups(response: PortalSearchFacetResponse | null, searchData: SearchResponse | null) {
  if (response?.groups?.length) return response.groups;
  const grouped = searchData?.filters?.groupedTopics;
  if (Array.isArray(grouped) && grouped.length) return grouped;
  return [];
}

function normalizeHitTopics(hit: SearchHit): TopicContribution[] {
  const details = Array.isArray(hit.topicScoreDetails) ? hit.topicScoreDetails : [];
  if (details.length > 0) {
    return details
      .map((item) => {
        const record = toRecord(item);
        if (!record) return null;
        const topicId = toText(record.topicId || record.id);
        const topicName = toText(record.topicName || record.name || record.label);
        if (!topicId && !topicName) return null;
        const normalized: TopicContribution = {
          topicId: topicId || topicName,
          topicName: topicName || topicId,
          queryScore:
            record.queryScore == null ? undefined : toNumber(record.queryScore),
          docScore: record.docScore == null ? undefined : toNumber(record.docScore),
          contribution: toNumber(
            record.contribution ?? record.scoreContribution ?? record.topicContribution
          ),
          matchedTerms: toStringArray(record.matchedTerms),
        };
        return normalized;
      })
      .filter((item): item is TopicContribution => item !== null)
      .sort((a, b) => b.contribution - a.contribution);
  }

  if (!Array.isArray(hit.topicSignals)) return [];

  return hit.topicSignals
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;
      const topicId = toText(record.topicId || record.id);
      const topicName = toText(record.topicName || record.name || record.label);
      if (!topicId && !topicName) return null;
      const normalized: TopicContribution = {
        topicId: topicId || topicName,
        topicName: topicName || topicId,
        contribution: toNumber(record.scoreContribution ?? record.contribution),
        matchedTerms: toStringArray(record.matchedTerms),
      };
      return normalized;
    })
    .filter((item): item is TopicContribution => item !== null)
    .sort((a, b) => b.contribution - a.contribution);
}

function readScoreBreakdown(hit: SearchHit) {
  const breakdown = toRecord(hit.scoreBreakdown) ?? {};
  return {
    lexical: hit.lexicalScore ?? toNumber(breakdown.lexicalScore, NaN),
    vector: hit.vectorScore ?? toNumber(breakdown.vectorScore, NaN),
    topic:
      breakdown.topicContribution == null
        ? undefined
        : toNumber(breakdown.topicContribution),
    final:
      breakdown.finalScore == null ? hit.score : toNumber(breakdown.finalScore),
  };
}

function summarizeExplain(value: unknown) {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const pairs = Object.entries(value)
    .filter(([, innerValue]) => {
      return (
        typeof innerValue === "string" ||
        typeof innerValue === "number" ||
        typeof innerValue === "boolean"
      );
    })
    .slice(0, 8)
    .map(([key, innerValue]) => `${key}: ${String(innerValue)}`);

  return pairs.join("\n");
}

function getHitId(hit: SearchHit, fallback: string) {
  return hit.id ?? hit.docId ?? fallback;
}

function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentFq = searchParams.get("fq") ?? "";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Number(searchParams.get("size") ?? "10") || 10);

  const [draftQuery, setDraftQuery] = useState(currentQuery);
  const [searchLoading, setSearchLoading] = useState(false);
  const [facetLoading, setFacetLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [facetError, setFacetError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [groups, setGroups] = useState<PortalTopicGroup[]>([]);
  const [selectedHitId, setSelectedHitId] = useState("");

  useEffect(() => {
    setDraftQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadSearch() {
      if (!currentQuery.trim()) {
        setSearchData(null);
        setSearchError(null);
        setGroups([]);
        setFacetError(null);
        return;
      }

      setSearchLoading(true);
      setFacetLoading(true);

      const searchPayload = {
        query: currentQuery,
        page: currentPage,
        size: pageSize,
        mode: "LEXICAL",
        filterQueries: currentFq ? [currentFq] : [],
      };

      const facetPayload = {
        query: currentQuery,
        filterQueries: currentFq ? [currentFq] : [],
        limit: 50,
      };

      const [searchRes, facetRes] = await Promise.all([
        searchPortal(searchPayload),
        fetchPortalSearchFacets(facetPayload),
      ]);

      if (cancelled) return;

      setSearchLoading(false);
      setFacetLoading(false);

      if (!searchRes.data) {
        setSearchError(searchRes.error ?? "invalid search response");
        setSearchData(null);
      } else {
        setSearchError(null);
        setSearchData(searchRes.data);
      }

      if (!facetRes.data) {
        setFacetError(facetRes.error ?? "facet load failed");
        setGroups(normalizeFacetGroups(null, searchRes.data ?? null));
      } else {
        setFacetError(null);
        setGroups(normalizeFacetGroups(facetRes.data, searchRes.data ?? null));
      }
    }

    loadSearch();

    return () => {
      cancelled = true;
    };
  }, [currentQuery, currentFq, currentPage, pageSize]);

  const hits = searchData ? normalizeResults(searchData) : [];
  const totalHits = searchData?.totalHits ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHits / pageSize));
  const selectedBucket = useMemo(
    () => groups.flatMap((group) => group.buckets).find((bucket) => bucket.fq === currentFq),
    [groups, currentFq]
  );
  const detectedTopics = useMemo(
    () => (searchData ? normalizeDetectedTopics(searchData) : []),
    [searchData]
  );
  const rewrites = useMemo(
    () => (searchData ? normalizeRewrite(searchData) : []),
    [searchData]
  );
  const selectedHit = useMemo(
    () => hits.find((hit, index) => getHitId(hit, `hit-${index}`) === selectedHitId) ?? null,
    [hits, selectedHitId]
  );

  useEffect(() => {
    if (!selectedHitId) return;
    const stillExists = hits.some((hit, index) => getHitId(hit, `hit-${index}`) === selectedHitId);
    if (!stillExists) {
      setSelectedHitId("");
    }
  }, [hits, selectedHitId]);

  function pushSearch(next: {
    q?: string;
    fq?: string;
    page?: number;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = next.q ?? currentQuery;
    const nextFq = next.fq;
    const nextPage = next.page ?? 1;

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");

    if (nextFq) params.set("fq", nextFq);
    else params.delete("fq");

    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");

    params.set("size", String(pageSize));

    const suffix = params.toString();
    router.push(suffix ? `/search?${suffix}` : "/search");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushSearch({ q: draftQuery, page: 1 });
  }

  function onPageChange(nextPage: number) {
    pushSearch({ page: Math.max(1, Math.min(totalPages, nextPage)) });
  }

  const quality = toRecord(searchData?.quality);
  const rankingLatency = quality ? toNumber(quality.rankingLatencyMs) : 0;
  const hybridEnabled = quality ? Boolean(quality.hybridEnabled) : false;
  const rerankApplied = quality ? Boolean(quality.rerankApplied) : false;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_26%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#111827)] text-slate-100">
      <div className="mx-auto max-w-[1480px] p-6">
        <section className="rounded-[28px] border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                {t("portal.search.badge")}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {t("portal.search.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                {t("portal.search.subtitle")}
              </p>
              <div className="mt-3 text-xs text-slate-500">
                {t("portal.search.datasource")}
              </div>
            </div>
            <div className="grid min-w-[240px] gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.search.metric.results")}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{totalHits}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.search.metric.latency")}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{rankingLatency || "-"}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.search.metric.mode")}</div>
                <div className="mt-1 text-sm font-medium text-white">
                  {hybridEnabled ? t("portal.search.metric.mode.hybrid") : t("portal.search.metric.mode.lexical")} / {rerankApplied ? t("portal.search.metric.mode.rerank") : t("portal.search.metric.mode.direct")}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder={t("portal.search.form.placeholder")}
                className="h-14 flex-1 rounded-2xl border border-slate-600 bg-slate-900/85 px-4 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
              <button
                type="submit"
                className="h-14 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                {t("portal.search.form.submit")}
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-slate-300">
              {t("portal.search.chip.query", { value: currentQuery || "-" })}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-slate-300">
              {t("portal.search.chip.filter", { value: selectedBucket?.topicName || currentFq || t("portal.search.chip.filter.none") })}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-slate-300">
              {t("portal.search.chip.page", { current: currentPage, total: totalPages })}
            </span>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4">
              <div className="text-sm font-semibold text-white">{t("portal.search.detected.title")}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {detectedTopics.length ? (
                  detectedTopics.map((topic) => (
                    <button
                      key={`${topic.topicId}-${topic.topicName}`}
                      type="button"
                      onClick={() => {
                        const matchedBucket = groups
                          .flatMap((group) => group.buckets)
                          .find((bucket) => bucket.topicId === topic.topicId);
                        if (matchedBucket) {
                          pushSearch({ fq: matchedBucket.fq, page: 1 });
                        }
                      }}
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-left text-xs text-emerald-100"
                    >
                      {topic.topicName} ({formatScore(topic.score, 2)})
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">
                    {currentQuery ? t("portal.search.detected.emptyQuery") : t("portal.search.detected.emptyIdle")}
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4">
              <div className="text-sm font-semibold text-white">{t("portal.search.rewrite.title")}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {rewrites.length ? (
                  rewrites.map((item) => (
                    <span
                      key={`${item.term}-${item.expansionTerms.join("-")}`}
                      className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100"
                    >
                      {item.term || t("portal.search.rewrite.termFallback")} {"->"} {item.expansionTerms.join(" / ") || t("portal.search.rewrite.expansionEmpty")}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">{t("portal.search.rewrite.empty")}</div>
                )}
              </div>
            </article>
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{t("portal.search.filters.title")}</div>
                <div className="mt-1 text-xs text-slate-400">{t("portal.search.filters.subtitle")}</div>
              </div>
              {facetLoading ? <span className="text-xs text-slate-400">{t("portal.search.filters.loading")}</span> : null}
            </div>

            {facetError ? (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                {facetError}
              </div>
            ) : null}

            {!facetLoading && !groups.length && currentQuery ? (
              <div className="mt-4 text-sm text-slate-400">{t("portal.search.filters.empty")}</div>
            ) : null}

            <div className="mt-5 space-y-5">
              {groups.map((group) => (
                <section key={`${group.dimensionId}-${group.dimensionName}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-300">
                      {group.dimensionName}
                    </div>
                    <div className="text-xs text-slate-500">{group.total}</div>
                  </div>
                  <div className="space-y-2">
                    {group.buckets.map((bucket) => {
                      const ratio = group.total
                        ? Math.max(5, Math.round((bucket.count / group.total) * 100))
                        : 5;
                      const active = currentFq === bucket.fq;
                      return (
                        <button
                          key={`${bucket.topicId}-${bucket.fq}`}
                          type="button"
                          onClick={() => pushSearch({ fq: active ? "" : bucket.fq, page: 1 })}
                          className={`w-full rounded-2xl border p-3 text-left transition ${
                            active
                              ? "border-cyan-400/60 bg-cyan-500/12"
                              : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-slate-100">{bucket.topicName}</span>
                            <span className="text-slate-400">{bucket.count}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <section className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{t("portal.search.results.title")}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {t("portal.search.results.subtitle")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentFq ? (
                  <button
                    type="button"
                    onClick={() => pushSearch({ fq: "", page: 1 })}
                    className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {t("portal.search.results.clear")}
                  </button>
                ) : null}
              </div>
            </div>

            {searchError ? (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                {searchError}
              </div>
            ) : null}

            {searchLoading ? <div className="mt-6 text-sm text-slate-400">{t("portal.search.results.loading")}</div> : null}

            {!currentQuery.trim() ? (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                {t("portal.search.results.emptyIdle")}
              </div>
            ) : null}

            {!searchLoading && currentQuery.trim() && hits.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                {t("portal.search.results.empty")}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {hits.map((hit, index) => {
                const hitId = getHitId(hit, `hit-${index}`);
                const snippet = buildSnippet(hit);
                const topics = normalizeHitTopics(hit);
                const breakdown = readScoreBreakdown(hit);

                return (
                  <article
                    key={hitId}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-600"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-400">
                            #{(currentPage - 1) * pageSize + index + 1}
                          </span>
                          {(hit.topicLabels ?? []).slice(0, 3).map((label) => (
                            <span
                              key={`${hitId}-${label}`}
                              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                        <h2 className="mt-3 text-xl font-semibold text-white">
                          {hit.title?.trim() || hitId}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{snippet}</p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 text-right">
                        <div className="rounded-2xl border border-slate-700 bg-slate-950/90 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("portal.search.result.final")}</div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {formatScore(breakdown.final)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedHitId(hitId)}
                          className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100 hover:bg-blue-500/20"
                        >
                          {t("portal.search.result.explain")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {t("portal.search.result.topicContribution")}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topics.length ? (
                            topics.slice(0, 4).map((topic) => (
                              <div
                                key={`${hitId}-${topic.topicId}`}
                                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
                              >
                                <div className="font-medium">{topic.topicName}</div>
                                <div className="mt-1 text-emerald-200/90">
                                  contribution +{formatScore(topic.contribution)}
                                </div>
                                {topic.queryScore != null || topic.docScore != null ? (
                                  <div className="mt-1 text-emerald-100/70">
                                    q {formatScore(topic.queryScore, 2)} / d {formatScore(topic.docScore, 2)}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-slate-500">
                              {t("portal.search.result.topicContribution.empty")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {t("portal.search.result.scoreBreakdown")}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[
                            { label: t("portal.search.breakdown.lexical"), value: breakdown.lexical },
                            { label: t("portal.search.breakdown.vector"), value: breakdown.vector },
                            { label: t("portal.search.breakdown.topic"), value: breakdown.topic },
                            { label: t("portal.search.breakdown.final"), value: breakdown.final },
                          ].map((item) => (
                            <div
                              key={`${hitId}-${item.label}`}
                              className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2"
                            >
                              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                {item.label}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white">
                                {formatScore(item.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {hits.length ? (
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <div className="text-sm text-slate-400">
                  {t("portal.search.pagination.showing", {
                    start: (currentPage - 1) * pageSize + 1,
                    end: Math.min(currentPage * pageSize, totalHits),
                    total: totalHits,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                  >
                    {t("portal.search.pagination.previous")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                  >
                    {t("portal.search.pagination.next")}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {selectedHit ? (
        <>
          <button
            type="button"
            aria-label={t("portal.search.drawer.close")}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={() => setSelectedHitId("")}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[560px] overflow-auto border-l border-slate-700 bg-slate-950/95 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                  {t("portal.search.drawer.title")}
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedHit.title?.trim() || selectedHit.id || selectedHit.docId || t("portal.search.drawer.documentFallback")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHitId("")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
              >
                {t("portal.search.drawer.close")}
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-white">{t("portal.search.drawer.why")}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(() => {
                    const breakdown = readScoreBreakdown(selectedHit);
                    return [
                      { label: t("portal.search.breakdown.lexical"), value: breakdown.lexical },
                      { label: t("portal.search.breakdown.vector"), value: breakdown.vector },
                      { label: t("portal.search.breakdown.topic"), value: breakdown.topic },
                      { label: t("portal.search.breakdown.final"), value: breakdown.final },
                    ].map((item) => (
                      <div
                        key={`drawer-${item.label}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2"
                      >
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {formatScore(item.value)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-white">{t("portal.search.drawer.topicSignals")}</div>
                <div className="mt-3 space-y-3">
                  {normalizeHitTopics(selectedHit).length ? (
                    normalizeHitTopics(selectedHit).map((topic) => (
                      <div
                        key={`drawer-topic-${topic.topicId}`}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                      >
                        <div className="font-medium">{topic.topicName}</div>
                        <div className="mt-2 text-emerald-200/90">
                          {t("portal.search.drawer.topicSignals.contribution", {
                            value: formatScore(topic.contribution),
                          })}
                        </div>
                        <div className="mt-1 text-emerald-100/75">
                          {t("portal.search.drawer.topicSignals.queryDoc", {
                            query: formatScore(topic.queryScore, 2),
                            doc: formatScore(topic.docScore, 2),
                          })}
                        </div>
                        {topic.matchedTerms.length ? (
                          <div className="mt-2 text-emerald-100/75">
                            {t("portal.search.drawer.topicSignals.matched", {
                              terms: topic.matchedTerms.join(", "),
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">{t("portal.search.drawer.topicSignals.empty")}</div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-white">{t("portal.search.drawer.rewrite")}</div>
                <div className="mt-3 space-y-2">
                  {rewrites.length ? (
                    rewrites.map((item) => (
                      <div
                        key={`drawer-rewrite-${item.term}-${item.expansionTerms.join("-")}`}
                        className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-100"
                      >
                        <div className="font-medium">{item.term || t("portal.search.rewrite.termFallback")}</div>
                        <div className="mt-1">{item.expansionTerms.join(" / ") || t("portal.search.rewrite.expansionEmpty")}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">{t("portal.search.drawer.rewrite.empty")}</div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-white">{t("portal.search.drawer.ranking")}</div>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs leading-6 text-slate-300">
                  {summarizeExplain(selectedHit.rankExplain ?? selectedHit.rankingExplain) || t("portal.search.drawer.ranking.empty")}
                </pre>
              </section>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full bg-slate-950 p-6 text-slate-100">
          {t("common.loading")}
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}

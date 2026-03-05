"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  AnalyticsMatrixCellView,
  AnalyticsMatrixDocView,
  AnalyticsTopicStatItemView,
  fetchAnalyticsMatrix,
  fetchAnalyticsTopicStats,
} from "@/lib/analytics-api";
import {
  GovernanceTopicDocExplainResponse,
  GovernanceTopicVersionItem,
  fetchGovernanceTopicCooccurrence,
  fetchGovernanceTopicDocExplain,
  fetchGovernanceTopicDocs,
  fetchGovernanceTopicVersions,
} from "@/lib/governance-topic-detail-api";

type TopicDocRow = {
  docId: string;
  title: string;
  weight: number;
  time: string;
};

type CoTopicRow = {
  topicId: string;
  topicName: string;
  count: number;
};

type TopicSummary = {
  matchedDocs: number;
  coverageRate: number;
  multiHitRate: number;
  blindspotCount: number;
  avgWeight: number;
};

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function weightBucket(weight: number) {
  if (weight >= 0.8) return ">=0.8";
  if (weight >= 0.6) return "0.6-0.8";
  if (weight >= 0.4) return "0.4-0.6";
  if (weight >= 0.2) return "0.2-0.4";
  return "<0.2";
}

function toPercent(value: number | undefined) {
  const raw = Number(value ?? 0);
  const normalized = raw > 1 ? raw : raw * 100;
  return `${Math.max(0, normalized).toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topicId = decodeURIComponent(params.topicId);
  const topicNameFromQuery = searchParams.get("topicName") ?? "";
  const focusDocId = searchParams.get("docId") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<string>("-");
  const [runtimeVersion, setRuntimeVersion] = useState<string>("-");
  const [topicStat, setTopicStat] = useState<AnalyticsTopicStatItemView | null>(null);
  const [summary, setSummary] = useState<TopicSummary>({
    matchedDocs: 0,
    coverageRate: 0,
    multiHitRate: 0,
    blindspotCount: 0,
    avgWeight: 0,
  });
  const [rows, setRows] = useState<TopicDocRow[]>([]);
  const [coTopics, setCoTopics] = useState<CoTopicRow[]>([]);
  const [versions, setVersions] = useState<GovernanceTopicVersionItem[]>([]);
  const [query, setQuery] = useState("");

  const [explainLoadingDocId, setExplainLoadingDocId] = useState("");
  const [expandedExplainDocId, setExpandedExplainDocId] = useState("");
  const [explainMap, setExplainMap] = useState<Record<string, GovernanceTopicDocExplainResponse>>({});
  const [explainErrorMap, setExplainErrorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let canceled = false;

    async function loadFromNewApis() {
      const [docsRes, coRes, versionsRes] = await Promise.all([
        fetchGovernanceTopicDocs(topicId, {
          page: 1,
          size: 200,
          sortBy: "WEIGHT",
          sortOrder: "DESC",
          hitMode: "ALL",
        }),
        fetchGovernanceTopicCooccurrence(topicId, { limit: 5 }),
        fetchGovernanceTopicVersions(topicId),
      ]);

      if (canceled) return null;
      if (!docsRes.data) return null;

      const docs = docsRes.data.items ?? [];
      const topicInfo = docsRes.data.topic;
      const apiSummary = docsRes.data.summary;
      setTopicStat((prev) =>
        prev ?? {
          topicId: topicInfo.topicId,
          topicName: topicInfo.topicName,
          dimensionId: topicInfo.dimensionId,
          dimensionName: topicInfo.dimensionName,
          docCount: apiSummary.matchedDocs,
          avgWeight: apiSummary.avgWeight,
          coverageRate: apiSummary.coverageRate,
        }
      );
      setRuntimeVersion(topicInfo.runtimeVersion ?? runtimeVersion);
      setSummary({
        matchedDocs: apiSummary.matchedDocs,
        coverageRate: apiSummary.coverageRate,
        multiHitRate: apiSummary.multiHitRate,
        blindspotCount: apiSummary.blindspotCount,
        avgWeight: apiSummary.avgWeight,
      });
      setRows(
        docs.map((item) => ({
          docId: item.docId,
          title: item.title?.trim() || item.docId,
          weight: toNumber(item.weight),
          time: formatDateTime(item.publishedAt),
        }))
      );
      setCoTopics(
        (coRes.data?.items ?? []).map((item) => ({
          topicId: item.topicId,
          topicName: item.topicName,
          count: item.cooccurDocs,
        }))
      );
      setVersions(versionsRes.data?.versions ?? []);
      return true;
    }

    async function loadFromFallbackApis() {
      const [matrixRes, statsRes] = await Promise.all([
        fetchAnalyticsMatrix({ limit: 500, topicLimit: 200 }),
        fetchAnalyticsTopicStats({ limit: 500, topicLimit: 500 }),
      ]);

      if (canceled) return;

      const firstError = matrixRes.error ?? statsRes.error;
      if (firstError) {
        setError(firstError);
      }

      const matrix = matrixRes.data;
      const topics = statsRes.data?.topics ?? [];

      setDataset(matrix?.meta?.dataset ?? "-");
      setRuntimeVersion(matrix?.meta?.runtimeVersion ?? "-");
      const currentTopic = topics.find((item) => item.topicId === topicId) ?? null;
      setTopicStat(currentTopic);

      const docsById = new Map<string, AnalyticsMatrixDocView>(
        (matrix?.docs ?? []).map((doc) => [doc.docId, doc])
      );

      const cells = matrix?.cells ?? [];
      const hitCells = cells.filter((cell: AnalyticsMatrixCellView) => cell.topicId === topicId);
      const hitDocIds = new Set(hitCells.map((cell) => cell.docId));

      const maxWeightByDoc = new Map<string, number>();
      hitCells.forEach((cell) => {
        const prev = maxWeightByDoc.get(cell.docId) ?? 0;
        maxWeightByDoc.set(cell.docId, Math.max(prev, toNumber(cell.weight)));
      });

      const nextRows: TopicDocRow[] = Array.from(maxWeightByDoc.entries())
        .map(([docId, weight]) => {
          const doc = docsById.get(docId);
          return {
            docId,
            title: doc?.title?.trim() || docId,
            weight,
            time: "-",
          };
        })
        .sort((a, b) => b.weight - a.weight);
      setRows(nextRows);

      const coCountByTopic = new Map<string, number>();
      cells.forEach((cell) => {
        if (!hitDocIds.has(cell.docId) || cell.topicId === topicId) return;
        coCountByTopic.set(cell.topicId, (coCountByTopic.get(cell.topicId) ?? 0) + 1);
      });
      const topicNameById = new Map(topics.map((t) => [t.topicId, t.topicName]));
      const nextCoTopics = Array.from(coCountByTopic.entries())
        .map(([coTopicId, count]) => ({
          topicId: coTopicId,
          topicName: topicNameById.get(coTopicId)?.trim() || coTopicId,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setCoTopics(nextCoTopics);

      const matchedDocs = currentTopic?.docCount ?? nextRows.length;
      const avgWeight =
        currentTopic?.avgWeight != null ? toNumber(currentTopic.avgWeight) : matchedDocs
          ? nextRows.reduce((sum, row) => sum + row.weight, 0) / matchedDocs
          : 0;
      setSummary({
        matchedDocs,
        coverageRate: currentTopic?.coverageRate ?? 0,
        multiHitRate: 0,
        blindspotCount: 0,
        avgWeight,
      });
    }

    async function run() {
      setLoading(true);
      setError(null);

      const newApiLoaded = await loadFromNewApis();
      if (!newApiLoaded) {
        await loadFromFallbackApis();
      }

      if (!canceled) {
        setLoading(false);
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [topicId]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter(
      (row) => row.title.toLowerCase().includes(keyword) || row.docId.toLowerCase().includes(keyword)
    );
  }, [rows, query]);

  const strengthDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    [">=0.8", "0.6-0.8", "0.4-0.6", "0.2-0.4", "<0.2"].forEach((b) => counts.set(b, 0));
    rows.forEach((row) => {
      const bucket = weightBucket(row.weight);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([bucket, count]) => ({ bucket, count }));
  }, [rows]);

  const topicName = topicStat?.topicName?.trim() || topicNameFromQuery || "Topic";
  const hitCount = summary.matchedDocs || topicStat?.docCount || rows.length;
  const avgWeight = summary.avgWeight || topicStat?.avgWeight || 0;
  const compareFrom = versions[1]?.version ?? "";
  const compareTo = versions[0]?.version ?? "";

  async function handleExplain(docId: string) {
    if (expandedExplainDocId === docId) {
      setExpandedExplainDocId("");
      return;
    }
    setExpandedExplainDocId(docId);
    if (explainMap[docId] || explainLoadingDocId) return;
    setExplainLoadingDocId(docId);
    const res = await fetchGovernanceTopicDocExplain(topicId, docId);
    setExplainLoadingDocId("");
    if (!res.data) {
      setExplainErrorMap((prev) => ({ ...prev, [docId]: res.error ?? "failed to load explain" }));
      return;
    }
    setExplainMap((prev) => ({ ...prev, [docId]: res.data }));
  }

  return (
    <div className="min-h-full bg-background text-slate-100">
      <div className="mx-auto max-w-[1280px] p-6 md:p-8">
        <section className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 to-blue-950/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Topic Detail</h1>
              <p className="mt-2 text-sm text-slate-300">
                Topic: {topicName} · Dimension: {topicStat?.dimensionName?.trim() || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Docs: {hitCount.toLocaleString()} (Coverage {toPercent(summary.coverageRate)}) · Multi-hit{" "}
                {toPercent(summary.multiHitRate)} · Blindspots: {summary.blindspotCount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Avg Strength: {avgWeight.toFixed(3)} · Runtime: {runtimeVersion}
              </p>
              <p className="mt-1 text-xs text-slate-400">Dataset: {dataset}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {compareFrom && compareTo ? (
                <Link
                  href={`/knowledge/governance/diff?v1=${encodeURIComponent(
                    compareFrom
                  )}&v2=${encodeURIComponent(compareTo)}&topicId=${encodeURIComponent(topicId)}&topicName=${encodeURIComponent(topicName)}`}
                  className="rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-200 hover:bg-violet-500/20"
                >
                  Compare {compareFrom} {"->"} {compareTo}
                </Link>
              ) : null}
              <Link
                href="/knowledge/governance"
                className="rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
              >
                Back to Control Center
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-300">Matched Documents</div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by title or docId"
              className="h-9 w-full max-w-xs rounded-md border border-slate-600 bg-slate-950 px-3 text-sm outline-none placeholder:text-slate-500"
            />
          </div>

          {loading ? <div className="text-xs text-slate-400">Loading...</div> : null}
          {error ? (
            <div className="mb-3 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}
          {!loading && !filteredRows.length ? (
            <div className="text-xs text-slate-400">No matched documents in current data window.</div>
          ) : null}

          {filteredRows.length ? (
            <div className="max-h-[30rem] overflow-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Strength</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Explain</th>
                    <th className="px-3 py-2 text-left">Document</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const focused = focusDocId && focusDocId === row.docId;
                    const explain = explainMap[row.docId];
                    const explainError = explainErrorMap[row.docId];
                    const expanded = expandedExplainDocId === row.docId;
                    return (
                      <Fragment key={row.docId}>
                        <tr className={`border-t border-slate-800 ${focused ? "bg-cyan-500/10" : ""}`}>
                          <td className="px-3 py-2 text-slate-100">{row.title}</td>
                          <td className="px-3 py-2 text-slate-300">{row.weight.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-400">{row.time}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleExplain(row.docId)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                            >
                              {explainLoadingDocId === row.docId
                                ? "Loading..."
                                : expanded
                                  ? "Hide"
                                  : "View Explain"}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">{row.docId}</td>
                        </tr>
                        {expanded ? (
                          <tr className="border-t border-slate-900 bg-slate-950/60">
                            <td colSpan={5} className="px-3 py-2 text-xs">
                              {explainError ? (
                                <div className="text-rose-300">{explainError}</div>
                              ) : explain ? (
                                <div className="space-y-2">
                                  <div className="text-slate-300">
                                    score: {toNumber(explain.score).toFixed(3)} · matched:{" "}
                                    {explain.matched ? "true" : "false"}
                                  </div>
                                  {explain.finalExplain ? (
                                    <div className="text-slate-300">{explain.finalExplain}</div>
                                  ) : null}
                                  {(explain.rules ?? []).slice(0, 5).map((rule) => (
                                    <div
                                      key={rule.ruleId}
                                      className="rounded border border-slate-700 bg-slate-900/70 p-2 text-slate-300"
                                    >
                                      <div className="font-medium">
                                        {rule.ruleName} ({rule.matched ? "matched" : "not matched"})
                                      </div>
                                      {rule.weightContribution != null ? (
                                        <div>contribution: {toNumber(rule.weightContribution).toFixed(3)}</div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-500">No explain data.</div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold">Strength Distribution</h2>
            <div className="mt-3 space-y-2">
              {strengthDistribution.map((item) => {
                const ratio = rows.length > 0 ? Math.max(4, Math.round((item.count / rows.length) * 100)) : 4;
                return (
                  <div key={item.bucket} className="grid grid-cols-[90px_1fr_44px] items-center gap-3 text-xs">
                    <div className="text-slate-300">{item.bucket}</div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <div className="text-right text-slate-300">{item.count}</div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold">Top 5 Co-occurring Topics</h2>
            {!coTopics.length ? (
              <div className="mt-3 text-xs text-slate-400">No co-occurrence data.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {coTopics.map((item) => (
                  <Link
                    key={item.topicId}
                    href={`/knowledge/governance/topic/${encodeURIComponent(item.topicId)}?topicName=${encodeURIComponent(
                      item.topicName
                    )}`}
                    className="flex items-center justify-between rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm hover:border-slate-500"
                  >
                    <span className="text-slate-200">{item.topicName}</span>
                    <span className="text-slate-400">{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

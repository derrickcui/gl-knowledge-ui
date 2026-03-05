"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AnalyticsMatrixDiffCellView,
  fetchAnalyticsMatrix,
  fetchAnalyticsMatrixDiff,
  fetchAnalyticsTopicStats,
} from "@/lib/analytics-api";
import { fetchGovernanceTopicDiff } from "@/lib/governance-topic-detail-api";

type ChangedRow = {
  docId: string;
  docTitle: string;
  topicId: string;
  topicName: string;
  status: "ADDED" | "REMOVED";
  fromWeight: number | null;
  toWeight: number | null;
};

function toFixedOrDash(value: number | null | undefined, digits = 3) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

export default function GovernanceDiffPage() {
  const searchParams = useSearchParams();
  const fromVersion = searchParams.get("v1") ?? "";
  const toVersion = searchParams.get("v2") ?? "";
  const topicId = searchParams.get("topicId") ?? "";
  const topicName = searchParams.get("topicName") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [removedCount, setRemovedCount] = useState(0);
  const [changeRate, setChangeRate] = useState(0);
  const [rows, setRows] = useState<ChangedRow[]>([]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (!fromVersion || !toVersion) {
        setError("Please provide v1 and v2 in URL query.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      if (topicId) {
        const topicDiffRes = await fetchGovernanceTopicDiff(topicId, {
          fromVersion,
          toVersion,
          page: 1,
          size: 200,
        });
        if (canceled) return;
        if (topicDiffRes.data) {
          const data = topicDiffRes.data;
          setAddedCount(data.summary.added);
          setRemovedCount(data.summary.removed);
          setChangeRate(Number(data.summary.changeRate ?? 0) * (data.summary.changeRate > 1 ? 1 : 100));
          setRows(
            (data.items ?? []).map((item) => ({
              docId: item.docId,
              docTitle: item.title?.trim() || item.docId,
              topicId: data.topicId,
              topicName: topicName || data.topicId,
              status: item.status,
              fromWeight: item.fromWeight ?? null,
              toWeight: item.toWeight ?? null,
            }))
          );
          setLoading(false);
          return;
        }
      }

      const [diffRes, matrixRes, topicStatsRes] = await Promise.all([
        fetchAnalyticsMatrixDiff({
          from: fromVersion,
          to: toVersion,
          limit: 200,
          status: "ALL",
        }),
        fetchAnalyticsMatrix({ limit: 500, topicLimit: 300 }),
        fetchAnalyticsTopicStats({ limit: 500, topicLimit: 300 }),
      ]);

      if (canceled) return;

      const firstError = diffRes.error ?? matrixRes.error ?? topicStatsRes.error;
      if (firstError) {
        setError(firstError);
        setLoading(false);
        return;
      }

      const diff = diffRes.data;
      const changed = diff?.changedCells ?? [];
      const docsById = new Map((matrixRes.data?.docs ?? []).map((doc) => [doc.docId, doc]));
      const topicNameById = new Map(
        (topicStatsRes.data?.topics ?? []).map((topic) => [topic.topicId, topic.topicName])
      );

      const nextRows: ChangedRow[] = changed.map((cell: AnalyticsMatrixDiffCellView) => {
        const doc = docsById.get(cell.docId);
        return {
          docId: cell.docId,
          docTitle: doc?.title?.trim() || cell.docId,
          topicId: cell.topicId,
          topicName: topicNameById.get(cell.topicId)?.trim() || cell.topicId,
          status: cell.status,
          fromWeight: cell.fromWeight ?? null,
          toWeight: cell.toWeight ?? null,
        };
      });

      setAddedCount(diff?.addedCount ?? 0);
      setRemovedCount(diff?.removedCount ?? 0);
      setChangeRate(Number(diff?.changeRate ?? 0));
      setRows(nextRows);
      setLoading(false);
    }

    run();
    return () => {
      canceled = true;
    };
  }, [fromVersion, toVersion, topicId, topicName]);

  const changedDocs = useMemo(() => {
    return new Set(rows.map((row) => row.docId)).size;
  }, [rows]);

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1320px] p-6 md:p-8">
        <section className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 to-blue-950/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                Version Drift: {fromVersion || "-"} {"->"} {toVersion || "-"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {topicId ? `Topic: ${topicName || topicId}` : "Global governance version diff"}
              </p>
            </div>
            <Link
              href="/knowledge/governance"
              className="rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
            >
              Back to Control Center
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs text-slate-400">Added</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-300">{addedCount.toLocaleString()}</div>
          </article>
          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs text-slate-400">Removed</div>
            <div className="mt-2 text-2xl font-semibold text-rose-300">{removedCount.toLocaleString()}</div>
          </article>
          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs text-slate-400">Change Rate</div>
            <div className="mt-2 text-2xl font-semibold text-blue-200">{changeRate.toFixed(2)}%</div>
          </article>
          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs text-slate-400">Changed Docs</div>
            <div className="mt-2 text-2xl font-semibold">{changedDocs.toLocaleString()}</div>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 text-sm font-semibold">Changed Matrix / Changed Docs</div>
          {loading ? <div className="text-xs text-slate-400">Loading...</div> : null}
          {error ? (
            <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>
          ) : null}
          {!loading && !rows.length ? <div className="text-xs text-slate-400">No changed data.</div> : null}
          {rows.length ? (
            <div className="max-h-[34rem] overflow-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Topic</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">fromWeight</th>
                    <th className="px-3 py-2 text-left">toWeight</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.docId}-${row.topicId}-${index}`} className="border-t border-slate-800">
                      <td className="px-3 py-2">
                        <div className="text-slate-100">{row.docTitle}</div>
                        <div className="text-xs text-slate-500">{row.docId}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/knowledge/governance/topic/${encodeURIComponent(
                            row.topicId
                          )}?topicName=${encodeURIComponent(row.topicName)}&docId=${encodeURIComponent(row.docId)}`}
                          className="text-blue-300 underline"
                        >
                          {row.topicName}
                        </Link>
                      </td>
                      <td className={`px-3 py-2 ${row.status === "ADDED" ? "text-emerald-300" : "text-rose-300"}`}>
                        {row.status}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{toFixedOrDash(row.fromWeight)}</td>
                      <td className="px-3 py-2 text-slate-300">{toFixedOrDash(row.toWeight)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}


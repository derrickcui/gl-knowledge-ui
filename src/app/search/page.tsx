"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FacetBucket = {
  dimensionId?: string;
  topicId: string;
  topicName: string;
  count: number;
  fq: string;
};

type FacetGroup = {
  dimensionId: string;
  dimensionName: string;
  total: number;
  buckets: FacetBucket[];
};

type SearchFacetResponse = {
  success: boolean;
  data?: {
    groups?: FacetGroup[];
  } | null;
  error?: string | { message?: string } | null;
};

function normalizeError(error: SearchFacetResponse["error"]) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }
  return "facet request failed";
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFq = searchParams.get("fq") ?? "";
  const currentQuery = searchParams.get("q") ?? "";
  const [groups, setGroups] = useState<FacetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFacets() {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (currentFq) params.append("fq", currentFq);

    const suffix = params.toString();
    const res = await fetch(`/api/search/facets${suffix ? `?${suffix}` : ""}`, {
      cache: "no-store",
    }).catch(() => null);
    setLoading(false);
    if (!res) {
      setError("search-service unreachable");
      return;
    }
    const json = (await res.json().catch(() => null)) as SearchFacetResponse | null;
    if (!json) {
      setError("invalid facet response");
      return;
    }
    if (!json.success) {
      setError(normalizeError(json.error) ?? "facet load failed");
      return;
    }
    setError(null);
    setGroups(Array.isArray(json.data?.groups) ? json.data!.groups! : []);
  }

  useEffect(() => {
    loadFacets();
  }, [currentQuery, currentFq]);

  const selectedBucket = useMemo(
    () =>
      groups.flatMap((group) => group.buckets).find((bucket) => bucket.fq === currentFq),
    [groups, currentFq]
  );

  function updateFq(nextFq?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFq) {
      params.set("fq", nextFq);
    } else {
      params.delete("fq");
    }
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  return (
    <div className="min-h-full bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-[1400px]">
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 to-blue-950/70 p-5">
          <h1 className="text-2xl font-semibold">Search Portal · Semantic Facet</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
            {currentQuery ? (
              <span className="rounded bg-slate-800 px-2 py-1">q={currentQuery}</span>
            ) : null}
            {currentFq ? (
              <span className="rounded bg-blue-900/70 px-2 py-1 text-blue-200">
                fq={currentFq}
              </span>
            ) : (
              <span className="rounded bg-slate-800 px-2 py-1">当前无 facet 过滤</span>
            )}
            {currentFq ? (
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 hover:bg-slate-800"
                onClick={() => updateFq()}
              >
                清除过滤
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[330px_1fr]">
          <aside className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="mb-4 text-sm font-semibold">Topic Facet</div>
            {loading ? <div className="text-xs text-slate-400">加载中...</div> : null}
            {error ? (
              <div className="mb-3 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}
            {!loading && !groups.length ? (
              <div className="text-xs text-slate-400">暂无 facet 数据</div>
            ) : null}
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={`${group.dimensionId}-${group.dimensionName}`}>
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    {group.dimensionName} ({group.total})
                  </div>
                  <div className="space-y-2">
                    {group.buckets.map((bucket) => {
                      const ratio = group.total
                        ? Math.max(6, Math.round((bucket.count / group.total) * 100))
                        : 6;
                      const active = currentFq === bucket.fq;
                      return (
                        <button
                          key={`${bucket.topicId}-${bucket.fq}`}
                          type="button"
                          onClick={() => updateFq(bucket.fq)}
                          className={`w-full rounded-lg border p-2 text-left transition ${
                            active
                              ? "border-blue-400/60 bg-blue-500/15"
                              : "border-slate-700 bg-slate-950/70 hover:border-slate-500"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span>{bucket.topicName}</span>
                            <span>{bucket.count}</span>
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
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="text-sm font-semibold">结果预览</div>
            <p className="mt-2 text-sm text-slate-300">
              {selectedBucket
                ? `当前筛选：${selectedBucket.topicName}（${selectedBucket.topicId}）。过滤参数 ${selectedBucket.fq}`
                : "请选择左侧任一 semantic facet 查看过滤效果。"}
            </p>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              当前参数：
              <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-blue-200">
                {currentFq || "无"}
              </code>
            </div>
            <Link
              href="/knowledge/governance"
              className="mt-4 inline-flex rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
            >
              返回 Semantic Governance Control Center
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

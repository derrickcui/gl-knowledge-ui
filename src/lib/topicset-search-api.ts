import { ApiResult } from "@/lib/api";

const TOPICSET_SEARCH_PROXY = "/api/topicset-search";
const GET_BURST_CACHE_MS = 1000;
const requestPromiseCache = new Map<string, Promise<ApiResult<unknown>>>();
const requestValueCache = new Map<string, { expiresAt: number; value: ApiResult<unknown> }>();

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TopicSetCoverageNodeView = {
  nodeId: string;
  name?: string | null;
  docCount: number;
  topics?: number;
};

export type TopicSetCoverageResponse = {
  version?: number;
  nodes: TopicSetCoverageNodeView[];
};

export type TopicSetCoverageDashboardResponse = {
  version?: number;
  topicSetId: string;
  totalDocs: number;
  classifiedDocs: number;
  unmappedDocs: number;
  nodes: number;
  topics: number;
};

export type TopicSetLowCoverageNodeView = {
  nodeId: string;
  name?: string | null;
  docCount: number;
  topicCount: number;
};

export type TopicSetLowCoverageResponse = {
  version?: number;
  topicSetId: string;
  dedup: boolean;
  threshold: number;
  nodes: TopicSetLowCoverageNodeView[];
};

export type TopicSetOverlapItemView = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
};

export type TopicSetOverlapResponse = {
  version?: number;
  topicSetId: string;
  minOverlap: number;
  totalPairs: number;
  overlaps: TopicSetOverlapItemView[];
};

export type TopicSetOverlapDashboardItemView = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
  docsPath?: string | null;
  explainPathTemplate?: string | null;
};

export type TopicSetOverlapDashboardResponse = {
  version?: number;
  topicSetId: string;
  minOverlap: number;
  limit: number;
  totalPairs: number;
  items: TopicSetOverlapDashboardItemView[];
};

export type TopicSetUnmappedDashboardResponse = {
  version?: number;
  topicSetId: string;
  totalDocs: number;
  classifiedDocs: number;
  unmappedDocs: number;
  sampleSize: number;
  sampleSort?: string | null;
  unmappedDocsPath?: string | null;
  suggestPath?: string | null;
  sampleDocuments: TopicSetDocumentItemView[];
};

export type TopicSetGovernanceDashboardResponse = {
  version?: number;
  topicSetId: string;
  coverage: TopicSetCoverageDashboardResponse;
  unmapped: TopicSetUnmappedDashboardResponse;
  lowCoverage: TopicSetLowCoverageResponse;
  overlap: TopicSetOverlapDashboardResponse;
};

export type TopicSetOverlapExplainNodeView = {
  nodeId?: string | null;
  label?: string | null;
  matched: boolean;
};

export type TopicSetOverlapTopicExplainView = {
  topicId: string;
  topicName: string;
  matched: boolean;
  matchedNodeIds: string[];
  matchedTerms: string[];
  appliedModes?: string[];
  reason?: string | null;
  explain?: TopicSetOverlapExplainNodeView[];
};

export type TopicSetOverlapDocExplainResponse = {
  version?: number;
  topicSetId: string;
  docId: string;
  topicA: TopicSetOverlapTopicExplainView;
  topicB: TopicSetOverlapTopicExplainView;
};

export type TopicSetDocumentItemView = {
  docId: string;
  title?: string | null;
  summary?: string | null;
  highlightFragments?: string[];
};

export type TopicSetDocumentPageResponse = {
  page: number;
  size: number;
  total: number;
  items: TopicSetDocumentItemView[];
};

export type TopicSetDistributionItemView = {
  topicId: string;
  topicName: string;
  docCount: number;
  nodeCount: number;
  nodeIds: string[];
};

export type TopicSetDistributionResponse = {
  version?: number;
  topicSetId: string;
  dedup: boolean;
  totalTopics: number;
  items: TopicSetDistributionItemView[];
};

export type TopicSetNodeDistributionItemView = {
  topicId: string;
  topicName: string;
  docCount: number;
};

export type TopicSetNodeDistributionResponse = {
  version?: number;
  topicSetId: string;
  nodeId: string;
  dedup: boolean;
  totalTopics: number;
  items: TopicSetNodeDistributionItemView[];
};

export type TopicSetRuntimeCacheRefreshResponse = {
  topicSetId: string;
  version: number;
  refreshedAt: string;
};

export type TopicSetDriftSummaryResponse = {
  topicSetId: string;
  version?: number;
  classifiedDocs: number;
  unmappedDocs: number;
  coverageRatio: number;
  overlapCount: number;
};

export type TopicSetDriftOverlapItemView = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
};

export type TopicSetDriftOverlapResponse = {
  topicSetId: string;
  version?: number;
  minOverlap: number;
  totalPairs: number;
  overlaps: TopicSetDriftOverlapItemView[];
};

export type TopicSetDriftKeywordView = {
  term: string;
  frequency: number;
  score: number;
};

export type TopicSetDriftKeywordsResponse = {
  topicSetId: string;
  version?: number;
  sampleDocs: number;
  limit: number;
  keywords: TopicSetDriftKeywordView[];
};

function normalizeError(error: ApiEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") return error.message;
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const cacheKey = method === "GET" ? `${method}:${path}` : null;
  const now = Date.now();
  if (cacheKey) {
    const cached = requestValueCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as ApiResult<T>;
    }
    const inflight = requestPromiseCache.get(cacheKey);
    if (inflight) {
      return inflight as Promise<ApiResult<T>>;
    }
  }

  const requestPromise = (async (): Promise<ApiResult<T>> => {
  try {
    const res = await fetch(path, { cache: "no-store", ...(init ?? {}) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (text) {
        try {
          const parsed = JSON.parse(text) as
            | { error?: ApiErrorShape | string | null; detail?: string; message?: string }
            | null;
          const normalized =
            (parsed && typeof parsed === "object" && typeof parsed.detail === "string" && parsed.detail) ||
            (parsed && typeof parsed === "object" && typeof parsed.message === "string" && parsed.message) ||
            (parsed && typeof parsed === "object" ? normalizeError(parsed.error, "") : "");
          return { data: null, error: normalized || text };
        } catch {
          return { data: null, error: text };
        }
      }
      return { data: null, error: `topicset-search request failed (${res.status})` };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "topicset-search-service unreachable" };
  }
  })();

  if (!cacheKey) {
    return requestPromise;
  }

  requestPromiseCache.set(cacheKey, requestPromise as Promise<ApiResult<unknown>>);
  try {
    const result = await requestPromise;
    requestValueCache.set(cacheKey, {
      expiresAt: Date.now() + GET_BURST_CACHE_MS,
      value: result as ApiResult<unknown>,
    });
    return result;
  } finally {
    requestPromiseCache.delete(cacheKey);
  }
}

async function unwrapEnvelope<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const result = await requestJson<ApiEnvelope<T>>(path, init);
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeError(result.data.error, "topicset-search request failed") };
  }
  if (result.data.data == null) return { data: null, error: "invalid topicset-search response" };
  return { data: result.data.data, error: null };
}

function normalizeTopicSetSearchPath(path: string): string {
  if (path.startsWith(TOPICSET_SEARCH_PROXY) || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/api/topicsets/")) {
    return `${TOPICSET_SEARCH_PROXY}${path.slice("/api".length)}`;
  }
  if (path.startsWith("/internal/topicsets/")) {
    return `${TOPICSET_SEARCH_PROXY}${path}`;
  }
  return path;
}

export async function fetchTopicSetSearchEnvelopeByPath<T>(path: string) {
  return unwrapEnvelope<T>(normalizeTopicSetSearchPath(path));
}

export async function fetchTopicSetCoverage(
  topicSetId: string,
  params?: { dedup?: boolean }
) {
  const query = new URLSearchParams();
  if (params?.dedup != null) query.set("dedup", String(params.dedup));
  return unwrapEnvelope<TopicSetCoverageResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/coverage${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetCoverageDashboard(topicSetId: string) {
  return unwrapEnvelope<TopicSetCoverageDashboardResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/coverage-dashboard`
  );
}

export async function fetchTopicSetGovernanceDashboard(
  topicSetId: string,
  params?: { lowCoverageThreshold?: number; overlapMinOverlap?: number; overlapLimit?: number }
) {
  const query = new URLSearchParams();
  if (params?.lowCoverageThreshold != null) query.set("lowCoverageThreshold", String(params.lowCoverageThreshold));
  if (params?.overlapMinOverlap != null) query.set("overlapMinOverlap", String(params.overlapMinOverlap));
  if (params?.overlapLimit != null) query.set("overlapLimit", String(params.overlapLimit));
  return unwrapEnvelope<TopicSetGovernanceDashboardResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/governance-dashboard${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetUnmappedDashboard(
  topicSetId: string,
  params?: { sampleSize?: number }
) {
  const query = new URLSearchParams();
  if (params?.sampleSize != null) query.set("sampleSize", String(params.sampleSize));
  return unwrapEnvelope<TopicSetUnmappedDashboardResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/unmapped-dashboard${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetLowCoverage(
  topicSetId: string,
  params?: { dedup?: boolean; threshold?: number }
) {
  const query = new URLSearchParams();
  if (params?.dedup != null) query.set("dedup", String(params.dedup));
  if (params?.threshold != null) query.set("threshold", String(params.threshold));
  return unwrapEnvelope<TopicSetLowCoverageResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/low-coverage${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetOverlap(
  topicSetId: string,
  params?: { minOverlap?: number; limit?: number }
) {
  const query = new URLSearchParams();
  if (params?.minOverlap != null) query.set("minOverlap", String(params.minOverlap));
  if (params?.limit != null) query.set("limit", String(params.limit));
  return unwrapEnvelope<TopicSetOverlapResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/overlap${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetOverlapDashboard(
  topicSetId: string,
  params?: { minOverlap?: number; limit?: number }
) {
  const query = new URLSearchParams();
  if (params?.minOverlap != null) query.set("minOverlap", String(params.minOverlap));
  if (params?.limit != null) query.set("limit", String(params.limit));
  return unwrapEnvelope<TopicSetOverlapDashboardResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/overlap-dashboard${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetOverlapDocs(
  topicSetId: string,
  params: {
    topicAId: string;
    topicBId: string;
    page?: number;
    size?: number;
    sort?: "score" | "updatedAt" | "publishedAt";
  }
) {
  const query = new URLSearchParams();
  query.set("topicAId", params.topicAId);
  query.set("topicBId", params.topicBId);
  if (params.page != null) query.set("page", String(params.page));
  if (params.size != null) query.set("size", String(params.size));
  if (params.sort) query.set("sort", params.sort);
  return unwrapEnvelope<TopicSetDocumentPageResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/overlap-docs?${query.toString()}`
  );
}

export async function fetchTopicSetOverlapDocExplain(
  topicSetId: string,
  params: {
    docId: string;
    topicAId: string;
    topicBId: string;
  }
) {
  const query = new URLSearchParams();
  query.set("topicAId", params.topicAId);
  query.set("topicBId", params.topicBId);
  return unwrapEnvelope<TopicSetOverlapDocExplainResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/overlap-docs/${encodeURIComponent(
      params.docId
    )}/explain?${query.toString()}`
  );
}

export async function fetchTopicSetNodeImpact(
  topicSetId: string,
  nodeId: string,
  params?: { page?: number; size?: number; sort?: "score" | "updatedAt" | "publishedAt" }
) {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.sort) query.set("sort", params.sort);
  return unwrapEnvelope<TopicSetDocumentPageResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/nodes/${encodeURIComponent(
      nodeId
    )}/impact${query.toString() ? `?${query.toString()}` : ""}`
  );
}

export async function fetchTopicSetUnmapped(
  topicSetId: string,
  params?: { page?: number; size?: number; sort?: "score" | "updatedAt" | "publishedAt" }
) {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.sort) query.set("sort", params.sort);
  return unwrapEnvelope<TopicSetDocumentPageResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/unmapped${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetDistribution(
  topicSetId: string,
  params?: {
    dedup?: boolean;
    limit?: number;
    sort?: "docCount" | "topicName";
    order?: "asc" | "desc";
  }
) {
  const query = new URLSearchParams();
  if (params?.dedup != null) query.set("dedup", String(params.dedup));
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.sort) query.set("sort", params.sort);
  if (params?.order) query.set("order", params.order);
  return unwrapEnvelope<TopicSetDistributionResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/distribution${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetNodeDistribution(
  topicSetId: string,
  nodeId: string,
  params?: {
    dedup?: boolean;
    limit?: number;
    sort?: "docCount" | "topicName";
    order?: "asc" | "desc";
  }
) {
  const query = new URLSearchParams();
  if (params?.dedup != null) query.set("dedup", String(params.dedup));
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.sort) query.set("sort", params.sort);
  if (params?.order) query.set("order", params.order);
  return unwrapEnvelope<TopicSetNodeDistributionResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/nodes/${encodeURIComponent(
      nodeId
    )}/distribution${query.toString() ? `?${query.toString()}` : ""}`
  );
}

export async function refreshTopicSetRuntimeCache(topicSetId: string) {
  return unwrapEnvelope<TopicSetRuntimeCacheRefreshResponse>(
    `${TOPICSET_SEARCH_PROXY}/internal/topicsets/${encodeURIComponent(topicSetId)}/runtime-cache/refresh`,
    { method: "POST" }
  );
}

export async function fetchTopicSetDriftSummary(topicSetId: string) {
  return unwrapEnvelope<TopicSetDriftSummaryResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/drift`
  );
}

export async function fetchTopicSetDriftOverlap(
  topicSetId: string,
  params?: { minOverlap?: number; limit?: number }
) {
  const query = new URLSearchParams();
  if (params?.minOverlap != null) query.set("minOverlap", String(params.minOverlap));
  if (params?.limit != null) query.set("limit", String(params.limit));
  return unwrapEnvelope<TopicSetDriftOverlapResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/drift/overlap${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

export async function fetchTopicSetDriftKeywords(
  topicSetId: string,
  params?: { limit?: number; sampleDocs?: number }
) {
  const query = new URLSearchParams();
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.sampleDocs != null) query.set("sampleDocs", String(params.sampleDocs));
  return unwrapEnvelope<TopicSetDriftKeywordsResponse>(
    `${TOPICSET_SEARCH_PROXY}/topicsets/${encodeURIComponent(topicSetId)}/drift/keywords${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
}

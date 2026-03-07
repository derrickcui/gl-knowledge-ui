import { ApiResult } from "@/lib/api";

const TOPICSET_SEARCH_PROXY = "/api/topicset-search";

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
};

export type TopicSetCoverageResponse = {
  version?: number;
  nodes: TopicSetCoverageNodeView[];
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

export type TopicSetRuntimeCacheRefreshResponse = {
  topicSetId: string;
  version: number;
  refreshedAt: string;
};

function normalizeError(error: ApiEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") return error.message;
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { cache: "no-store", ...(init ?? {}) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { data: null, error: text || `topicset-search request failed (${res.status})` };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "topicset-search-service unreachable" };
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

export async function refreshTopicSetRuntimeCache(topicSetId: string) {
  return unwrapEnvelope<TopicSetRuntimeCacheRefreshResponse>(
    `${TOPICSET_SEARCH_PROXY}/internal/topicsets/${encodeURIComponent(topicSetId)}/runtime-cache/refresh`,
    { method: "POST" }
  );
}

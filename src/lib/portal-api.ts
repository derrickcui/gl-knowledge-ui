import type { ApiResult } from "@/lib/api";

type PortalEnvelope<T> = {
  success?: boolean;
  data?: T | null;
  error?: string | { message?: string } | null;
};

export type PortalTopicBucket = {
  dimensionId?: string;
  topicId: string;
  topicName: string;
  count: number;
  fq: string;
};

export type PortalTopicGroup = {
  dimensionId?: string;
  dimensionName: string;
  total: number;
  buckets: PortalTopicBucket[];
};

export type PortalHotTopic = {
  topicId: string;
  topicName: string;
  heat?: number;
  trend?: string;
  datasetName?: string;
  namespace?: string;
  weight?: number;
};

export type PortalCatalogTopic = {
  topicId: string;
  topicName: string;
  datasetName?: string;
  namespace?: string;
  weight?: number;
};

export type PortalCatalogGroup = {
  groupId: string;
  groupName: string;
  topics: PortalCatalogTopic[];
};

export type PortalTopicRelated = {
  topicId: string;
  topicName: string;
  score?: number;
};

export type PortalTopicDocument = {
  id?: string;
  docId?: string;
  title?: string;
  summary?: string;
  snippet?: string;
  score?: number;
  topicLabels?: string[];
  topicSignals?: unknown[];
  topicScoreDetails?: unknown[];
  scoreBreakdown?: Record<string, unknown>;
  rankingExplain?: unknown;
  rankExplain?: unknown;
};

export type PortalSearchResponse = {
  query?: string;
  totalHits?: number;
  page?: number;
  size?: number;
  quality?: Record<string, unknown>;
  detectedTopics?: unknown[];
  rewrite?: unknown[];
  filters?: {
    topics?: PortalTopicBucket[];
    groupedTopics?: PortalTopicGroup[];
    raw?: Record<string, unknown>;
  };
  results?: PortalTopicDocument[];
  groupedResults?: unknown[];
  debug?: Record<string, unknown>;
};

export type PortalSearchFacetRequest = {
  query: string;
  filterQueries?: string[];
  limit?: number;
};

export type PortalSearchFacetResponse = {
  groups: PortalTopicGroup[];
};

export type PortalTopicsHotResponse = {
  hotTopics: PortalHotTopic[];
  growthTopics: PortalHotTopic[];
  declineTopics: PortalHotTopic[];
};

export type PortalTopicsCatalogResponse = {
  runtimeVersion?: number;
  totalTopics?: number;
  groups: PortalCatalogGroup[];
};

export type PortalTopicDetailResponse = {
  topicId: string;
  topicName: string;
  datasetName?: string | null;
  namespace?: string | null;
  runtimeVersion?: number | string | null;
  definition?: string | null;
  compiledGql?: string | null;
  weight?: number | null;
  deployModes?: string[] | null;
  relatedTopics?: PortalTopicRelated[];
  relatedDocuments?: PortalTopicDocument[];
};

export type PortalTopicDocumentExplain = {
  topicId?: string;
  docId?: string;
  matched?: boolean;
  score?: number;
  finalExplain?: string;
  rules?: Array<{
    ruleId?: string | null;
    ruleName?: string | null;
    matched?: boolean;
    weightContribution?: number;
    evidence?: Array<{
      field?: string | null;
      text?: string | null;
      start?: number | null;
      end?: number | null;
    }>;
  }>;
};

function normalizeError(error: PortalEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") return error.message;
  return fallback;
}

async function requestPortal<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return { data: null, error: `portal request failed (${res.status} ${res.statusText})` };
    }
    const json = (await res.json()) as T | PortalEnvelope<T>;
    if (
      typeof json === "object" &&
      json !== null &&
      "success" in json &&
      (json as PortalEnvelope<T>).success === false
    ) {
      return {
        data: null,
        error: normalizeError((json as PortalEnvelope<T>).error, "portal request failed"),
      };
    }
    if (
      typeof json === "object" &&
      json !== null &&
      "success" in json &&
      "data" in (json as PortalEnvelope<T>)
    ) {
      return { data: ((json as PortalEnvelope<T>).data ?? null) as T | null, error: null };
    }
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "portal-service unreachable" };
  }
}

export async function fetchPortalTopicsHot(datasetName?: string, topN = 8) {
  const query = new URLSearchParams();
  if (datasetName) query.set("datasetName", datasetName);
  query.set("topN", String(topN));
  return requestPortal<PortalTopicsHotResponse>(`/api/portal/topics/hot?${query.toString()}`);
}

export async function searchPortal(
  payload: {
    query: string;
    page?: number;
    size?: number;
    mode?: string;
    filterQueries?: string[];
    filters?: Array<{
      field: string;
      operator?: string;
      values: string[];
    }>;
  }
) {
  return requestPortal<PortalSearchResponse>("/api/portal/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPortalSearchFacets(payload: PortalSearchFacetRequest) {
  return requestPortal<PortalSearchFacetResponse>("/api/portal/search/facets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPortalTopicsCatalog(datasetName?: string) {
  const query = new URLSearchParams();
  if (datasetName) query.set("datasetName", datasetName);
  const suffix = query.toString();
  return requestPortal<PortalTopicsCatalogResponse>(
    `/api/portal/topics/catalog${suffix ? `?${suffix}` : ""}`
  );
}

export async function fetchPortalTopicDetail(topicId: string, datasetName?: string) {
  const query = new URLSearchParams();
  if (datasetName) query.set("datasetName", datasetName);
  const suffix = query.toString();
  return requestPortal<PortalTopicDetailResponse>(
    `/api/portal/topics/${encodeURIComponent(topicId)}${suffix ? `?${suffix}` : ""}`
  );
}

export async function searchPortalTopic(
  topicId: string,
  payload: { query?: string; page?: number; size?: number; mode?: string }
) {
  return requestPortal<PortalSearchResponse>(
    `/api/portal/topics/${encodeURIComponent(topicId)}/search`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchPortalTopicDocumentExplain(topicId: string, docId: string) {
  return requestPortal<PortalTopicDocumentExplain>(
    `/api/portal/topics/${encodeURIComponent(topicId)}/documents/${encodeURIComponent(docId)}/explain`
  );
}

import { ApiResult } from "@/lib/api";

const TOPICSETS_API_PROXY = "/api/topicsets";
const TOPICS_API_PROXY = "/api/topics";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TopicSimulationRule = {
  topicId: string;
  topicName?: string | null;
  compiledGql: string;
};

export type TopicSetSimulationNodeTopic = TopicSimulationRule;

export type TopicSetSimulationNode = {
  nodeId: string;
  name?: string | null;
  topics: TopicSetSimulationNodeTopic[];
};

export type TopicSetDraftPayload = {
  dataset?: string;
  nodes: TopicSetSimulationNode[];
};

export type TopicSimulateResponse = {
  docCount: number;
  sampleDocs?: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
  }>;
};

export type TopicSimulateImpactResponse = {
  total: number;
  page: number;
  size: number;
  documents: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
    score?: number | null;
  }>;
};

export type TopicSetSimulateCoverageResponse = {
  totalDocs: number;
  classifiedDocs: number;
  unmappedDocs: number;
  nodes: Array<{
    nodeId: string;
    name?: string | null;
    docCount: number;
  }>;
};

export type TopicSetSimulateOverlapResponse = {
  totalPairs: number;
  overlaps: Array<{
    topicAId: string;
    topicAName?: string | null;
    topicBId: string;
    topicBName?: string | null;
    overlapDocs: number;
  }>;
};

export type TopicSetSimulateImpactResponse = {
  nodeId: string;
  nodeName?: string | null;
  total: number;
  page: number;
  size: number;
  documents: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
    summary?: string | null;
    score?: number | null;
  }>;
};

export type TopicSetSimulateUnmappedResponse = {
  total: number;
  page: number;
  size: number;
  documents: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
    summary?: string | null;
    score?: number | null;
  }>;
};

export type TopicSetSimulateOverlapDocsResponse = {
  total: number;
  page: number;
  size: number;
  documents: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
    summary?: string | null;
    highlightFragments?: string[];
    score?: number | null;
  }>;
};

export type TopicSetSimulateOverlapExplainResponse = {
  docId: string;
  topicA: {
    topicId: string;
    topicName: string;
    matched: boolean;
    matchedNodeIds: string[];
    matchedTerms: string[];
    appliedModes?: string[];
    reason?: string | null;
    explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
  };
  topicB: {
    topicId: string;
    topicName: string;
    matched: boolean;
    matchedNodeIds: string[];
    matchedTerms: string[];
    appliedModes?: string[];
    reason?: string | null;
    explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
  };
};

export type TopicSetSimulateDashboardResponse = {
  coverage?: TopicSetSimulateCoverageResponse | null;
  overlap?: TopicSetSimulateOverlapResponse | null;
  unmappedDocs?: number;
  unmappedSampleDocs?: Array<{
    id?: string | null;
    docId?: string | null;
    title?: string | null;
  }>;
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
      return {
        data: null,
        error: text || `simulation request failed (${res.status})`,
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "simulation-service unreachable" };
  }
}

async function unwrapEnvelope<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const result = await requestJson<ApiEnvelope<T>>(path, init);
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeError(result.data.error, "simulation request failed") };
  }
  if (result.data.data == null) {
    return { data: null, error: "invalid simulation response" };
  }
  return { data: result.data.data, error: null };
}

export async function simulateTopic(payload: {
  dataset?: string;
  sampleSize?: number;
  rule: TopicSimulationRule;
}) {
  return unwrapEnvelope<TopicSimulateResponse>(`${TOPICS_API_PROXY}/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicImpact(payload: {
  dataset?: string;
  page?: number;
  size?: number;
  sort?: string;
  rule: TopicSimulationRule;
}) {
  return unwrapEnvelope<TopicSimulateImpactResponse>(`${TOPICS_API_PROXY}/simulate-impact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetCoverage(payload: {
  dedup?: boolean;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateCoverageResponse>(`${TOPICSETS_API_PROXY}/simulate-coverage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetOverlap(payload: {
  minOverlap?: number;
  limit?: number;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateOverlapResponse>(`${TOPICSETS_API_PROXY}/simulate-overlap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetImpact(payload: {
  nodeId: string;
  page?: number;
  size?: number;
  sort?: string;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateImpactResponse>(`${TOPICSETS_API_PROXY}/simulate-impact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetUnmapped(payload: {
  page?: number;
  size?: number;
  sort?: string;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateUnmappedResponse>(`${TOPICSETS_API_PROXY}/simulate-unmapped`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetOverlapDocs(payload: {
  topicAId: string;
  topicBId: string;
  page?: number;
  size?: number;
  sort?: string;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateOverlapDocsResponse>(`${TOPICSETS_API_PROXY}/simulate-overlap-docs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function simulateTopicSetOverlapExplain(
  docId: string,
  payload: {
    topicAId: string;
    topicBId: string;
    topicSetDraft: TopicSetDraftPayload;
  }
) {
  return unwrapEnvelope<TopicSetSimulateOverlapExplainResponse>(
    `${TOPICSETS_API_PROXY}/simulate-overlap-docs/${encodeURIComponent(docId)}/explain`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function simulateTopicSetDashboard(payload: {
  dedup?: boolean;
  overlapMinOverlap?: number;
  overlapLimit?: number;
  unmappedSampleSize?: number;
  unmappedSort?: string;
  topicSetDraft: TopicSetDraftPayload;
}) {
  return unwrapEnvelope<TopicSetSimulateDashboardResponse>(`${TOPICSETS_API_PROXY}/simulate-dashboard`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

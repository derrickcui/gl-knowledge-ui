import { ApiResult } from "@/lib/api";

const GOVERNANCE_TOPIC_SIGNALS_PROXY = "/api/governance/topic-signals";
const GOVERNANCE_DOWN_MESSAGE = "governance-service unreachable";
const GOVERNANCE_ERROR_MESSAGE = "governance-service request failed";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TopicSignalSnapshotTopicView = {
  topicId: string;
  topicName?: string | null;
  topicVersion?: number | null;
  dataset?: string | null;
  matchedDocs: number;
  totalDocs: number;
  percentage: number;
};

export type TopicSignalSnapshotView = {
  snapshotId: string;
  label?: string | null;
  capturedAt: string;
  topicRuntimeVersion?: number | null;
  topics: TopicSignalSnapshotTopicView[];
};

export type TopicSignalVersionDiffItemView = {
  topicId: string;
  topicName?: string | null;
  baselineTopicVersion?: number | null;
  currentTopicVersion?: number | null;
  baselineMatchedDocs: number;
  currentMatchedDocs: number;
  matchedDocsDelta: number;
  baselinePercentage: number;
  currentPercentage: number;
  percentageDelta: number;
  baselineNodeCount: number;
  currentNodeCount: number;
  addedNodeCount: number;
  removedNodeCount: number;
};

export type TopicSignalVersionDiffResponse = {
  baseline: TopicSignalSnapshotView;
  current: TopicSignalSnapshotView;
  topics: TopicSignalVersionDiffItemView[];
};

export type TopicSignalTimelinePointView = {
  snapshotId: string;
  label?: string | null;
  capturedAt: string;
  topicRuntimeVersion?: number | null;
  topicVersion?: number | null;
  matchedDocs: number;
  totalDocs: number;
  percentage: number;
};

export type TopicSignalTimelineResponse = {
  topicId: string;
  dataset?: string | null;
  points: TopicSignalTimelinePointView[];
};

function normalizeError(error: ApiEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

async function buildErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) return text;
  const status = res.status ? ` (${res.status} ${res.statusText})` : "";
  return `${fallback}${status}`.trim();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, init);
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, GOVERNANCE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: GOVERNANCE_DOWN_MESSAGE };
  }
}

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "success" in value &&
      typeof (value as { success?: unknown }).success === "boolean"
  );
}

async function unwrapOrReturn<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await requestJson<unknown>(path, { cache: "no-store", ...(init ?? {}) });
  if (!res.data) return { data: null, error: res.error };

  if (isEnvelope<T>(res.data)) {
    if (!res.data.success) {
      return {
        data: null,
        error: normalizeError(res.data.error, "governance request failed"),
      };
    }
    if (res.data.data == null) {
      return { data: null, error: "invalid governance response" };
    }
    return { data: res.data.data, error: null };
  }

  return { data: res.data as T, error: null };
}

export async function captureTopicSignalSnapshot(payload: {
  label?: string;
  dashboard?: {
    topicIds?: string[];
    datasetName?: string;
    includeStatistics?: boolean;
    includeRuntime?: boolean;
    includeCompiledGql?: boolean;
    includeAiContext?: boolean;
    includeStructureStats?: boolean;
  };
}) {
  return unwrapOrReturn<TopicSignalSnapshotView>(
    `${GOVERNANCE_TOPIC_SIGNALS_PROXY}/snapshots`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchTopicSignalTimeline(payload: {
  topicId: string;
  dataset?: string;
  limit?: number;
}) {
  return unwrapOrReturn<TopicSignalTimelineResponse>(
    `${GOVERNANCE_TOPIC_SIGNALS_PROXY}/timeline`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchTopicSignalVersionDiff(payload: {
  baselineSnapshotId: string;
  currentSnapshotId: string;
}) {
  return unwrapOrReturn<TopicSignalVersionDiffResponse>(
    `${GOVERNANCE_TOPIC_SIGNALS_PROXY}/version-diff`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}


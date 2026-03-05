import { ApiResult } from "@/lib/api";

const GOVERNANCE_COVERAGE_PROXY = "/api/governance/coverage";
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

export type TopicCoverageOverviewResponse = {
  dataset?: string;
  totalDocs: number;
  topics: number;
  overallCoverageRate: number;
  coveredDocs: number;
  uncoveredDocs: number;
  multiHitDocs: number;
  averageTopicsPerDoc: number;
  runtimeVersion?: string | null;
  generatedAt?: string | null;
  truncated?: boolean;
};

export type TopicCoverageTopicItem = {
  topicId: string;
  topicName?: string | null;
  deployModes?: string[];
  hitDocs: number;
  coverageRate: number;
  namespace?: string | null;
};

export type TopicCoverageTopicsResponse = {
  dataset?: string;
  totalDocs?: number;
  runtimeVersion?: string | null;
  generatedAt?: string | null;
  truncated?: boolean;
  topics: TopicCoverageTopicItem[];
};

export type TopicCoverageDistributionBucket = {
  hitCount: string;
  docCount: number;
};

export type TopicCoverageDistributionResponse = {
  dataset?: string;
  totalDocs?: number;
  runtimeVersion?: string | null;
  generatedAt?: string | null;
  truncated?: boolean;
  distribution: TopicCoverageDistributionBucket[];
};

export type TopicCoverageBlindspotDoc = {
  docId: string;
  title?: string | null;
};

export type TopicCoverageBlindspotsResponse = {
  dataset?: string;
  totalDocs?: number;
  uncoveredDocs: number;
  limit?: number;
  runtimeVersion?: string | null;
  generatedAt?: string | null;
  truncated?: boolean;
  docs: TopicCoverageBlindspotDoc[];
};

export type TopicCoverageControlModeItem = {
  mode: string;
  topics: number;
  coveredDocs: number;
  coverageRate: number;
};

export type TopicCoverageControlResponse = {
  dataset?: string;
  totalDocs?: number;
  runtimeVersion?: string | null;
  generatedAt?: string | null;
  truncated?: boolean;
  modes: TopicCoverageControlModeItem[];
};

export type TopicCoverageRecomputeResponse = {
  dataset?: string;
  runtimeVersion?: string | null;
  recomputedAt?: string | null;
  truncated?: boolean;
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

function buildQuery(params?: { datasetName?: string; limit?: number }) {
  const url = new URL("http://localhost");
  if (params?.datasetName) url.searchParams.set("datasetName", params.datasetName);
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  return url.search;
}

export async function fetchCoverageOverview(params?: { datasetName?: string }) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageOverviewResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/overview${query}`
  );
}

export async function fetchCoverageTopics(params?: { datasetName?: string }) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageTopicsResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/topics${query}`
  );
}

export async function fetchCoverageDistribution(params?: { datasetName?: string }) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageDistributionResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/distribution${query}`
  );
}

export async function fetchCoverageBlindspots(params?: {
  datasetName?: string;
  limit?: number;
}) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageBlindspotsResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/blindspots${query}`
  );
}

export async function fetchCoverageControl(params?: { datasetName?: string }) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageControlResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/control${query}`
  );
}

export async function recomputeCoverage(params?: { datasetName?: string }) {
  const query = buildQuery(params);
  return unwrapOrReturn<TopicCoverageRecomputeResponse>(
    `${GOVERNANCE_COVERAGE_PROXY}/recompute${query}`,
    { method: "POST" }
  );
}


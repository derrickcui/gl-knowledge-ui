import { ApiResult } from "@/lib/api";

const ANALYTICS_API_PROXY = "/api/analytics";
const ANALYTICS_SERVICE_DOWN_MESSAGE = "analytics-service unreachable";
const ANALYTICS_SERVICE_ERROR_MESSAGE = "analytics-service request failed";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type AnalyticsOverviewView = {
  totalDocs: number;
  totalTopics: number;
  runtimeVersion: string | null;
  taggedDocs: number;
  coverageRate: number;
  lastRetagTime: string | null;
};

export type AnalyticsCoverageDimensionView = {
  dimensionId: string;
  totalDocs: number;
  coveredDocs: number;
  coverageRate: number;
};

export type AnalyticsCoverageView = {
  totalDocs: number;
  dimensions: AnalyticsCoverageDimensionView[];
};

export type AnalyticsTrendPointView = {
  date: string;
  count: number;
};

export type AnalyticsTrendView = {
  topicId: string;
  range: string;
  points: AnalyticsTrendPointView[];
};

export type AnalyticsDriftView = {
  topicId: string;
  from: string;
  to: string;
  added: number;
  removed: number;
};

export type AnalyticsMatrixMetaView = {
  dataset?: string;
  runtimeVersion?: string;
  timeRange?: string;
  mode?: string;
  generatedAt?: string;
  docCount?: number;
  topicCount?: number;
};

export type AnalyticsMatrixDimensionView = {
  dimensionId: string;
  dimensionName: string;
};

export type AnalyticsMatrixDocView = {
  docId: string;
  title?: string | null;
  score?: number | null;
};

export type AnalyticsMatrixTopicView = {
  topicId: string;
  topicName: string;
  dimensionId?: string | null;
  dimensionName?: string | null;
};

export type AnalyticsMatrixCellView = {
  docId: string;
  topicId: string;
  weight: number;
  hitCount?: number;
  confidence?: number;
  runtimeVersion?: string;
};

export type AnalyticsMatrixRowTotalView = {
  docId: string;
  topicCount: number;
  avgWeight?: number;
};

export type AnalyticsMatrixColumnTotalView = {
  topicId: string;
  docCount: number;
  avgWeight?: number;
};

export type AnalyticsMatrixAggregatesView = {
  rowTotals?: AnalyticsMatrixRowTotalView[];
  columnTotals?: AnalyticsMatrixColumnTotalView[];
};

export type AnalyticsMatrixView = {
  meta?: AnalyticsMatrixMetaView;
  dimensions?: AnalyticsMatrixDimensionView[];
  docs: AnalyticsMatrixDocView[];
  topics?: AnalyticsMatrixTopicView[];
  cells?: AnalyticsMatrixCellView[];
  aggregates?: AnalyticsMatrixAggregatesView;
  rowTotals?: AnalyticsMatrixRowTotalView[];
  columnTotals?: AnalyticsMatrixColumnTotalView[];
};

export type AnalyticsRuntimeStatusView = {
  runtimeVersion: string | null;
  jobsRunning: number;
  incrementalEnabled: boolean;
  lastIncrementalTagTime: string | null;
};

export type AnalyticsMatrixDiffStatus = "ALL" | "ADDED" | "REMOVED";

export type AnalyticsMatrixDiffCellView = {
  docId: string;
  topicId: string;
  status: "ADDED" | "REMOVED";
  fromWeight?: number | null;
  toWeight?: number | null;
};

export type AnalyticsMatrixDiffView = {
  meta?: AnalyticsMatrixMetaView;
  fromVersion: string;
  toVersion: string;
  offset: number;
  limit: number;
  status: AnalyticsMatrixDiffStatus;
  totalChanged: number;
  addedCount: number;
  removedCount: number;
  changeRate: number;
  changedCells: AnalyticsMatrixDiffCellView[];
};

export type AnalyticsTopicStatItemView = {
  topicId: string;
  topicName: string;
  dimensionId?: string | null;
  dimensionName?: string | null;
  docCount: number;
  avgWeight: number;
  coverageRate: number;
};

export type AnalyticsTopicStatsView = {
  meta?: AnalyticsMatrixMetaView;
  topics: AnalyticsTopicStatItemView[];
};

export type AnalyticsDocStatItemView = {
  docId: string;
  title?: string | null;
  topicCount: number;
  avgWeight: number;
};

export type AnalyticsDocStatsView = {
  meta?: AnalyticsMatrixMetaView;
  docs: AnalyticsDocStatItemView[];
};

export type AnalyticsTopicCorrelationItemView = {
  topicA: string;
  topicB: string;
  score: number;
  cooccurDocs: number;
};

export type AnalyticsTopicCorrelationView = {
  meta?: AnalyticsMatrixMetaView;
  topics?: AnalyticsMatrixTopicView[];
  correlation: AnalyticsTopicCorrelationItemView[];
};

export type AnalyticsMatrixQueryParams = {
  limit?: number;
  q?: string;
  topicLimit?: number;
  dimension?: string;
  runtime?: string;
  timeRange?: string;
};

async function buildErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) return text;
  const status = res.status ? ` (${res.status} ${res.statusText})` : "";
  return `${fallback}${status}`.trim();
}

async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, ANALYTICS_SERVICE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: ANALYTICS_SERVICE_DOWN_MESSAGE };
  }
}

function normalizeError(error: ApiEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

async function unwrapEnvelope<T>(
  path: string
): Promise<ApiResult<T>> {
  const res = await requestJson<ApiEnvelope<T>>(path, { cache: "no-store" });
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "analytics request failed"),
    };
  }
  if (res.data.data == null) {
    return { data: null, error: "invalid analytics response" };
  }
  return { data: res.data.data, error: null };
}

export async function fetchAnalyticsOverview() {
  return unwrapEnvelope<AnalyticsOverviewView>(`${ANALYTICS_API_PROXY}/overview`);
}

export async function fetchAnalyticsCoverage() {
  return unwrapEnvelope<AnalyticsCoverageView>(`${ANALYTICS_API_PROXY}/coverage`);
}

export async function fetchAnalyticsTrend(params: {
  topicId: string;
  range?: string;
}) {
  const url = new URL(`${ANALYTICS_API_PROXY}/trend`, "http://localhost");
  url.searchParams.set("topicId", params.topicId);
  if (params.range) url.searchParams.set("range", params.range);
  return unwrapEnvelope<AnalyticsTrendView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsDrift(params: {
  topicId: string;
  from?: string;
  to?: string;
}) {
  const url = new URL(`${ANALYTICS_API_PROXY}/drift`, "http://localhost");
  url.searchParams.set("topicId", params.topicId);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  return unwrapEnvelope<AnalyticsDriftView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsMatrix(params?: AnalyticsMatrixQueryParams) {
  const url = new URL(`${ANALYTICS_API_PROXY}/matrix`, "http://localhost");
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.topicLimit != null) {
    url.searchParams.set("topicLimit", String(params.topicLimit));
  }
  if (params?.dimension) url.searchParams.set("dimension", params.dimension);
  if (params?.runtime) url.searchParams.set("runtime", params.runtime);
  if (params?.timeRange) url.searchParams.set("timeRange", params.timeRange);
  return unwrapEnvelope<AnalyticsMatrixView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsRuntimeStatus() {
  return unwrapEnvelope<AnalyticsRuntimeStatusView>(
    `${ANALYTICS_API_PROXY}/runtime-status`
  );
}

export async function fetchAnalyticsMatrixDiff(params: {
  from: string;
  to: string;
  limit?: number;
  offset?: number;
  status?: AnalyticsMatrixDiffStatus;
  q?: string;
  topicLimit?: number;
  dimension?: string;
  timeRange?: string;
}) {
  const url = new URL(`${ANALYTICS_API_PROXY}/matrix/diff`, "http://localhost");
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
  if (params.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params.offset != null) url.searchParams.set("offset", String(params.offset));
  if (params.status) url.searchParams.set("status", params.status);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.topicLimit != null) {
    url.searchParams.set("topicLimit", String(params.topicLimit));
  }
  if (params.dimension) url.searchParams.set("dimension", params.dimension);
  if (params.timeRange) url.searchParams.set("timeRange", params.timeRange);
  return unwrapEnvelope<AnalyticsMatrixDiffView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsTopicStats(params?: AnalyticsMatrixQueryParams) {
  const url = new URL(`${ANALYTICS_API_PROXY}/topic-stats`, "http://localhost");
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.topicLimit != null) {
    url.searchParams.set("topicLimit", String(params.topicLimit));
  }
  if (params?.dimension) url.searchParams.set("dimension", params.dimension);
  if (params?.runtime) url.searchParams.set("runtime", params.runtime);
  if (params?.timeRange) url.searchParams.set("timeRange", params.timeRange);
  return unwrapEnvelope<AnalyticsTopicStatsView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsDocStats(params?: AnalyticsMatrixQueryParams) {
  const url = new URL(`${ANALYTICS_API_PROXY}/doc-stats`, "http://localhost");
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.topicLimit != null) {
    url.searchParams.set("topicLimit", String(params.topicLimit));
  }
  if (params?.dimension) url.searchParams.set("dimension", params.dimension);
  if (params?.runtime) url.searchParams.set("runtime", params.runtime);
  if (params?.timeRange) url.searchParams.set("timeRange", params.timeRange);
  return unwrapEnvelope<AnalyticsDocStatsView>(`${url.pathname}${url.search}`);
}

export async function fetchAnalyticsTopicCorrelation(
  params?: AnalyticsMatrixQueryParams
) {
  const url = new URL(
    `${ANALYTICS_API_PROXY}/topic-correlation`,
    "http://localhost"
  );
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.topicLimit != null) {
    url.searchParams.set("topicLimit", String(params.topicLimit));
  }
  if (params?.dimension) url.searchParams.set("dimension", params.dimension);
  if (params?.runtime) url.searchParams.set("runtime", params.runtime);
  if (params?.timeRange) url.searchParams.set("timeRange", params.timeRange);
  return unwrapEnvelope<AnalyticsTopicCorrelationView>(
    `${url.pathname}${url.search}`
  );
}

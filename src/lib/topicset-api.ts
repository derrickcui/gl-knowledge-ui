import { ApiResult } from "@/lib/api";

const TOPICSETS_API_PROXY = "/api/topicsets";
const TOPICSET_SERVICE_DOWN_MESSAGE = "topicset-service unreachable";
const TOPICSET_SERVICE_ERROR_MESSAGE = "topicset-service request failed";

type ApiErrorShape = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TopicSetValidationIssue = {
  nodeId?: string | null;
  parentId?: string | null;
  path?: string | null;
  message: string;
};

export type TopicSetCoverageConflict = {
  nodeId: string;
  path: string;
  conflictingNodeId: string;
  conflictingPath: string;
  message: string;
};

export type TopicSetValidationDetails = {
  cycleStructure: TopicSetValidationIssue[];
  orphanNodes: TopicSetValidationIssue[];
  unboundTopics: TopicSetValidationIssue[];
  coverageConflicts: TopicSetCoverageConflict[];
};

type TopicSetApiResult<T> = ApiResult<T> & {
  errorDetails?: TopicSetValidationDetails | null;
  status?: number;
  etag?: string | null;
};

export type TopicSetSummary = {
  id: string;
  name: string;
  namespace?: string | null;
  status: string;
  version: number;
  currentVersion?: number;
};

export type TopicSetDetail = {
  id: string;
  name: string;
  namespace?: string | null;
  description?: string | null;
  status: string;
  version: number;
  currentVersion?: number;
  nodeCount: number;
  topicCount: number;
};

export type TopicSetNode = {
  id: string;
  parentId?: string | null;
  name: string;
  path: string;
  depth?: number;
  hasChildren?: boolean;
  childCount?: number;
  topicCount?: number;
  docCount?: number;
  children: TopicSetNode[];
};

export type TopicSetNodeItem = {
  id: string;
  parentId?: string | null;
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  topicCount: number;
  docCount: number;
};

export type TopicSetNodeListResponse = {
  topicSetId: string;
  version: number;
  parentId?: string | null;
  items: TopicSetNodeItem[];
  nextCursor?: string | null;
  total: number;
};

export type TopicSetNodeDetail = {
  id: string;
  topicSetId: string;
  parentId?: string | null;
  name: string;
  description?: string | null;
  path: string;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  topicCount: number;
  docCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TopicSetVersionItem = {
  version: number;
  status: string;
  createdAt?: string;
};

export type TopicSetLifecycleResponse = {
  status: string;
  version: number;
};

export type TopicSetDiffStatus = "ADDED" | "REMOVED" | "MOVED" | "UPDATED" | "UNCHANGED";

export type TopicSetDiffSummary = {
  nodesAdded: number;
  nodesRemoved: number;
  nodesMoved: number;
  nodesUpdated: number;
  topicBindingsChanged: number;
};

export type TopicSetDiffNode = {
  nodeId: string;
  status: TopicSetDiffStatus;
  name?: string | null;
  path?: string | null;
  oldPath?: string | null;
  newPath?: string | null;
  oldName?: string | null;
  newName?: string | null;
};

export type TopicSetTopicBindingDiffItem = {
  nodeId: string;
  topicId: string;
  topicName?: string | null;
  change: "ADDED" | "REMOVED";
};

export type TopicSetDiffResponse = {
  summary: TopicSetDiffSummary;
  nodes: TopicSetDiffNode[];
  topicBindings: TopicSetTopicBindingDiffItem[];
};

export type TopicSetDriftHistoryItem = {
  snapshotDate: string;
  publishedVersion: number;
  totalDocs: number;
  classifiedDocs: number;
  unmappedDocs: number;
  coverageRatio: number;
  overlapDocCount: number;
  overlapRatio: number;
  healthScore: number;
};

export type TopicSetDriftHistoryResponse = {
  topicSetId: string;
  history: TopicSetDriftHistoryItem[];
};

export type TopicSetDriftHealthTrend = "UP" | "DOWN" | "FLAT";

export type TopicSetDriftHealthResponse = {
  topicSetId: string;
  snapshotDate?: string | null;
  publishedVersion?: number | null;
  healthScore?: number | null;
  trend: TopicSetDriftHealthTrend;
  coverageRatio?: number | null;
  unmappedDocs?: number | null;
  overlapDocCount?: number | null;
};

export type TopicSetDriftDashboardResponse = {
  topicSetId: string;
  healthScore?: number | null;
  coverageDrift: number;
  overlapDrift: number;
  unmappedIncrease: number;
  lastAnalysis?: string | null;
};

export type NodeTopicView = {
  topicId: string;
  topicName?: string | null;
  score?: number | null;
};

type TopicSetSummaryList = TopicSetSummary[];

function normalizeTopicSetSummary(item: TopicSetSummary): TopicSetSummary {
  return {
    ...item,
    version: item.version ?? item.currentVersion ?? 0,
  };
}

function normalizeTopicSetDetail(item: TopicSetDetail): TopicSetDetail {
  return {
    ...item,
    version: item.version ?? item.currentVersion ?? 0,
  };
}

function withIfMatch(etag?: string | null, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers ?? {});
  if (etag) {
    nextHeaders.set("if-match", etag);
  }
  return nextHeaders;
}

type NodeTreeResponse = {
  nodes: TopicSetNode[];
};

type NodeTopicsResponse = {
  items?: NodeTopicView[];
  topics?: NodeTopicView[];
  nextCursor?: string | null;
  total?: number;
};

type TopicSetVersionsResponse = {
  items?: TopicSetVersionItem[];
  versions?: TopicSetVersionItem[];
};

type PublishResponse = {
  version?: number;
  publishedVersion?: number;
  status?: string;
};

type RestoreTopicSetVersionResponse = {
  topicSetId: string;
  draftVersion: number;
  sourceVersion: number;
  status: string;
};

type RollbackTopicSetVersionResponse = {
  topicSetId: string;
  publishedVersion: number;
  restoredFromVersion: number;
  status: string;
};

type CreateNodeResponse = {
  node: TopicSetNodeItem;
};

function normalizeError(error: ApiEnvelope<unknown>["error"], fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function isValidationDetails(value: unknown): value is TopicSetValidationDetails {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.cycleStructure) &&
    Array.isArray(record.orphanNodes) &&
    Array.isArray(record.unboundTopics) &&
    Array.isArray(record.coverageConflicts)
  );
}

async function buildErrorPayload(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const parsed = JSON.parse(text) as ApiEnvelope<unknown> | { error?: ApiErrorShape; message?: string };
      const envelopeError =
        parsed && typeof parsed === "object" && "error" in parsed ? parsed.error : undefined;
      const message =
        (typeof envelopeError === "object" && envelopeError?.message) ||
        (typeof parsed === "object" && parsed && "message" in parsed && typeof parsed.message === "string"
          ? parsed.message
          : text);
      const details =
        typeof envelopeError === "object" && envelopeError && isValidationDetails(envelopeError.details)
          ? envelopeError.details
          : null;
      return { message, details };
    } catch {
      return { message: text, details: null };
    }
  }
  const status = res.status ? ` (${res.status} ${res.statusText})` : "";
  return { message: `${fallback}${status}`.trim(), details: null };
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<TopicSetApiResult<T>> {
  try {
    const res = await fetch(input, init);
    const etag = res.headers.get("etag");
    if (!res.ok) {
      const errorPayload = await buildErrorPayload(res, TOPICSET_SERVICE_ERROR_MESSAGE);
      return {
        data: null,
        error: errorPayload.message,
        errorDetails: errorPayload.details,
        status: res.status,
        etag,
      };
    }
    return { data: (await res.json()) as T, error: null, errorDetails: null, status: res.status, etag };
  } catch {
    return { data: null, error: TOPICSET_SERVICE_DOWN_MESSAGE, errorDetails: null, etag: null };
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

async function unwrapOrReturn<T>(path: string, init?: RequestInit): Promise<TopicSetApiResult<T>> {
  const res = await requestJson<unknown>(path, { cache: "no-store", ...(init ?? {}) });
  if (!res.data) {
    return {
      data: null,
      error: res.error,
      errorDetails: res.errorDetails ?? null,
      status: res.status,
      etag: res.etag ?? null,
    };
  }

  if (isEnvelope<T>(res.data)) {
    if (!res.data.success) {
      const details =
        typeof res.data.error === "object" && res.data.error && isValidationDetails(res.data.error.details)
          ? res.data.error.details
          : null;
      return {
        data: null,
        error: normalizeError(res.data.error, "topicset request failed"),
        errorDetails: details,
        status: res.status,
        etag: res.etag ?? null,
      };
    }
    if (res.data.data == null) {
      return {
        data: null,
        error: "invalid topicset response",
        errorDetails: null,
        status: res.status,
        etag: res.etag ?? null,
      };
    }
    return { data: res.data.data, error: null, errorDetails: null, status: res.status, etag: res.etag ?? null };
  }

  return { data: res.data as T, error: null, errorDetails: null, status: res.status, etag: res.etag ?? null };
}

export async function listTopicSets() {
  const result = await unwrapOrReturn<TopicSetSummaryList>(TOPICSETS_API_PROXY);
  if (!result.data) return result;
  return {
    ...result,
    data: result.data.map(normalizeTopicSetSummary),
  };
}

export async function createTopicSet(payload: {
  name: string;
  namespace?: string | null;
  description?: string | null;
}) {
  const result = await unwrapOrReturn<TopicSetSummary>(TOPICSETS_API_PROXY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.data) return result;
  return {
    ...result,
    data: normalizeTopicSetSummary(result.data),
  };
}

export async function getTopicSet(id: string) {
  const result = await unwrapOrReturn<TopicSetDetail>(`${TOPICSETS_API_PROXY}/${encodeURIComponent(id)}`);
  if (!result.data) return result;
  return {
    ...result,
    data: normalizeTopicSetDetail(result.data),
  };
}

export async function getTopicSetTree(id: string): Promise<ApiResult<TopicSetNode[]>> {
  const result = await unwrapOrReturn<NodeTreeResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(id)}/tree`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data.nodes ?? [], error: null };
}

export async function listTopicSetNodes(params: {
  topicSetId: string;
  parentId?: string | null;
  cursor?: string;
  limit?: number;
  version?: number | null;
  includeStats?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.parentId) query.set("parentId", params.parentId);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.version != null) query.set("version", String(params.version));
  if (params.includeStats != null) query.set("includeStats", String(params.includeStats));
  const suffix = query.toString();
  return unwrapOrReturn<TopicSetNodeListResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(params.topicSetId)}/nodes${suffix ? `?${suffix}` : ""}`
  );
}

export async function listTopicSetNodeChildren(params: {
  topicSetId: string;
  nodeId: string;
  cursor?: string;
  limit?: number;
  version?: number | null;
  includeStats?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.version != null) query.set("version", String(params.version));
  if (params.includeStats != null) query.set("includeStats", String(params.includeStats));
  const suffix = query.toString();
  return unwrapOrReturn<TopicSetNodeListResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(params.topicSetId)}/nodes/${encodeURIComponent(
      params.nodeId
    )}/children${suffix ? `?${suffix}` : ""}`
  );
}

export async function listTopicSetVersionNodes(params: {
  topicSetId: string;
  version: number;
  parentId?: string | null;
  cursor?: string;
  limit?: number;
  includeStats?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.parentId) query.set("parentId", params.parentId);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.includeStats != null) query.set("includeStats", String(params.includeStats));
  const suffix = query.toString();
  return unwrapOrReturn<TopicSetNodeListResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(params.topicSetId)}/versions/${params.version}/nodes${
      suffix ? `?${suffix}` : ""
    }`
  );
}

export async function getTopicSetNodeDetail(params: {
  topicSetId: string;
  nodeId: string;
  version?: number | null;
  includeStats?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.version != null) query.set("version", String(params.version));
  if (params.includeStats != null) query.set("includeStats", String(params.includeStats));
  const suffix = query.toString();
  return unwrapOrReturn<TopicSetNodeDetail>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(params.topicSetId)}/nodes/${encodeURIComponent(
      params.nodeId
    )}${suffix ? `?${suffix}` : ""}`
  );
}

export async function createTopicSetNode(
  topicSetId: string,
  payload: { parentId?: string | null; name: string; description?: string | null },
  etag?: string | null
) {
  const result = await unwrapOrReturn<CreateNodeResponse | TopicSetNodeItem>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/nodes`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    }
  );
  if (!result.data) {
    return {
      data: null,
      error: result.error,
      etag: result.etag ?? null,
      status: result.status,
    };
  }
  const node = "node" in result.data ? result.data.node : result.data;
  return { data: node, error: null, etag: result.etag ?? null, status: result.status };
}

export async function updateTopicSetNode(
  nodeId: string,
  payload: { name: string; description?: string | null },
  etag?: string | null
) {
  return unwrapOrReturn<{ id: string; name: string; description?: string | null; updatedAt: string }>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}`,
    {
      method: "PATCH",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteTopicSetNode(nodeId: string, cascade = true, etag?: string | null) {
  const query = new URLSearchParams();
  query.set("cascade", String(cascade));
  return requestJson<unknown>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}?${query.toString()}`,
    {
      method: "DELETE",
      headers: withIfMatch(etag),
      cache: "no-store",
    }
  );
}

export async function moveTopicSetNode(
  nodeId: string,
  payload: { newParentId: string; index?: number | null },
  etag?: string | null
) {
  return unwrapOrReturn<{ id: string; newParentId: string }>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/move`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    }
  );
}

export async function listTopicSetNodeTopics(
  nodeId: string
): Promise<ApiResult<NodeTopicView[]>> {
  const result = await unwrapOrReturn<NodeTopicsResponse>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/topics`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data.items ?? result.data.topics ?? [], error: null };
}

export async function bindTopicToNode(nodeId: string, topicId: string, etag?: string | null) {
  return unwrapOrReturn<NodeTopicView>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/topics`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ topicId }),
    }
  );
}

export async function unbindTopicFromNode(nodeId: string, topicId: string, etag?: string | null) {
  return requestJson<unknown>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/topics/${encodeURIComponent(topicId)}`,
    {
      method: "DELETE",
      headers: withIfMatch(etag),
      cache: "no-store",
    }
  );
}

export async function publishTopicSet(topicSetId: string, comment?: string, etag?: string | null) {
  const result = await unwrapOrReturn<PublishResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/publish`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
  if (!result.data) {
    return {
      data: null,
      error: result.error,
      errorDetails: result.errorDetails ?? null,
      status: result.status,
      etag: result.etag ?? null,
    };
  }
  return {
    data: {
      version: result.data.publishedVersion ?? result.data.version ?? 0,
      status: result.data.status,
    },
    error: null,
    errorDetails: null,
    status: result.status,
    etag: result.etag ?? null,
  };
}

export async function submitTopicSetReview(topicSetId: string, comment?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/submit-review`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
}

export async function approveTopicSet(topicSetId: string, comment?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/approve`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
}

export async function rejectTopicSet(topicSetId: string, reason?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/reject`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ reason: reason || null }),
    }
  );
}

export async function createTopicSetVersion(topicSetId: string, comment?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/versions`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
}

export async function deprecateTopicSet(topicSetId: string, comment?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/deprecate`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
}

export async function archiveTopicSet(topicSetId: string, comment?: string, etag?: string | null) {
  return unwrapOrReturn<TopicSetLifecycleResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/archive`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({ comment: comment || null }),
    }
  );
}

export async function listTopicSetVersions(
  topicSetId: string
): Promise<ApiResult<TopicSetVersionItem[]>> {
  const result = await unwrapOrReturn<TopicSetVersionsResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/versions`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data.items ?? result.data.versions ?? [], error: null };
}

export async function restoreTopicSetVersionAsDraft(
  topicSetId: string,
  version: number,
  payload?: { mode?: string; comment?: string | null },
  etag?: string | null
) {
  return unwrapOrReturn<RestoreTopicSetVersionResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/versions/${version}/restore`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({
        mode: payload?.mode ?? "DRAFT_COPY",
        comment: payload?.comment ?? null,
      }),
    }
  );
}

export async function rollbackTopicSetVersion(
  topicSetId: string,
  version: number,
  payload?: { comment?: string | null },
  etag?: string | null
) {
  return unwrapOrReturn<RollbackTopicSetVersionResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/versions/${version}/rollback`,
    {
      method: "POST",
      headers: withIfMatch(etag, { "content-type": "application/json" }),
      body: JSON.stringify({
        comment: payload?.comment ?? null,
      }),
    }
  );
}

export async function getTopicSetVersionTree(
  topicSetId: string,
  version: number
): Promise<ApiResult<TopicSetNode[]>> {
  const result = await unwrapOrReturn<NodeTreeResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/versions/${version}/tree`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data.nodes ?? [], error: null };
}

export async function getTopicSetDiff(params: {
  topicSetId: string;
  fromVersion: number | string;
  toVersion: number | string;
}): Promise<ApiResult<TopicSetDiffResponse>> {
  const normalizeVersion = (value: number | string) => {
    const str = String(value).trim();
    return str.toLowerCase().startsWith("v") ? str : `v${str}`;
  };
  const query = new URLSearchParams({
    fromVersion: normalizeVersion(params.fromVersion),
    toVersion: normalizeVersion(params.toVersion),
  });
  const result = await unwrapOrReturn<TopicSetDiffResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(params.topicSetId)}/diff?${query.toString()}`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data, error: null };
}

export async function getTopicSetDriftHistory(
  topicSetId: string,
  params?: { from?: string; to?: string; limit?: number }
): Promise<ApiResult<TopicSetDriftHistoryResponse>> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.limit != null) query.set("limit", String(params.limit));
  const result = await unwrapOrReturn<TopicSetDriftHistoryResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/drift-history${
      query.toString() ? `?${query.toString()}` : ""
    }`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data, error: null };
}

export async function getTopicSetDriftHealth(
  topicSetId: string
): Promise<ApiResult<TopicSetDriftHealthResponse>> {
  const result = await unwrapOrReturn<TopicSetDriftHealthResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/drift-health`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data, error: null };
}

export async function getTopicSetDriftDashboard(
  topicSetId: string
): Promise<ApiResult<TopicSetDriftDashboardResponse>> {
  const result = await unwrapOrReturn<TopicSetDriftDashboardResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/drift-dashboard`
  );
  if (!result.data) return { data: null, error: result.error };
  return { data: result.data, error: null };
}

export async function runTopicSetDriftAnalyze(
  topicSetId: string
): Promise<TopicSetApiResult<TopicSetDriftHistoryItem>> {
  return unwrapOrReturn<TopicSetDriftHistoryItem>(
    `${TOPICSETS_API_PROXY}/internal/topicsets/${encodeURIComponent(topicSetId)}/drift/analyze`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }
  );
}

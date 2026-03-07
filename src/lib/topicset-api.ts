import { ApiResult } from "@/lib/api";

const TOPICSETS_API_PROXY = "/api/topicsets";
const TOPICSET_SERVICE_DOWN_MESSAGE = "topicset-service unreachable";
const TOPICSET_SERVICE_ERROR_MESSAGE = "topicset-service request failed";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TopicSetSummary = {
  id: string;
  name: string;
  namespace?: string | null;
  status: string;
  version: number;
};

export type TopicSetDetail = {
  id: string;
  name: string;
  namespace?: string | null;
  description?: string | null;
  status: string;
  version: number;
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

export type NodeTopicView = {
  topicId: string;
  topicName?: string | null;
  score?: number | null;
};

type TopicSetSummaryList = TopicSetSummary[];

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

async function buildErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) return text;
  const status = res.status ? ` (${res.status} ${res.statusText})` : "";
  return `${fallback}${status}`.trim();
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, TOPICSET_SERVICE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: TOPICSET_SERVICE_DOWN_MESSAGE };
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
        error: normalizeError(res.data.error, "topicset request failed"),
      };
    }
    if (res.data.data == null) {
      return { data: null, error: "invalid topicset response" };
    }
    return { data: res.data.data, error: null };
  }

  return { data: res.data as T, error: null };
}

export async function listTopicSets() {
  return unwrapOrReturn<TopicSetSummaryList>(TOPICSETS_API_PROXY);
}

export async function createTopicSet(payload: {
  name: string;
  namespace?: string | null;
  description?: string | null;
}) {
  return unwrapOrReturn<TopicSetSummary>(TOPICSETS_API_PROXY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getTopicSet(id: string) {
  return unwrapOrReturn<TopicSetDetail>(`${TOPICSETS_API_PROXY}/${encodeURIComponent(id)}`);
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
  payload: { parentId?: string | null; name: string; description?: string | null }
) {
  const result = await unwrapOrReturn<CreateNodeResponse | TopicSetNodeItem>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/nodes`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  const node = "node" in result.data ? result.data.node : result.data;
  return { data: node, error: null };
}

export async function updateTopicSetNode(
  nodeId: string,
  payload: { name: string; description?: string | null }
) {
  return unwrapOrReturn<{ id: string; name: string; description?: string | null; updatedAt: string }>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteTopicSetNode(nodeId: string, cascade = true) {
  const query = new URLSearchParams();
  query.set("cascade", String(cascade));
  return requestJson<unknown>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}?${query.toString()}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );
}

export async function moveTopicSetNode(
  nodeId: string,
  payload: { newParentId: string; index?: number | null }
) {
  return unwrapOrReturn<{ id: string; newParentId: string }>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/move`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
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

export async function bindTopicToNode(nodeId: string, topicId: string) {
  return unwrapOrReturn<NodeTopicView>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/topics`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicId }),
    }
  );
}

export async function unbindTopicFromNode(nodeId: string, topicId: string) {
  return requestJson<unknown>(
    `${TOPICSETS_API_PROXY}/nodes/${encodeURIComponent(nodeId)}/topics/${encodeURIComponent(topicId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );
}

export async function publishTopicSet(topicSetId: string, comment?: string) {
  const result = await unwrapOrReturn<PublishResponse>(
    `${TOPICSETS_API_PROXY}/${encodeURIComponent(topicSetId)}/publish`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ comment: comment || null }),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  return {
    data: {
      version: result.data.publishedVersion ?? result.data.version ?? 0,
    },
    error: null,
  };
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

import type { ApiResult } from "@/lib/api";

const TOPICSET_AI_API_PROXY = "/api/ai/topicset";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: unknown;
};

export type TopicSetAIAction =
  | "SPLIT_NODE"
  | "MERGE_NODES"
  | "RENAME_NODE"
  | "MOVE_NODE"
  | "BIND_TOPICS"
  | "UNBIND_TOPICS"
  | "DELETE_EMPTY_NODES"
  | "REVIEW_EMPTY_NODES"
  | "IMPROVE_COVERAGE";

export type TopicSetAISplitNodePayload = {
  action: "SPLIT_NODE";
  targetNodeId?: string | null;
  targetNodeName?: string | null;
  children?: Array<{
    name: string;
    description?: string | null;
  }> | null;
};

export type TopicSetAIMergeNodesPayload = {
  action: "MERGE_NODES";
  sourceNodeIds?: string[] | null;
  sourceNodeNames?: string[] | null;
  targetNodeId?: string | null;
  targetNodeName?: string | null;
  mode?: "MANUAL_CONFIRM" | "AUTO_APPLY" | string | null;
};

export type TopicSetAIRenameNodePayload = {
  action: "RENAME_NODE";
  targetNodeId?: string | null;
  currentName?: string | null;
  suggestedName?: string | null;
};

export type TopicSetAIMoveNodePayload = {
  action: "MOVE_NODE";
  nodeId?: string | null;
  nodeName?: string | null;
  newParentId?: string | null;
  newParentName?: string | null;
};

export type TopicSetAIBindTopicsPayload = {
  action: "BIND_TOPICS" | "UNBIND_TOPICS";
  targetNodeId?: string | null;
  targetNodeName?: string | null;
  topicIds?: string[] | null;
  topicNames?: string[] | null;
};

export type TopicSetAIReviewEmptyNodesPayload = {
  action: "REVIEW_EMPTY_NODES" | "DELETE_EMPTY_NODES";
  emptyNodeCount?: number | null;
  nodeIds?: string[] | null;
  nodeNames?: string[] | null;
};

export type TopicSetAIImproveCoveragePayload = {
  action: "IMPROVE_COVERAGE";
  coverageRatio?: number | null;
};

export type TopicSetAIUnknownPayload = Record<string, unknown> & {
  action?: TopicSetAIAction | string;
};

export type TopicSetAISuggestionPayload =
  | TopicSetAISplitNodePayload
  | TopicSetAIMergeNodesPayload
  | TopicSetAIRenameNodePayload
  | TopicSetAIMoveNodePayload
  | TopicSetAIBindTopicsPayload
  | TopicSetAIReviewEmptyNodesPayload
  | TopicSetAIImproveCoveragePayload
  | TopicSetAIUnknownPayload;

export type TopicSetAISuggestion = {
  type: "STRUCTURE" | "ASSIGNMENT" | "OPTIMIZATION" | string;
  confidence: number;
  reason: string;
  payload: TopicSetAISuggestionPayload;
};

export type TopicSetAITopicInput = {
  topicId: string;
  name?: string | null;
  description?: string | null;
  explain?: string | null;
};

export type TopicSetAINodeInput = {
  nodeId?: string | null;
  parentId?: string | null;
  name?: string | null;
  description?: string | null;
  path?: string | null;
};

export type TopicSetAISuggestStructureRequest = {
  topicSetId: string;
  topics?: TopicSetAITopicInput[];
  dataset?: string | null;
  fields?: string[];
  provider?: string | null;
  model?: string | null;
  createdBy?: string | null;
};

export type TopicSetAIStructureNodeView = {
  name: string;
  nodes: string[];
};

export type TopicSetAISuggestStructureResponse = {
  provider: string;
  model: string;
  dimensions: TopicSetAIStructureNodeView[];
  suggestions: TopicSetAISuggestion[];
};

export type TopicSetAIAssignRequest = {
  topicSetId: string;
  nodes?: TopicSetAINodeInput[];
  topics?: TopicSetAITopicInput[];
  refineWithLlm?: boolean | null;
  provider?: string | null;
  model?: string | null;
  createdBy?: string | null;
};

export type TopicSetAIAssignmentView = {
  topicId: string;
  nodeNames: string[];
  nodeIds: string[];
  confidence: number;
  reason: string;
};

export type TopicSetAIAssignResponse = {
  assignments: TopicSetAIAssignmentView[];
  suggestions: TopicSetAISuggestion[];
};

export type TopicSetAISimulateResultInput = {
  totalDocs?: number | null;
  classifiedDocs?: number | null;
  unmappedDocs?: number | null;
  coverageRatio?: number | null;
  overlapDocCount?: number | null;
  overlapRatio?: number | null;
};

export type TopicSetAIOptimizeRequest = {
  topicSetId: string;
  dataset?: string | null;
  sampleSize?: number | null;
  simulateResult?: TopicSetAISimulateResultInput;
  provider?: string | null;
  model?: string | null;
  createdBy?: string | null;
};

export type TopicSetAIOptimizeResponse = {
  coverage?: number | null;
  overlapLevel: string;
  issues: string[];
  suggestions: TopicSetAISuggestion[];
  simulateResult?: TopicSetAISimulateResultInput;
};

export type TopicSetAIAnalysisResponse = {
  topicSetId: string;
  coverage?: number | null;
  overlapLevel: string;
  unmappedCount?: number | null;
  issues: string[];
  suggestions: TopicSetAISuggestion[];
  simulateResult?: TopicSetAISimulateResultInput;
  stats: Record<string, unknown>;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        data: null,
        error: text || `Request failed (${res.status} ${res.statusText})`,
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return {
      data: null,
      error: "TopicSet AI service is unavailable.",
    };
  }
}

function normalizeApiError(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Request failed.");
  }
  return "Request failed.";
}

async function postAi<TResponse, TRequest>(path: string, payload: TRequest): Promise<ApiResult<TResponse>> {
  const result = await requestJson<ApiEnvelope<TResponse>>(`${TOPICSET_AI_API_PROXY}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeApiError(result.data.error) };
  }
  return { data: result.data.data, error: null };
}

async function getAi<TResponse>(path: string, query?: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const result = await requestJson<ApiEnvelope<TResponse>>(
    `${TOPICSET_AI_API_PROXY}/${path}${search.toString() ? `?${search.toString()}` : ""}`,
    { cache: "no-store" }
  );

  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeApiError(result.data.error) };
  }
  return { data: result.data.data, error: null };
}

export function suggestTopicSetStructureWithAi(payload: TopicSetAISuggestStructureRequest) {
  return postAi<TopicSetAISuggestStructureResponse, TopicSetAISuggestStructureRequest>("suggest-structure", payload);
}

export function assignTopicSetTopicsWithAi(payload: TopicSetAIAssignRequest) {
  return postAi<TopicSetAIAssignResponse, TopicSetAIAssignRequest>("assign", payload);
}

export function optimizeTopicSetWithAi(payload: TopicSetAIOptimizeRequest) {
  return postAi<TopicSetAIOptimizeResponse, TopicSetAIOptimizeRequest>("optimize", payload);
}

export function getTopicSetAiAnalysis(params: {
  topicSetId: string;
  dataset?: string | null;
  sampleSize?: number | null;
}) {
  return getAi<TopicSetAIAnalysisResponse>("analysis", params);
}

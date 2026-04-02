import type { ApiResult } from "@/lib/api";
import type { UiRuleViewModel } from "@/app/knowledge/topics/[id]/rule-editor/types";

const TOPICS_AI_API_PROXY = "/api/topics/ai";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: unknown;
};

export type TopicAiGenerateRequest = {
  description: string;
  provider?: string | null;
  model?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
};

export type TopicAiGenerateResponse = {
  provider: string;
  model: string;
  topicName: string;
  businessRule: UiRuleViewModel;
  compiled?: {
    ast?: unknown;
    gql?: string | null;
  } | null;
  explanation?: string | null;
  warnings: string[];
};

export type TopicAiSuggestRequest = {
  businessRule: UiRuleViewModel;
  focusNodeId?: string | null;
  provider?: string | null;
  model?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
};

export type TopicAiSuggestResponse = {
  provider: string;
  model: string;
  summary?: string | null;
  issues: string[];
  addTerms: string[];
  synonyms: string[][];
  structureOptimization?: Record<string, unknown> | null;
  cautions: string[];
};

export type TopicAiExplainRequest = {
  topicName?: string | null;
  description?: string | null;
  businessRule: UiRuleViewModel;
  provider?: string | null;
  model?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
};

export type TopicAiExplainResponse = {
  provider: string;
  model: string;
  summary?: string | null;
  bullets: string[];
  risks: string[];
  recommendedActions: string[];
};

export type TopicAiOptimizeRequest = {
  businessRule: UiRuleViewModel;
  optimizationGoal?: string | null;
  provider?: string | null;
  model?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
};

export type TopicAiOptimizeResponse = {
  provider: string;
  model: string;
  businessRule: UiRuleViewModel;
  compiled?: {
    ast?: unknown;
    gql?: string | null;
  } | null;
  summary?: string | null;
  cautions: string[];
};

export type TopicAiEvaluateRequest = {
  businessRule: UiRuleViewModel;
  simulation?: Record<string, unknown> | null;
  provider?: string | null;
  model?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
  runtimeEnvironmentId?: number | null;
  dataset?: string | null;
  sampleSize?: number | null;
};

export type TopicAiEvaluateResponse = {
  provider: string;
  model: string;
  summary?: string | null;
  strengths: string[];
  risks: string[];
  recommendedActions: string[];
};

export type AiInvocationView = {
  id: number;
  capability: string;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  topicId?: string | null;
  topicSetId?: string | null;
  createdBy?: string | null;
  requestPayloadJson?: Record<string, unknown> | null;
  promptText?: string | null;
  responseText?: string | null;
  parsedSuccess: boolean;
  errorCode?: string | null;
  createdAt: string;
};

export type AiInvocationPageResponse = {
  items: AiInvocationView[];
  page: number;
  size: number;
  total: number;
};

async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
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
      error: "AI topic service is unavailable.",
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

async function postAi<TResponse, TRequest>(
  path: string,
  payload: TRequest
): Promise<ApiResult<TResponse>> {
  const result = await requestJson<ApiEnvelope<TResponse>>(
    `${TOPICS_AI_API_PROXY}/${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeApiError(result.data.error) };
  }
  return { data: result.data.data, error: null };
}

export function generateTopicWithAi(payload: TopicAiGenerateRequest) {
  return postAi<TopicAiGenerateResponse, TopicAiGenerateRequest>("generate", payload);
}

export function suggestTopicRuleWithAi(payload: TopicAiSuggestRequest) {
  return postAi<TopicAiSuggestResponse, TopicAiSuggestRequest>("suggest", payload);
}

export function explainTopicRuleWithAi(payload: TopicAiExplainRequest) {
  return postAi<TopicAiExplainResponse, TopicAiExplainRequest>("explain", payload);
}

export function optimizeTopicRuleWithAi(payload: TopicAiOptimizeRequest) {
  return postAi<TopicAiOptimizeResponse, TopicAiOptimizeRequest>("optimize", payload);
}

export function evaluateTopicRuleWithAi(payload: TopicAiEvaluateRequest) {
  return postAi<TopicAiEvaluateResponse, TopicAiEvaluateRequest>("evaluate", payload);
}

export async function listTopicAiInvocations(params: {
  topicId?: string | null;
  capability?: string | null;
  page?: number;
  size?: number;
}): Promise<ApiResult<AiInvocationPageResponse>> {
  const search = new URLSearchParams();
  if (params.topicId) search.set("topicId", params.topicId);
  if (params.capability) search.set("capability", params.capability);
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));

  const result = await requestJson<ApiEnvelope<AiInvocationPageResponse>>(
    `${TOPICS_AI_API_PROXY}/invocations?${search.toString()}`,
    { cache: "no-store" }
  );

  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return { data: null, error: normalizeApiError(result.data.error) };
  }
  return { data: result.data.data, error: null };
}

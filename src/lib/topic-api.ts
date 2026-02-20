import { ApiResult } from "@/lib/api";
import type { AntiPatternReport } from "@/components/review/antiPatternTypes";
import { decodeUnicodeEscapes } from "@/lib/text-utils";

const TOPICS_API_PROXY = "/api/topics";

const TOPIC_SERVICE_DOWN_MESSAGE =
  "topic-service 未启动或无法连接，请启动服务后重试。";
const TOPIC_SERVICE_ERROR_MESSAGE =
  "topic-service 返回错误，请稍后重试。";

async function buildErrorMessage(
  res: Response,
  fallback: string
) {
  const text = await res.text().catch(() => "");
  if (text) return text;
  const status = res.status
    ? ` (${res.status} ${res.statusText})`
    : "";
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
        error: await buildErrorMessage(
          res,
          TOPIC_SERVICE_ERROR_MESSAGE
        ),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: TOPIC_SERVICE_DOWN_MESSAGE };
  }
}

export type TopicDTO = {
  id: string;
  name: string;
  status: string;
  usedBy: string[];
  updatedAt?: string | null;
};

export type TopicListResponse = {
  items: TopicDTO[];
  page: number;
  size: number;
  total: number;
};

type TopicListApiResponse = {
  success: boolean;
  data: TopicListResponse;
  error: string | null;
};

type TopicSearchResponse = TopicListResponse | TopicDTO[];

type TopicSearchApiResponse = {
  success: boolean;
  data: TopicSearchResponse;
  error: string | null;
};

type CreateTopicResponse = {
  id: string;
  status: string;
};

type CreateTopicApiResponse = {
  success: boolean;
  data: unknown;
  error: string | null;
};

type TopicDetailResponse = {
  id: string;
  name: string;
  status: string;
  description?: string | null;
  usedBy?: string[];
  template_id?: number | string | null;
  template_version?: number | string | null;
  updatedAt?: string | null;
};

type TopicDetailApiResponse = {
  success: boolean;
  data: TopicDetailResponse;
  error: string | null;
};

export type ExplainPreviewLine = {
  id?: string;
  text?: string;
  level?: "INFO" | "WARNING" | "ERROR" | string;
  indent?: number;
  paletteKey?: string | null;
  ruleType?: string | null;
  children?: ExplainPreviewLine[] | null;
};

export type ExplainPreviewViewModel = {
  title?: string;
  tree?: unknown;
  blocks?: ExplainPreviewLine[];
  lines?: ExplainPreviewLine[];
  summary?: string;
  summaryI18n?: {
    zh?: string;
    en?: string;
  };
  complexity?: {
    depth?: number;
    clauseCount?: number;
    groupCount?: number;
    score?: number;
    level?: string;
  };
  risk?: {
    score?: number;
    level?: string;
    signals?: Array<{
      code?: string;
      message?: string;
      weight?: number;
    }>;
  };
  diff?: unknown;
};

type TopicDraftBusinessRequest = {
  rule: {
    root: unknown;
  };
  updatedBy?: string | null;
};

type TopicDraftBusinessResponse = {
  rule: unknown;
  capability?: unknown;
  explain?: ExplainPreviewViewModel;
  updatedAt?: string;
};

type TopicDraftBusinessApiResponse = {
  success: boolean;
  data: TopicDraftBusinessResponse;
  error: unknown;
};

type RulePreviewBusinessRequest = {
  rule: unknown;
};

type RulePreviewBusinessResult = {
  valid: boolean;
  errors: string[];
  gql?: string | null;
  explain?: ExplainPreviewViewModel;
  antiPatterns?: AntiPatternReport;
};

type RulePreviewBusinessApiResponse = {
  success: boolean;
  data: RulePreviewBusinessResult;
  error: unknown;
};

type SubmitReviewBusinessRequest = {
  submittedBy?: string | null;
  comment?: string | null;
};

type SubmitReviewBusinessResponse = {
  reviewId: number;
  revision: number;
  status: string;
  submittedAt: string;
};

type SubmitReviewBusinessApiResponse = {
  success: boolean;
  data: SubmitReviewBusinessResponse;
  error: unknown;
};

export type TopicReviewListItem = {
  reviewId: number;
  revision: number;
  contentHash?: string | null;
  status: string;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

type TopicReviewListApiResponse = {
  success: boolean;
  data: TopicReviewListItem[];
  error: unknown;
};

export type TopicReviewDetailResponse = {
  revision: number;
  id?: string;
  contentHash?: string | null;
  template_id?: number | string | null;
  template_version?: number | string | null;
  rule: unknown;
  capability?: unknown;
  explain?: ExplainPreviewViewModel;
  complexity?: {
    logic_depth?: number;
    condition_count?: number;
    or_count?: number;
    exclude_count?: number;
    has_range_constraint?: boolean;
    score?: number;
    level?: string;
    health?: string;
  };
  risk_score?: number;
  gql?: string | null;
  updatedAt?: string | null;
  status: string;
  submittedBy?: string | null;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
};

type TopicReviewDetailApiResponse = {
  success: boolean;
  data: TopicReviewDetailResponse;
  error: unknown;
};

export type ReviewDecisionRequest = {
  decision: "APPROVE" | "REJECT";
  reviewer?: string;
  comment?: string;
  expectedHash?: string;
};

type ReviewDecisionApiResponse = {
  success: boolean;
  data: unknown;
  error: unknown;
};

type PublishTopicRequest = {
  sourceRevision?: number | null;
  publisher?: string | null;
  expectedHash?: string | null;
};

type PublishTopicResponse = {
  publishedRevision: number;
  publishedAt: string;
  status?: string;
};

type PublishTopicApiResponse = {
  success: boolean;
  data: PublishTopicResponse;
  error: unknown;
};

function normalizeApiError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in (error as any)) {
    return String((error as any).message);
  }
  return "Request failed.";
}

function normalizeTopicDto(item: TopicDTO): TopicDTO {
  return {
    ...item,
    name: decodeUnicodeEscapes(item.name ?? ""),
  };
}

function normalizeTopicDetail(item: TopicDetailResponse): TopicDetailResponse {
  return {
    ...item,
    name: decodeUnicodeEscapes(item.name ?? ""),
    description: item.description
      ? decodeUnicodeEscapes(item.description)
      : item.description,
  };
}

function normalizeCreateTopicResponse(
  payload: unknown
): CreateTopicResponse | null {
  function asId(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number") {
      const id = String(value).trim();
      return id ? id : null;
    }
    return null;
  }

  function findId(value: unknown, depth = 0): string | null {
    if (depth > 4 || value == null) return null;
    const direct = asId(value);
    if (direct) return direct;
    if (typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;

    const keys = ["id", "topic_id", "topicId", "topicID"];
    for (const key of keys) {
      const id = asId(obj[key]);
      if (id) return id;
    }

    const branches = ["data", "topic", "result", "item", "entity"];
    for (const key of branches) {
      const id = findId(obj[key], depth + 1);
      if (id) return id;
    }

    return null;
  }

  function findStatus(value: unknown, depth = 0): string | null {
    if (depth > 4 || !value || typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    if (typeof obj.status === "string" && obj.status.trim()) {
      return obj.status;
    }
    const branches = ["data", "topic", "result", "item", "entity"];
    for (const key of branches) {
      const status = findStatus(obj[key], depth + 1);
      if (status) return status;
    }
    return null;
  }

  const id = findId(payload);
  if (!id) return null;
  const status = findStatus(payload) ?? "DRAFT";
  return { id, status };
}

export async function fetchTopics(): Promise<
  ApiResult<TopicListResponse>
> {
  const result = await requestJson<TopicListApiResponse>(
    TOPICS_API_PROXY,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error: result.data.error ?? "Unable to load topics.",
    };
  }

  return {
    data: {
      ...result.data.data,
      items: (result.data.data.items ?? []).map(normalizeTopicDto),
    },
    error: null,
  };
}

export async function searchTopics(params?: {
  status?: string;
  keyword?: string;
}): Promise<ApiResult<TopicDTO[]>> {
  const url = new URL(`${TOPICS_API_PROXY}/search`, "http://localhost");
  if (params?.status) {
    url.searchParams.set("status", params.status);
  }
  if (params?.keyword) {
    url.searchParams.set("keyword", params.keyword);
  }

  const result = await requestJson<TopicSearchApiResponse>(
    url.pathname + url.search,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error: result.data.error ?? "Unable to search topics.",
    };
  }

  const payload = result.data.data;
  const items = Array.isArray(payload) ? payload : payload.items ?? [];

  return { data: items.map(normalizeTopicDto), error: null };
}

export async function createTopic(params: {
  name: string;
  description?: string;
  template?: number | string | null;
}): Promise<ApiResult<CreateTopicResponse>> {
  const payload = {
    name: params.name,
    description: params.description,
    templateId: params.template,
  };
  const result = await requestJson<CreateTopicApiResponse>(
    TOPICS_API_PROXY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error: result.data.error ?? "Unable to create topic.",
    };
  }

  const normalized = normalizeCreateTopicResponse(result.data.data);
  if (!normalized) {
    const shape =
      result.data.data && typeof result.data.data === "object"
        ? Object.keys(result.data.data as Record<string, unknown>).join(",")
        : typeof result.data.data;
    return {
      data: null,
      error: `Invalid create topic response: missing topic id (shape: ${shape || "unknown"}).`,
    };
  }

  return { data: normalized, error: null };
}

export async function fetchTopicById(
  topicId: string
): Promise<ApiResult<TopicDetailResponse>> {
  const result = await requestJson<TopicDetailApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(topicId)}`,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error: result.data.error ?? "Unable to load topic.",
    };
  }

  return { data: normalizeTopicDetail(result.data.data), error: null };
}

export async function fetchTopicDraft(
  topicId: string
): Promise<ApiResult<TopicDraftBusinessResponse>> {
  const result = await requestJson<TopicDraftBusinessApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(topicId)}/draft`,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to load draft.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function saveTopicDraft(
  topicId: string,
  payload: TopicDraftBusinessRequest
): Promise<ApiResult<TopicDraftBusinessResponse>> {
  const result = await requestJson<TopicDraftBusinessApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(topicId)}/draft`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to save draft.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function deleteTopicDraft(
  topicId: string
): Promise<ApiResult<null>> {
  const result = await requestJson<{ success: boolean; error: unknown }>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(topicId)}/draft`,
    { method: "DELETE" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to delete draft.",
    };
  }

  return { data: null, error: null };
}

export async function previewTopicRule(
  topicId: string,
  payload: RulePreviewBusinessRequest
): Promise<ApiResult<RulePreviewBusinessResult>> {
  const result = await requestJson<RulePreviewBusinessApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/rule/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to preview rule.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function submitTopicReview(
  topicId: string,
  payload: SubmitReviewBusinessRequest
): Promise<ApiResult<SubmitReviewBusinessResponse>> {
  const result = await requestJson<SubmitReviewBusinessApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/submit-review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to submit review.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function fetchTopicReviews(
  topicId: string
): Promise<ApiResult<TopicReviewListItem[]>> {
  const result = await requestJson<TopicReviewListApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/reviews`,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to load review list.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function fetchTopicReviewDetail(
  topicId: string,
  revision: number
): Promise<ApiResult<TopicReviewDetailResponse>> {
  const result = await requestJson<TopicReviewDetailApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/reviews/${revision}`,
    { cache: "no-store" }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to load review detail.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function submitTopicReviewDecision(
  topicId: string,
  revision: number,
  payload: ReviewDecisionRequest
): Promise<ApiResult<unknown>> {
  const result = await requestJson<ReviewDecisionApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/reviews/${revision}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to submit review decision.",
    };
  }

  return { data: result.data.data, error: null };
}

export async function publishTopic(
  topicId: string,
  payload: PublishTopicRequest
): Promise<ApiResult<PublishTopicResponse>> {
  const result = await requestJson<PublishTopicApiResponse>(
    `${TOPICS_API_PROXY}/${encodeURIComponent(
      topicId
    )}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.data) {
    return { data: null, error: result.error };
  }

  if (!result.data.success) {
    return {
      data: null,
      error:
        normalizeApiError(result.data.error) ??
        "Unable to publish topic.",
    };
  }

  return { data: result.data.data, error: null };
}

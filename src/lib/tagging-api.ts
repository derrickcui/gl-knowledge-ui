import { ApiResult } from "@/lib/api";

const TAGGING_API_PROXY = "/api/tagging";
const TAGGING_SERVICE_DOWN_MESSAGE = "tagging-service unreachable";
const TAGGING_SERVICE_ERROR_MESSAGE = "tagging-service request failed";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type TaggingJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type TaggingJobMode = "FULL" | "TOPIC_ONLY";

export type TaggingJobView = {
  jobId: string;
  topicId: string | null;
  topicVersion: string | null;
  mode: TaggingJobMode | null;
  status: TaggingJobStatus | null;
  totalDocs: number;
  taggedDocs: number;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type TaggingJobPageResponse = {
  items: TaggingJobView[];
  page: number;
  size: number;
  total: number;
};

export type TaggingTopicResultView = {
  topicId: string;
  topicVersion: string | null;
  status: "SUCCESS" | "FAILED" | null;
  totalDocs: number;
  taggedDocs: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type TaggingJobIdMap = {
  jobId: string;
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
        error: await buildErrorMessage(res, TAGGING_SERVICE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: TAGGING_SERVICE_DOWN_MESSAGE };
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

export async function listTaggingJobs(params?: {
  status?: TaggingJobStatus;
  mode?: TaggingJobMode;
  topicId?: string;
  page?: number;
  size?: number;
}): Promise<ApiResult<TaggingJobPageResponse>> {
  const url = new URL(`${TAGGING_API_PROXY}/jobs`, "http://localhost");
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.mode) url.searchParams.set("mode", params.mode);
  if (params?.topicId) url.searchParams.set("topicId", params.topicId);
  if (params?.page != null) url.searchParams.set("page", String(params.page));
  if (params?.size != null) url.searchParams.set("size", String(params.size));

  const res = await requestJson<ApiEnvelope<TaggingJobPageResponse>>(
    `${url.pathname}${url.search}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to load tagging jobs"),
    };
  }
  if (!res.data.data) {
    return { data: null, error: "invalid tagging jobs response" };
  }
  return { data: res.data.data, error: null };
}

export async function createTopicTaggingJob(
  topicId: string
): Promise<ApiResult<TaggingJobIdMap>> {
  const res = await requestJson<ApiEnvelope<TaggingJobIdMap>>(
    `${TAGGING_API_PROXY}/topic/${encodeURIComponent(topicId)}`,
    { method: "POST" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to create topic tagging job"),
    };
  }
  if (!res.data.data) {
    return { data: null, error: "invalid tagging create response" };
  }
  return { data: res.data.data, error: null };
}

export async function createFullTaggingJob(): Promise<ApiResult<TaggingJobIdMap>> {
  const res = await requestJson<ApiEnvelope<TaggingJobIdMap>>(
    `${TAGGING_API_PROXY}/full`,
    { method: "POST" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to create full tagging job"),
    };
  }
  if (!res.data.data) {
    return { data: null, error: "invalid full tagging create response" };
  }
  return { data: res.data.data, error: null };
}

export async function getTaggingJob(jobId: string): Promise<ApiResult<TaggingJobView>> {
  const res = await requestJson<ApiEnvelope<TaggingJobView>>(
    `${TAGGING_API_PROXY}/jobs/${encodeURIComponent(jobId)}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to load tagging job detail"),
    };
  }
  if (!res.data.data) {
    return { data: null, error: "invalid tagging job detail response" };
  }
  return { data: res.data.data, error: null };
}

export async function listTaggingJobTopics(
  jobId: string
): Promise<ApiResult<TaggingTopicResultView[]>> {
  const res = await requestJson<ApiEnvelope<TaggingTopicResultView[]>>(
    `${TAGGING_API_PROXY}/jobs/${encodeURIComponent(jobId)}/topics`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to load job topic results"),
    };
  }
  return { data: res.data.data ?? [], error: null };
}

export async function retryTaggingJob(jobId: string): Promise<ApiResult<TaggingJobIdMap>> {
  const res = await requestJson<ApiEnvelope<TaggingJobIdMap>>(
    `${TAGGING_API_PROXY}/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: "POST" }
  );
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "failed to retry tagging job"),
    };
  }
  if (!res.data.data) {
    return { data: null, error: "invalid retry response" };
  }
  return { data: res.data.data, error: null };
}

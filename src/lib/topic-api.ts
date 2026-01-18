import { ApiResult } from "@/lib/api";

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

type CreateTopicResponse = {
  id: string;
  status: string;
};

type CreateTopicApiResponse = {
  success: boolean;
  data: CreateTopicResponse;
  error: string | null;
};

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

  return { data: result.data.data, error: null };
}

export async function createTopic(params: {
  name: string;
  description?: string;
}): Promise<ApiResult<CreateTopicResponse>> {
  const result = await requestJson<CreateTopicApiResponse>(
    TOPICS_API_PROXY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
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

  return { data: result.data.data, error: null };
}

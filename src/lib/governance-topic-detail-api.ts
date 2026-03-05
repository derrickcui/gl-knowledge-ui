import { ApiResult } from "@/lib/api";

const GOVERNANCE_TOPIC_PROXY = "/api/governance/topic";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiErrorShape | string | null;
};

export type GovernanceTopicSummary = {
  matchedDocs: number;
  coverageRate: number;
  multiHitRate: number;
  blindspotCount: number;
  avgWeight: number;
};

export type GovernanceTopicInfo = {
  topicId: string;
  topicName: string;
  dimensionId?: string | null;
  dimensionName?: string | null;
  runtimeVersion?: string | null;
};

export type GovernanceTopicDocItem = {
  docId: string;
  title: string;
  publishedAt?: string | null;
  weight: number;
  hitTopicCount?: number;
  isMultiHit?: boolean;
  snippet?: string | null;
};

export type GovernanceTopicDocsResponse = {
  topic: GovernanceTopicInfo;
  summary: GovernanceTopicSummary;
  page: number;
  size: number;
  total: number;
  items: GovernanceTopicDocItem[];
};

export type GovernanceTopicExplainEvidence = {
  field: string;
  text: string;
  start?: number;
  end?: number;
};

export type GovernanceTopicExplainRule = {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  weightContribution?: number;
  evidence?: GovernanceTopicExplainEvidence[];
};

export type GovernanceTopicDocExplainResponse = {
  topicId: string;
  docId: string;
  matched: boolean;
  score?: number;
  rules?: GovernanceTopicExplainRule[];
  finalExplain?: string;
};

export type GovernanceTopicVersionItem = {
  version: string;
  capturedAt?: string | null;
};

export type GovernanceTopicVersionsResponse = {
  current?: string | null;
  versions: GovernanceTopicVersionItem[];
};

export type GovernanceTopicDiffSummary = {
  added: number;
  removed: number;
  changeRate: number;
};

export type GovernanceTopicDiffItem = {
  docId: string;
  title?: string | null;
  status: "ADDED" | "REMOVED";
  fromWeight?: number | null;
  toWeight?: number | null;
};

export type GovernanceTopicDiffResponse = {
  topicId: string;
  fromVersion: string;
  toVersion: string;
  summary: GovernanceTopicDiffSummary;
  items: GovernanceTopicDiffItem[];
};

export type GovernanceTopicCooccurrenceItem = {
  topicId: string;
  topicName: string;
  cooccurDocs: number;
  cooccurRate?: number;
};

export type GovernanceTopicCooccurrenceResponse = {
  topicId: string;
  items: GovernanceTopicCooccurrenceItem[];
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

async function requestJson<T>(input: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, { cache: "no-store" });
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, "governance topic request failed"),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "governance-service unreachable" };
  }
}

async function unwrapEnvelope<T>(path: string): Promise<ApiResult<T>> {
  const res = await requestJson<ApiEnvelope<T>>(path);
  if (!res.data) return { data: null, error: res.error };
  if (!res.data.success) {
    return {
      data: null,
      error: normalizeError(res.data.error, "governance topic request failed"),
    };
  }
  if (res.data.data == null) {
    return { data: null, error: "invalid governance topic response" };
  }
  return { data: res.data.data, error: null };
}

export async function fetchGovernanceTopicDocs(
  topicId: string,
  params?: {
    runtimeVersion?: string;
    page?: number;
    size?: number;
    sortBy?: "WEIGHT" | "TIME" | "MULTI_HIT";
    sortOrder?: "ASC" | "DESC";
    hitMode?: "ALL" | "SINGLE" | "MULTI";
    q?: string;
  }
) {
  const url = new URL(
    `${GOVERNANCE_TOPIC_PROXY}/${encodeURIComponent(topicId)}/docs`,
    "http://localhost"
  );
  if (params?.runtimeVersion) url.searchParams.set("runtimeVersion", params.runtimeVersion);
  if (params?.page != null) url.searchParams.set("page", String(params.page));
  if (params?.size != null) url.searchParams.set("size", String(params.size));
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params?.hitMode) url.searchParams.set("hitMode", params.hitMode);
  if (params?.q) url.searchParams.set("q", params.q);
  return unwrapEnvelope<GovernanceTopicDocsResponse>(`${url.pathname}${url.search}`);
}

export async function fetchGovernanceTopicDocExplain(
  topicId: string,
  docId: string,
  params?: { runtimeVersion?: string }
) {
  const url = new URL(
    `${GOVERNANCE_TOPIC_PROXY}/${encodeURIComponent(topicId)}/doc/${encodeURIComponent(
      docId
    )}/explain`,
    "http://localhost"
  );
  if (params?.runtimeVersion) url.searchParams.set("runtimeVersion", params.runtimeVersion);
  return unwrapEnvelope<GovernanceTopicDocExplainResponse>(`${url.pathname}${url.search}`);
}

export async function fetchGovernanceTopicVersions(topicId: string) {
  return unwrapEnvelope<GovernanceTopicVersionsResponse>(
    `${GOVERNANCE_TOPIC_PROXY}/${encodeURIComponent(topicId)}/versions`
  );
}

export async function fetchGovernanceTopicDiff(
  topicId: string,
  params: {
    fromVersion: string;
    toVersion: string;
    page?: number;
    size?: number;
  }
) {
  const url = new URL(
    `${GOVERNANCE_TOPIC_PROXY}/${encodeURIComponent(topicId)}/diff`,
    "http://localhost"
  );
  url.searchParams.set("fromVersion", params.fromVersion);
  url.searchParams.set("toVersion", params.toVersion);
  if (params.page != null) url.searchParams.set("page", String(params.page));
  if (params.size != null) url.searchParams.set("size", String(params.size));
  return unwrapEnvelope<GovernanceTopicDiffResponse>(`${url.pathname}${url.search}`);
}

export async function fetchGovernanceTopicCooccurrence(
  topicId: string,
  params?: { limit?: number; runtimeVersion?: string }
) {
  const url = new URL(
    `${GOVERNANCE_TOPIC_PROXY}/${encodeURIComponent(topicId)}/cooccurrence`,
    "http://localhost"
  );
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params?.runtimeVersion) url.searchParams.set("runtimeVersion", params.runtimeVersion);
  return unwrapEnvelope<GovernanceTopicCooccurrenceResponse>(`${url.pathname}${url.search}`);
}


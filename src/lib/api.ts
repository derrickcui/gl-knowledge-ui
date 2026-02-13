
import { AuditRecord } from "@/types/audit";

const API_BASE =
  process.env.NEXT_PUBLIC_GLOSSARY_API ??
  "http://localhost:8000";


export const SERVICE_DOWN_MESSAGE =
  "concept-service 未启动或无法连接，请启动服务后重试。";
const SERVICE_ERROR_MESSAGE =
  "concept-service 请求失败，请稍后重试。";

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type ApiResultWithStatus<T> = ApiResult<T> & {
  status?: number;
};

export function isServiceDownError(error: string | null) {
  return error === SERVICE_DOWN_MESSAGE;
}

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

export async function requestJson<T>(
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
          SERVICE_ERROR_MESSAGE
        ),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: SERVICE_DOWN_MESSAGE };
  }
}

async function requestJsonWithStatus<T>(
  input: string,
  init?: RequestInit
): Promise<ApiResultWithStatus<T>> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, SERVICE_ERROR_MESSAGE),
        status: res.status,
      };
    }
    return {
      data: (await res.json()) as T,
      error: null,
      status: res.status,
    };
  } catch {
    return { data: null, error: SERVICE_DOWN_MESSAGE };
  }
}

export type CandidateDTO = {
  id: number;
  canonical: string;
  aliases: string[];
  role: string;
  definition: string | null;
  status: string;
  extractionStatus?: string;
  lifecycleStatus?: string;
  confidence: number;
  source: string;
  owner: string;
  version: number;
  published_at?: string | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  review_comment?: string | null;
  topics: any[];
  evidence?: {
    quote: string;
    chunk_id: string;
  }[];
};


export type CandidateListResponse = {
  items: CandidateDTO[];
  nextCursor: number | null;
  hasMore: boolean;
};

export type CandidateRelationStatus = "PUBLISHED" | "CANDIDATE" | "ARCHIVED" | string;

export type CandidateRelationsResponse = {
  outgoing: {
    predicate: string;
    target: {
      id: number;
      name: string;
      status: CandidateRelationStatus;
    };
    relationStatus: string;
  }[];
  incoming: {
    predicate: string;
    source: {
      id: number;
      name: string;
      status: CandidateRelationStatus;
    };
    relationStatus: string;
  }[];
};

export type CandidateSnapshotDTO = CandidateDTO & {
  snapshotId?: string | null;
  version?: string | null;
};

export type ConceptGraphNode = {
  id: number;
  canonical: string;
  version: number;
  type: string;
};

export type ConceptGraphEdge = {
  id: number;
  source: number;
  target: number;
  predicate: string;
  version: number;
};

export type ConceptGraphResponse = {
  center: {
    id: number;
    canonical: string;
    version: number;
  };
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
  meta: {
    depth: number;
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
  };
};

export type ReviewInfoDTO = {
  hasActiveChange: boolean;
  canSubmitForReview: boolean;
  effectiveStatus: string;
  reason?: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
  changeId?: number | null;
};

export type ChangeDTO = {
  id: number;
  [key: string]: unknown;
};

export type ApprovalDTO = {
  id: number;
  changeId: number;
  candidateId: number;
  candidateName: string;
  status: string;
  reviewer: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};


/* =========================
 * Governance Audit Events
 * ========================= */

export type GovernanceEventDTO = {
  id: number;
  candidateId: number;
  changeId?: number | null;

  type:
    | "EXTRACTED"
    | "REQUEST_SUBMITTED"
    | "APPROVED"
    | "REJECTED"
    | "PUBLISHED"
    | "ARCHIVED";

  operator: string;        // system / username
  timestamp: string;       // ISO

  reason?: string | null;  // only for APPROVED / REJECTED
};

export type ApprovalListResponse = {
  total: number;
  items: ApprovalDTO[];
};

/* =========================
 * Candidates
 * ========================= */

export async function fetchCandidates(params: {
  status: string;
  limit?: number;
  offset?: number;
  reviewer?: string;
  query?: string;
}): Promise<ApiResult<CandidateListResponse>> {
  const {
    status,
    limit = 50,
    offset = 0,
    reviewer,
    query,
  } = params;

  const url = new URL("/v1/candidates", API_BASE);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (reviewer) {
    url.searchParams.set("reviewer", reviewer);
  }
  if (query) {
    url.searchParams.set("query", query);
  }

  return requestJson(url.toString(), { cache: "no-store" });
}


export async function fetchApprovals(params: {
  status: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<ApprovalListResponse>> {
  const { status, limit = 50, offset = 0 } = params;

  const url = new URL("/v1/approvals", API_BASE);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  return requestJson(url.toString(), { cache: "no-store" });
}

export async function fetchCandidateById(
  id: number
): Promise<ApiResult<CandidateDTO>> {
  return requestJson(`${API_BASE}/v1/candidates/${id}`, {
    cache: "no-store",
  });
}

export async function fetchConceptGraph(params: {
  id: number;
  depth?: number;
  maxNodes?: number;
  includeIncoming?: boolean;
  includeOutgoing?: boolean;
}): Promise<ApiResult<ConceptGraphResponse>> {
  const {
    id,
    depth = 1,
    maxNodes = 20,
    includeIncoming = true,
    includeOutgoing = true,
  } = params;
  const url = new URL(`/v1/concepts/${id}/graph`, API_BASE);
  url.searchParams.set("depth", String(depth));
  url.searchParams.set("maxNodes", String(maxNodes));
  url.searchParams.set(
    "includeIncoming",
    String(includeIncoming)
  );
  url.searchParams.set(
    "includeOutgoing",
    String(includeOutgoing)
  );

  return requestJson(url.toString(), { cache: "no-store" });
}

export async function publishCandidate(
  id: number,
  actor?: string
): Promise<ApiResult<unknown>> {
  const url = new URL(
    `/v1/candidates/${id}/publish`,
    API_BASE
  );
  if (actor) {
    url.searchParams.set("actor", actor);
  }

  return requestJson<unknown>(url.toString(), {
    method: "POST",
  });
}

export async function publishCandidates(
  ids: number[],
  actor?: string
): Promise<ApiResult<unknown>> {
  const body: { ids: number[]; actor?: string } = {
    ids,
  };
  if (actor) {
    body.actor = actor;
  }

  return requestJson<unknown>(`${API_BASE}/v1/candidates/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchCandidateRelations(
  id: number
): Promise<ApiResult<CandidateRelationsResponse>> {
  return requestJson(
    `${API_BASE}/v1/candidates/${id}/relations`,
    { cache: "no-store" }
  );
}

export async function fetchCandidateSnapshot(
  candidateId: number,
  snapshotId: string
): Promise<ApiResult<CandidateSnapshotDTO>> {
  return requestJson(
    `${API_BASE}/v1/candidates/${candidateId}/snapshots/${snapshotId}`,
    { cache: "no-store" }
  );
}

export async function fetchCandidateSnapshotRelations(
  candidateId: number,
  snapshotId: string
): Promise<ApiResult<CandidateRelationsResponse>> {
  return requestJson(
    `${API_BASE}/v1/candidates/${candidateId}/snapshots/${snapshotId}/relations`,
    { cache: "no-store" }
  );
}

/* =========================
 * Review Info (关键)
 * ========================= */

export async function fetchReviewInfo(
  candidateId: number
): Promise<ApiResult<ReviewInfoDTO>> {
  return requestJson(
    `${API_BASE}/v1/candidates/${candidateId}/review-info`,
    { cache: "no-store" }
  );
}

/* =========================
 * Change Request
 * ========================= */

export async function createChange(params: {
  candidateId: number;
  payload: {
    canonical: string;
    aliases: string[];
    definition?: string | null;
    role: string;
  };
  submittedBy: string;
}): Promise<ApiResult<ChangeDTO>> {
  return requestJson<ChangeDTO>(`${API_BASE}/v1/changes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function submitChange(
  changeId: number,
  params: { submittedBy?: string }
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(
    `${API_BASE}/v1/changes/${changeId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}

/* =========================
 * Rule Templates
 * ========================= */

export type RuleTemplateTypeCreateRequest = {
  name: string;
  description?: string | null;
  createdBy?: string | null;
};

export type RuleTemplateTypeUpdateRequest = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  disabled?: boolean | null;
};

export type RuleTemplateTypeListItem = {
  id: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  disabled?: boolean | null;
  templateCount?: number | null;
  templatesCount?: number | null;
  usageCount?: number | null;
  [key: string]: any;
};

export type RuleTemplateItem = {
  id: number | string;
  name: string;
  description: string;
  category: string;
  status: string;
  currentVersion: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RuleTemplateVersionSummary = {
  version: number;
  status: string;
  createdAt: string;
  createdBy: string;
};

export type RuleTemplateDetail = RuleTemplateItem & {
  versions: RuleTemplateVersionSummary[];
};

export type RuleTemplateVersionPayload = {
  capability: Record<string, unknown>;
  explain: {
    success: string;
    fail: string;
  };
};

export type RuleTemplateVersionDetail = {
  templateId: number | string;
  version: number;
  status: string;
  capability: Record<string, unknown>;
  explain: {
    success: string;
    fail: string;
  };
};

function unwrapTemplateApiData<T>(payload: unknown): T | null {
  if (payload == null) return null;
  let current: unknown = payload;
  // Support common API envelope nesting: { data: ... } or { data: { data: ... } }.
  for (let i = 0; i < 2; i += 1) {
    if (
      current &&
      typeof current === "object" &&
      "data" in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>).data;
    } else {
      break;
    }
  }
  return (current ?? null) as T | null;
}

function extractTemplateApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if ("success" in (payload as Record<string, unknown>) && (payload as any).success === false) {
    const err = (payload as any).error;
    if (typeof err === "string" && err.trim()) return err;
    return SERVICE_ERROR_MESSAGE;
  }
  return null;
}

function normalizeTemplateDetailPayload(
  raw: unknown
): RuleTemplateDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Record<string, unknown>;
  const root =
    payload.template && typeof payload.template === "object"
      ? (payload.template as Record<string, unknown>)
      : payload;
  const versionsRaw =
    Array.isArray(payload.versions)
      ? payload.versions
      : Array.isArray(root.versions)
      ? root.versions
      : [];

  const versions = versionsRaw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const v = item as Record<string, unknown>;
      return {
        version: Number(v.version ?? 0),
        status: String(v.status ?? ""),
        createdAt: String(v.createdAt ?? ""),
        createdBy: String(v.createdBy ?? ""),
      };
    });

  return {
    id: (root.id ?? "") as number | string,
    name: String(root.name ?? root.title ?? ""),
    description: String(root.description ?? ""),
    category: String(root.category ?? ""),
    status: String(root.status ?? ""),
    currentVersion:
      root.currentVersion == null ? null : Number(root.currentVersion),
    createdAt:
      root.createdAt == null ? undefined : String(root.createdAt),
    updatedAt:
      root.updatedAt == null ? undefined : String(root.updatedAt),
    versions,
  };
}

function normalizeRuleTemplateTypeList(payload: any): RuleTemplateTypeListItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function fetchRuleTemplateTypes(params?: {
  search?: string;
}): Promise<ApiResult<RuleTemplateTypeListItem[]>> {
  const search = new URLSearchParams();
  if (params?.search) {
    search.set("search", params.search);
  }
  const suffix = search.toString();
  const res = await requestJson<unknown>(
    `/api/rule-template-types${suffix ? `?${suffix}` : ""}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  return { data: normalizeRuleTemplateTypeList(res.data), error: null };
}

export async function createRuleTemplateType(
  payload: RuleTemplateTypeCreateRequest
): Promise<ApiResult<{ id: string }>> {
  return requestJson<{ id: string }>(`/api/rule-template-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateRuleTemplateType(
  id: string,
  payload: RuleTemplateTypeUpdateRequest
): Promise<ApiResult<RuleTemplateTypeListItem>> {
  return requestJson<RuleTemplateTypeListItem>(
    `/api/rule-template-types/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteRuleTemplateType(
  id: string
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(
    `/api/rule-template-types/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function fetchTemplatesList(params?: {
  status?: string;
}): Promise<ApiResult<RuleTemplateItem[]>> {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }
  const suffix = search.toString();
  const res = await requestJson<unknown>(
    `/api/templates${suffix ? `?${suffix}` : ""}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError };
  const data = unwrapTemplateApiData<unknown>(res.data);
  const list = Array.isArray(data)
    ? data
    : data &&
      typeof data === "object" &&
      Array.isArray((data as { items?: unknown[] }).items)
    ? (data as { items: unknown[] }).items
    : null;
  if (!list) {
    return { data: null, error: "Invalid template list response." };
  }
  return { data: list as RuleTemplateItem[], error: null };
}

export async function fetchTemplateById(
  id: number | string
): Promise<ApiResultWithStatus<RuleTemplateDetail>> {
  const res = await requestJsonWithStatus<unknown>(
    `/api/templates/${id}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error, status: res.status };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError, status: res.status };
  const data = normalizeTemplateDetailPayload(
    unwrapTemplateApiData<unknown>(res.data)
  );
  if (!data || !data.name) {
    return { data: null, error: "Invalid template detail response.", status: res.status };
  }
  return { data, error: null, status: res.status };
}

// Initial create shape expected by backend (step 1)
export type RuleTemplateCreateInitialRequest = {
  name: string;
  description: string;
  category: string;
};

export type RuleTemplateCreateInitialResponse = {
  id: number;
};

export async function createTemplateInitial(
  payload: RuleTemplateCreateInitialRequest
): Promise<ApiResult<RuleTemplateCreateInitialResponse>> {
  const res = await requestJson<unknown>(`/api/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.data) return { data: null, error: res.error };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError };
  const data = unwrapTemplateApiData<RuleTemplateCreateInitialResponse>(res.data);
  if (!data) {
    return { data: null, error: "Invalid template create response." };
  }
  return { data, error: null };
}

export async function createTemplateVersion(
  id: number | string,
  payload: RuleTemplateVersionPayload
): Promise<ApiResult<RuleTemplateVersionDetail>> {
  const res = await requestJson<unknown>(
    `/api/templates/${id}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.data) return { data: null, error: res.error };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError };
  const data = unwrapTemplateApiData<RuleTemplateVersionDetail>(res.data);
  if (!data) {
    return { data: null, error: "Invalid template version create response." };
  }
  return { data, error: null };
}

export async function fetchTemplateVersionById(
  id: number | string,
  version: string | number
): Promise<ApiResult<RuleTemplateVersionDetail>> {
  const res = await requestJson<unknown>(
    `/api/templates/${id}/versions/${encodeURIComponent(String(version))}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError };
  const data = unwrapTemplateApiData<RuleTemplateVersionDetail>(res.data);
  if (!data) {
    return { data: null, error: "Invalid template version detail response." };
  }
  return { data, error: null };
}

export async function updateTemplateVersion(
  id: number | string,
  version: string | number,
  payload: RuleTemplateVersionPayload
): Promise<ApiResult<RuleTemplateVersionDetail>> {
  const res = await requestJson<unknown>(
    `/api/templates/${id}/versions/${encodeURIComponent(String(version))}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.data) return { data: null, error: res.error };
  const envelopeError = extractTemplateApiError(res.data);
  if (envelopeError) return { data: null, error: envelopeError };
  const data = unwrapTemplateApiData<RuleTemplateVersionDetail>(res.data);
  if (!data) {
    return { data: null, error: "Invalid template version update response." };
  }
  return { data, error: null };
}

export async function deleteTemplateVersion(
  id: number | string,
  version: string | number
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(
    `/api/templates/${id}/versions/${encodeURIComponent(String(version))}`,
    { method: "DELETE" }
  );
}

export async function publishTemplateVersion(
  id: number | string,
  version: string | number
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(
    `/api/templates/${id}/versions/${encodeURIComponent(String(version))}/publish`,
    { method: "POST" }
  );
}

export async function decideChange(params: {
  changeId: number;
  payload: {
    status: "APPROVED" | "REJECTED";
    reviewer?: string;
    comment: string;
  };
}): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(
    `${API_BASE}/v1/changes/${params.changeId}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.payload),
    }
  );
}

/* =========================
 * Audit Events (Timeline)
 * ========================= */

export async function fetchAuditEvents(params?: {
  candidateId?: number;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<GovernanceEventDTO[]>> {
  const { candidateId, limit = 100, offset = 0 } = params ?? {};

  const url = new URL("/v1/audit/events", API_BASE);

  if (candidateId) {
    url.searchParams.set("candidateId", String(candidateId));
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  return requestJson(url.toString(), { cache: "no-store" });
}

export interface AuditLogResponse {
  items: AuditRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchGlossaryAuditLogs(params?: {
  limit?: number;
  before?: string;
  query?: string;
}): Promise<ApiResult<AuditLogResponse>> {
  const search = new URLSearchParams();

  search.set("limit", String(params?.limit ?? 20));

  if (params?.before) {
    search.set("before", params.before);
  }
  if (params?.query) {
    search.set("query", params.query);
  }

  const res = await fetch(
    `${API_BASE}/v1/audit/logs?${search.toString()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return {
      data: null,
      error: await buildErrorMessage(
        res,
        SERVICE_ERROR_MESSAGE
      ),
    };
  }

  return { data: await res.json(), error: null };
}


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

export type RuleTemplateCreateRequest = {
  name: string;
  purpose: string;
  type?: string;
  customType?: string;
  allowedModes?: Record<string, boolean> | null;
  importanceAllowed?: boolean;
  positionRules?: Record<string, boolean> | null;
  explainPositive?: string | null;
  explainNegative?: string | null;
};

export type RuleTemplateCreateResponse = {
  id: number;
};

export type RuleTemplateItem = {
  id: number | string;
  name: string;
  status?: string;
  updatedAt?: string;
  purpose?: string;
  description?: string;
  category?: string;
  [key: string]: any;
};

function normalizeTemplateList(payload: any): RuleTemplateItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeTemplatePayload(payload: any) {
  if (!payload) return null;
  return payload?.data?.data ?? payload?.data ?? payload;
}

function normalizeTemplateDetail(payload: any): RuleTemplateItem | null {
  if (!payload) return null;
  return normalizeTemplatePayload(payload);
}

export async function createTemplate(
  payload: RuleTemplateCreateRequest
): Promise<ApiResult<RuleTemplateCreateResponse>> {
  return requestJson<RuleTemplateCreateResponse>(
    `/api/templates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
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
  return { data: normalizeTemplateList(res.data), error: null };
}

export async function fetchTemplateById(
  id: number | string
): Promise<ApiResultWithStatus<RuleTemplateItem | null>> {
  const res = await requestJsonWithStatus<unknown>(
    `/api/templates/${id}`,
    { cache: "no-store" }
  );
  if (!res.data) return { data: null, error: res.error, status: res.status };
  return {
    data: normalizeTemplateDetail(res.data),
    error: null,
    status: res.status,
  };
}

export async function publishTemplate(
  id: number
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(`/api/templates/${id}/publish`, {
    method: "POST",
  });
}

// Initial create shape expected by backend (step 1)
export type RuleTemplateCreateInitialRequest = {
  name: string;
  description: string;
  category: string;
  createdBy: string;
};

export type RuleTemplateCreateInitialResponse = {
  id: number;
  status: string;
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
  return {
    data: normalizeTemplatePayload(res.data) as RuleTemplateCreateInitialResponse,
    error: null,
  };
}

// Configure template (called after initial create)
export async function configureTemplate(
  id: number,
  payload: Record<string, any>
): Promise<ApiResult<unknown>> {
  return requestJson<unknown>(`/api/templates/${id}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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

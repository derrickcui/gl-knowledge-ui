
import { AuditRecord } from "@/types/audit";

const API_BASE =
  process.env.NEXT_PUBLIC_GLOSSARY_API ??
  "http://localhost:8000";

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
}): Promise<CandidateDTO[]> {
  const {
    status,
    limit = 50,
    offset = 0,
    reviewer,
  } = params;

  const url = new URL("/v1/candidates", API_BASE);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (reviewer) {
    url.searchParams.set("reviewer", reviewer);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch candidates`);
  }

  return res.json();
}

export async function fetchApprovals(params: {
  status: string;
  limit?: number;
  offset?: number;
}): Promise<ApprovalListResponse> {
  const { status, limit = 50, offset = 0 } = params;

  const url = new URL("/v1/approvals", API_BASE);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch approvals");
  }

  return res.json();
}

export async function fetchCandidateById(
  id: number
): Promise<CandidateDTO> {
  const res = await fetch(
    `${API_BASE}/v1/candidates/${id}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch candidate ${id}`);
  }

  return res.json();
}

/* =========================
 * Review Info (关键)
 * ========================= */

export async function fetchReviewInfo(
  candidateId: number
): Promise<ReviewInfoDTO> {
  const res = await fetch(
    `${API_BASE}/v1/candidates/${candidateId}/review-info`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch review info");
  }

  return res.json();
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
}) {
  const res = await fetch(`${API_BASE}/v1/changes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error("Failed to create change");
  }

  return res.json();
}

export async function submitChange(
  changeId: number,
  params: { submittedBy?: string }
) {
  const res = await fetch(
    `${API_BASE}/v1/changes/${changeId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function decideChange(params: {
  changeId: number;
  payload: {
    status: "APPROVED" | "REJECTED";
    reviewer?: string;
    comment: string;
  };
}) {
  const res = await fetch(
    `${API_BASE}/v1/changes/${params.changeId}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.payload),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

/* =========================
 * Audit Events (Timeline)
 * ========================= */

export async function fetchAuditEvents(params?: {
  candidateId?: number;
  limit?: number;
  offset?: number;
}): Promise<GovernanceEventDTO[]> {
  const { candidateId, limit = 100, offset = 0 } = params ?? {};

  const url = new URL("/v1/audit/events", API_BASE);

  if (candidateId) {
    url.searchParams.set("candidateId", String(candidateId));
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch audit events");
  }

  return res.json();
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
}): Promise<AuditLogResponse> {
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
    throw new Error(
      `Failed to fetch audit logs (${res.status} ${res.statusText})`
    );
  }

  return res.json();
}

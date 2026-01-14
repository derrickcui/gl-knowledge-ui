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
};

/* =========================
 * Candidates
 * ========================= */

export async function fetchCandidates(params: {
  status: string;
  limit?: number;
  offset?: number;
}): Promise<CandidateDTO[]> {
  const { status, limit = 50, offset = 0 } = params;

  const url = new URL("/v1/candidates", API_BASE);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch candidates`);
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

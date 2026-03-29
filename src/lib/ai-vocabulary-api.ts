export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type PromptVersionResponse = {
  id: string;
  prompt_version: string;
  name: string;
  description: string;
  system_prompt: string;
  user_prompt_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SampleVersionResponse = {
  id: string;
  dataset: string;
  version_name: string;
  sample_type: string;
  generation_strategy: string;
  status: string;
  candidate_pool_size: number;
  final_sample_size: number;
  similarity_threshold: number;
  avg_similarity?: number | null;
  min_similarity?: number | null;
  cluster_count_estimate?: number | null;
  created_at: string;
};

export type SampleItemResponse = {
  id: string;
  sample_version_id: string;
  dataset: string;
  doc_id: string;
  chunk_id: string;
  title: string;
  anchor_content: string;
  sample_content: string;
  chunk_index?: number | null;
  source_name: string;
  quality_score: number;
  diversity_score: number;
  selection_reason: string;
  created_at: string;
};

export type RunResponse = {
  id: string;
  dataset: string;
  sample_version_id: string;
  run_key: string;
  prompt_version: string;
  provider: string;
  model_name: string;
  status: string;
  temperature?: number;
  batch_size?: number;
  total_samples: number;
  processed_samples: number;
  total_terms: number;
  started_at?: string | null;
  last_heartbeat_at?: string | null;
  last_progress_message?: string | null;
  max_chunks_per_doc?: number | null;
  created_at: string;
  finished_at?: string | null;
};

export type RawTermResponse = {
  id: string;
  ai_run_id: string;
  sample_item_id: string;
  dataset: string;
  doc_id: string;
  chunk_id: string;
  term: string;
  normalized_term: string;
  evidence: string;
  evidence_start?: number | null;
  evidence_end?: number | null;
  confidence: number;
  validation_status: string;
  raw_model_output: string;
  created_at: string;
};

export type TermCandidateResponse = {
  id: number;
  dataset?: string | null;
  term: string;
  normalized_term: string;
  source: string;
  ai_run_id?: string | null;
  sample_version_id?: string | null;
  doc_id?: string | null;
  evidence: string;
  confidence: number;
  evidence_count: number;
  document_count: number;
  status: string;
  reviewed: boolean;
  created_at: string;
  updated_at: string;
};

export type TermCandidateEvidenceResponse = {
  raw_term_id?: string | null;
  doc_id?: string | null;
  chunk_id?: string | null;
  term: string;
  evidence: string;
  confidence: number;
  validation_status: string;
  created_at: string;
};

export type RunSummaryResponse = {
  run_id: string;
  run_key: string;
  dataset: string;
  sample_version_id: string;
  status: string;
  total_samples: number;
  processed_samples: number;
  total_terms: number;
  raw_term_count: number;
  valid_term_count: number;
  invalid_term_count: number;
  candidate_count: number;
};

export type RunLogResponse = {
  id?: string | number;
  run_id?: string;
  level?: string | null;
  message: string;
  created_at?: string | null;
};

export type GenerateSampleRequest = {
  dataset: string;
  version_name: string;
  sample_type?: string;
  candidate_pool_size?: number;
  sample_size?: number;
  similarity_threshold?: number;
};

export type CreateRunRequest = {
  dataset: string;
  sample_version_id: string;
  prompt_version?: string;
  provider?: string;
  model_name?: string;
  temperature?: number;
  batch_size?: number;
};

type CandidateFilter = {
  dataset?: string;
  ai_run_id?: string;
  status?: string;
};

type RunListFilter = {
  dataset?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text.trim()) {
    return `Request failed (${res.status} ${res.statusText})`;
  }
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.error === "string") return payload.error;
  } catch {
    return text;
  }
  return text;
}

async function requestAiJson<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/ai-vocabulary/${path}`, {
      ...init,
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        data: null,
        error: await readError(res),
      };
    }
    return {
      data: (await res.json()) as T,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "AI vocabulary service is unavailable.",
    };
  }
}

export function listPromptVersions() {
  return requestAiJson<PromptVersionResponse[]>("ai-vocabulary/prompts");
}

export function getPromptVersion(promptVersion: string) {
  return requestAiJson<PromptVersionResponse>(
    `ai-vocabulary/prompts/${encodeURIComponent(promptVersion)}`
  );
}

export function generateSample(payload: GenerateSampleRequest) {
  return requestAiJson<SampleVersionResponse>(
    "ai-vocabulary/samples/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function listSampleVersions(dataset?: string) {
  const search = new URLSearchParams();
  if (dataset) search.set("dataset", dataset);
  return requestAiJson<SampleVersionResponse[]>(
    `ai-vocabulary/samples/versions${search.toString() ? `?${search.toString()}` : ""}`
  );
}

export function getSampleVersion(sampleVersionId: string) {
  return requestAiJson<SampleVersionResponse>(
    `ai-vocabulary/samples/versions/${encodeURIComponent(sampleVersionId)}`
  );
}

export function listSampleItems(sampleVersionId: string) {
  return requestAiJson<SampleItemResponse[]>(
    `ai-vocabulary/samples/versions/${encodeURIComponent(sampleVersionId)}/items`
  );
}

export function createRun(payload: CreateRunRequest) {
  return requestAiJson<RunResponse>("ai-vocabulary/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listRuns(filters: RunListFilter = {}) {
  const search = new URLSearchParams();
  if (filters.dataset) search.set("dataset", filters.dataset);
  if (filters.status) search.set("status", filters.status);
  search.set("limit", String(filters.limit ?? 20));
  search.set("offset", String(filters.offset ?? 0));
  return requestAiJson<RunResponse[]>(
    `ai-vocabulary/runs?${search.toString()}`
  );
}

export function getRun(runId: string) {
  return requestAiJson<RunResponse>(
    `ai-vocabulary/runs/${encodeURIComponent(runId)}`
  );
}

export function executeRun(runId: string, mode: "sync" | "async" = "async") {
  const suffix = mode === "async" ? "execute-async" : "execute";
  return requestAiJson<RunResponse | Record<string, unknown>>(
    `ai-vocabulary/runs/${encodeURIComponent(runId)}/${suffix}`,
    { method: "POST" }
  );
}

export function getRunSummary(runId: string) {
  return requestAiJson<RunSummaryResponse>(
    `ai-vocabulary/runs/${encodeURIComponent(runId)}/summary`
  );
}

export function listRunTerms(runId: string) {
  return requestAiJson<RawTermResponse[]>(
    `ai-vocabulary/runs/${encodeURIComponent(runId)}/terms`
  );
}

export function listRunLogs(runId: string, limit = 200) {
  const search = new URLSearchParams();
  search.set("limit", String(limit));
  return requestAiJson<RunLogResponse[]>(
    `ai-vocabulary/runs/${encodeURIComponent(runId)}/logs?${search.toString()}`
  );
}

export function listCandidates(filters: CandidateFilter = {}) {
  const search = new URLSearchParams();
  if (filters.dataset) search.set("dataset", filters.dataset);
  if (filters.ai_run_id) search.set("ai_run_id", filters.ai_run_id);
  if (filters.status) search.set("status", filters.status);
  return requestAiJson<TermCandidateResponse[]>(
    `ai-vocabulary/candidates${search.toString() ? `?${search.toString()}` : ""}`
  );
}

export function getCandidate(candidateId: number) {
  return requestAiJson<TermCandidateResponse>(
    `ai-vocabulary/candidates/${candidateId}`
  );
}

export function listCandidateEvidence(candidateId: number) {
  return requestAiJson<TermCandidateEvidenceResponse[]>(
    `ai-vocabulary/candidates/${candidateId}/evidence`
  );
}

export function reviewCandidate(
  candidateId: number,
  status: "APPROVED" | "REJECTED" | "CANDIDATE"
) {
  return requestAiJson<TermCandidateResponse>(
    `ai-vocabulary/candidates/${candidateId}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
}
